import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Package, Calendar, User, Car, Printer, Loader2 } from 'lucide-react';
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore';
import { useJobOrderStore } from '../stores/jobOrderStore';
import { toast } from 'sonner';
import { t } from '../i18n';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useWorkshopSettings, useSettingsStore } from '../stores/settingsStore';
import { renderDocument, convertWorkshopSettings } from '../utils/renderDocument';
import { printHtml } from '../utils/printHelpers';
import DocumentViewer from './DocumentViewer';

export const DeliveryNotesList: React.FC = () => {
  const navigate = useNavigate();
  const { deliveryNotes, deleteDeliveryNote, updateDeliveryNoteValidated } = useDeliveryNoteStore();
  const { jobOrders, initializeStore, markJobOrderAsTransferred, deletionMeta } = useJobOrderStore();
  const workshop = useWorkshopSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'waiting-parts' | 'completed'>('all');
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [showValidation, setShowValidation] = useState(false);
  const [validationResults, setValidationResults] = useState<Array<{ jobId: string; jobNumber: string; ok: boolean; errors: string[] }>>([]);
  
  const [showDelete, setShowDelete] = useState<{ open: boolean; id?: string }>({ open: false });
  const [showEdit, setShowEdit] = useState<{ open: boolean; id?: string }>({ open: false });
  const [editForm, setEditForm] = useState<{ status: string; expectedDeliveryDate: string; deliveryNotes: string }>({ status: 'draft', expectedDeliveryDate: '', deliveryNotes: '' });
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerHtml] = useState<string>('');
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => { initializeStore(); }, [initializeStore]);

  

  const activeNotes = useMemo(() => {
    return (deliveryNotes || []).filter(n => n.status !== 'cancelled');
  }, [deliveryNotes]);

  const filteredDeliveryNotes = useMemo(() => {
    if (!activeNotes || !Array.isArray(activeNotes)) {
      return [];
    }
    
    const filtered = activeNotes.filter(note => {
      if (!note) {
        return false;
      }
      
      const matchesSearch = 
        note.blNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.vehicleInfo?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.vehicleInfo?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.vehicleInfo?.registration?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
      
      console.log(`Note ${note.blNumber}: matchesSearch=${matchesSearch}, matchesStatus=${matchesStatus}`);
      
      return matchesSearch && matchesStatus;
    });
    
    console.log('Filtered results:', filtered.length, 'notes');
    return filtered;
  }, [activeNotes, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'issued': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('deliveryNotesList.statusText.draft');
      case 'issued': return t('deliveryNotesList.statusText.issued');
      case 'delivered': return t('deliveryNotesList.statusText.delivered');
      case 'cancelled': return t('deliveryNotesList.statusText.cancelled');
      default: return status;
    }
  };

  const partsLabel = (count: number) => (count === 1 ? t('deliveryNotesList.cards.partsSingular') : t('deliveryNotesList.cards.partsPlural'));

  const availableJobOrders = useMemo(() => {
    const base = jobOrders.filter(jo => 
      !deletionMeta[jo.id]?.deletedAt &&
      jo.status !== 'cancelled' &&
      jo.status !== 'transferred'
    );
    const byStatus = jobStatusFilter === 'all' ? base : base.filter(jo => jo.status === jobStatusFilter);
    if (!jobSearch) return byStatus;
    const term = jobSearch.toLowerCase();
    return byStatus.filter(jo =>
      jo.jobNumber.toLowerCase().includes(term) ||
      jo.customerName.toLowerCase().includes(term) ||
      jo.vehicleInfo.make.toLowerCase().includes(term) ||
      jo.vehicleInfo.model.toLowerCase().includes(term)
    );
  }, [jobOrders, jobSearch, jobStatusFilter, deletionMeta]);

  const toggleSelectJob = (id: string) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const validateJobOrder = (jo: any) => {
    const errs: string[] = [];
    if (!jo.jobNumber) errs.push(t('deliveryNotesList.jobPicker.errors.missingJobNumber'));
    if (!jo.customerId) errs.push(t('deliveryNotesList.jobPicker.errors.missingCustomerId'));
    if (!jo.customerName) errs.push(t('deliveryNotesList.jobPicker.errors.missingCustomerName'));
    if (!jo.vehicleInfo?.make || !jo.vehicleInfo?.model || !jo.vehicleInfo?.registration) errs.push(t('deliveryNotesList.jobPicker.errors.missingVehicleInfo'));
    const statusOk = jo.status === 'approved' || jo.status === 'completed';
    if (!statusOk) errs.push(t('deliveryNotesList.jobPicker.errors.invalidStatus'));
    if (!jo.isApproved && jo.status !== 'completed') errs.push(t('deliveryNotesList.jobPicker.errors.notApproved'));
    // BL is pre-invoice: do not enforce inventory availability at this stage
    return { ok: errs.length === 0, errors: errs };
  };

  const runValidationAndShow = () => {
    if (selectedJobIds.size === 0) {
      toast.error('Please select at least one job order');
      return;
    }
    const results: Array<{ jobId: string; jobNumber: string; ok: boolean; errors: string[] }> = [];
    selectedJobIds.forEach((id) => {
      const jo = jobOrders.find(j => j.id === id);
      if (!jo) return;
      const res = validateJobOrder(jo);
      results.push({ jobId: jo.id, jobNumber: jo.jobNumber, ok: res.ok, errors: res.errors });
    });
    setValidationResults(results);
    setShowValidation(true);
  };

  const confirmCreateAfterValidation = async () => {
    const allOk = validationResults.length > 0 && validationResults.every(r => r.ok);
    if (!allOk) {
      toast.error(t('deliveryNotesList.validation.toastFailed'));
      return;
    }
    const { createDeliveryNote } = useDeliveryNoteStore.getState();
    let createdCount = 0;
    for (const r of validationResults) {
      const jo = jobOrders.find(j => j.id === r.jobId);
      if (!jo) continue;
      const data = {
        jobOrderId: jo.id,
        customerId: jo.customerId || 'default-customer',
        expectedDeliveryDate: new Date().toISOString(),
        jobsPerformed: jo.jobDescriptions?.map((d: any) => d.title) || [],
        deliveryNotes: '',
        technicians: jo.assignedMechanic ? [jo.assignedMechanic] : [],
        notes: jo.notes || '',
        documentNumber: ''
      } as any;
      const jobOrderData = {
        customerName: jo.customerName,
        vehicleInfo: jo.vehicleInfo,
        customerContact: { email: '', phone: '', address: '' },
        partsUsed: jo.partsUsed,
        laborItems: jo.laborItems
      };
      const bl = await createDeliveryNote(data, jobOrderData);
      if (bl?.id) {
        markJobOrderAsTransferred(jo.id, bl.id);
        createdCount += 1;
      }
    }
    setShowValidation(false);
    setShowJobPicker(false);
    setSelectedJobIds(new Set());
    toast.success(t('deliveryNotesList.validation.toastCreated').replace('{{count}}', String(createdCount)));
  };

  const formatJobStatus = (status: string) => {
    const key = status.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return t(`status.${key}`);
  };

  const formatJobPriority = (priority: string) => {
    return t(`jobOrders.filters.${priority}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('deliveryNotesList.header')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('deliveryNotesList.subtitle')}</p>
          </div>
          <div className="flex space-x-3">
            {/* Method 1: Generate from Job Orders */}
            <button
              onClick={() => setShowJobPicker(true)}
              className="inline-flex items-center px-4 py-2 border border-green-600 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 transition-colors"
            >
              <Package className="h-4 w-4 mr-2" />
              {t('deliveryNotesList.actions.generateFromJobs')}
            </button>
            
            {/* Method 2: Create New Manually */}
            <button
              onClick={() => navigate('/delivery-notes/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('deliveryNotesList.actions.createNew')}
            </button>
            

          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('deliveryNotesList.filters.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">{t('deliveryNotesList.filters.all')}</option>
                <option value="draft">{t('deliveryNotesList.filters.draft')}</option>
                <option value="issued">{t('deliveryNotesList.filters.issued')}</option>
                <option value="delivered">{t('deliveryNotesList.filters.delivered')}</option>
                <option value="cancelled">{t('deliveryNotesList.filters.cancelled')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Notes List */}
      <div className="bg-white shadow rounded-lg">
        {filteredDeliveryNotes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('deliveryNotesList.empty.title')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? t('deliveryNotesList.empty.searchNoResults')
                : t('deliveryNotesList.empty.chooseMethod')
              }
            </p>
            {!(searchTerm || statusFilter !== 'all') && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                {/* Method 1: Generate from Job Orders */}
                <button
                  onClick={() => setShowJobPicker(true)}
                  className="inline-flex items-center px-4 py-2 border border-green-600 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 transition-colors"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {t('deliveryNotesList.actions.generateFromJobs')}
                </button>
                
                {/* Method 2: Create New Manually */}
                <button
                  onClick={() => navigate('/delivery-notes/new')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('deliveryNotesList.actions.createNew')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDeliveryNotes.map((note) => (
              <div key={note.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {t('deliveryNotesList.cards.blPrefix')}{note.blNumber}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                          {getStatusLabel(note.status)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {note.customerName}
                        </div>
                        <div className="flex items-center">
                          <Car className="h-4 w-4 mr-1" />
                          {note.vehicleInfo.make} {note.vehicleInfo.model}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(note.issueDate)}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{note.parts.length} {partsLabel(note.parts.length)}</span>
                        <span>{t('deliveryNotesList.cards.total')}: {formatCurrency(note.totalValue)}</span>
                        {note.relatedInvoiceId && (
                          <span className="text-indigo-600">
                            {t('deliveryNotesList.cards.invoicePrefix')} #{note.relatedInvoiceId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={async () => {
                        try {
                          setPrintingId(note.id);
                          const document = {
                            number: note.blNumber,
                            date: note.issueDate,
                            lines: note.parts.map((part: any, index: number) => ({
                              ref: part.partNumber || `P${String(index + 1).padStart(3, '0')}`,
                              description: part.description || part.name,
                              shortDescription: part.notes,
                              quantity: part.quantity,
                              unitPrice: part.unitPrice || 0,
                              discount: 0,
                              lineTotal: part.totalPrice || 0,
                              tvaRate: 0
                            })),
                            subtotal: note.subtotal || 0,
                            vatTotal: note.taxAmount || 0,
                            grandTotal: note.totalValue || 0,
                            paid: 0,
                            balance: note.totalValue || 0,
                            labor: (note.laborItems || []).map((l: any) => ({
                              description: l.description,
                              shortDescription: l.notes,
                              hours: l.hours,
                              hourlyRate: l.hourlyRate || 0,
                              totalAmount: l.totalAmount || 0
                            })),
                            partsSubtotal: note.totalPartsValue || 0,
                            laborSubtotal: note.totalLaborValue || 0
                          }
                          const customer = {
                            name: note.customerName,
                            address: note.customerContact?.address || '',
                            postalCode: '', city: '',
                            phone: note.customerContact?.phone || '',
                            email: note.customerContact?.email || ''
                          }
                          const vehicle = {
                            make: note.vehicleInfo?.make || '',
                            model: note.vehicleInfo?.model || '',
                            registration: note.vehicleInfo?.registration || '',
                            vin: note.vehicleInfo?.vin || '',
                            year: note.vehicleInfo?.year || 0
                          }
                          const html = renderDocument('bon-livraison', convertWorkshopSettings(useSettingsStore.getState().workshop || workshop!), document, customer, vehicle)
                          
                          // Use the improved iframe printing
                          await printHtml(html)
                        } catch (err) {
                          console.error('Print error:', err);
                          toast.error('Erreur lors de l\'impression');
                        } finally {
                          setPrintingId(null);
                        }
                      }}
                      disabled={printingId === note.id}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait"
                      aria-label="Imprimer le bon de livraison"
                    >
                      {printingId === note.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4 mr-1" />
                      )}
                      {printingId === note.id ? 'Impression...' : 'Imprimer'}
                    </button>

                    <button
                      onClick={() => {
                        setShowEdit({ open: true, id: note.id });
                        setEditForm({ status: note.status, expectedDeliveryDate: note.expectedDeliveryDate || '', deliveryNotes: note.deliveryNotes || '' });
                      }}
                      className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
                    >
                      {t('deliveryNotesList.actions.edit')}
                    </button>
                    <button
                      onClick={() => setShowDelete({ open: true, id: note.id })}
                      className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                      {t('deliveryNotesList.actions.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {activeNotes.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{activeNotes.length}</div>
            <div className="text-sm text-gray-500">{t('deliveryNotesList.summary.totalNotes')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">
              {activeNotes.filter(n => n.status === 'issued').length}
            </div>
            <div className="text-sm text-gray-500">{t('deliveryNotesList.summary.issued')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {activeNotes.filter(n => n.status === 'delivered').length}
            </div>
            <div className="text-sm text-gray-500">{t('deliveryNotesList.summary.delivered')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(activeNotes.reduce((sum, n) => sum + n.totalValue, 0))}
            </div>
            <div className="text-sm text-gray-500">{t('deliveryNotesList.summary.totalValue')}</div>
          </div>
        </div>
      )}
      {/* Job Orders Picker Modal */}
      {showJobPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="job-picker-title">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 id="job-picker-title" className="text-xl font-semibold text-gray-900">{t('deliveryNotesList.jobPicker.title')}</h2>
              <button onClick={() => setShowJobPicker(false)} className="text-gray-400 hover:text-gray-600" aria-label={t('deliveryNotesList.jobPicker.close')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('deliveryNotesList.jobPicker.searchPlaceholder')}
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={jobStatusFilter}
                    onChange={(e) => setJobStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  >
                    <option value="all">{t('deliveryNotesList.jobPicker.statusFilter.all')}</option>
                    <option value="pending">{t('status.pending')}</option>
                    <option value="in-progress">{t('status.inProgress')}</option>
                    <option value="waiting-parts">{t('status.waitingParts')}</option>
                    <option value="completed">{t('status.completed')}</option>
                  </select>
                </div>
              </div>

              {/* List */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNotesList.jobPicker.table.select')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNotesList.jobPicker.table.jobNumber')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNotesList.jobPicker.table.customer')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNotesList.jobPicker.table.vehicle')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNotesList.jobPicker.table.priority')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNotesList.jobPicker.table.status')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNotesList.jobPicker.table.created')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableJobOrders.map((jo) => (
                        <tr key={jo.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label={t('deliveryNotesList.jobPicker.aria.selectJob').replace('{{jobNumber}}', jo.jobNumber)}
                              checked={selectedJobIds.has(jo.id)}
                              onChange={() => toggleSelectJob(jo.id)}
                              className="h-4 w-4 text-green-600 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{jo.jobNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{jo.customerName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{jo.vehicleInfo.make} {jo.vehicleInfo.model}</td>
                          <td className="px-4 py-3 text-xs"><span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800">{formatJobPriority(jo.priority)}</span></td>
                          <td className="px-4 py-3 text-xs"><span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800">{formatJobStatus(jo.status)}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(jo.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {availableJobOrders.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-gray-500">{t('deliveryNotesList.jobPicker.empty')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selection Summary */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">{t('deliveryNotesList.jobPicker.selected').replace('{{count}}', String(selectedJobIds.size))}</div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowJobPicker(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    {t('deliveryNotesList.jobPicker.actions.cancel')}
                  </button>
                  <button
                  onClick={runValidationAndShow}
                  disabled={selectedJobIds.size === 0}
                  className={`px-4 py-2 rounded-md text-white ${selectedJobIds.size === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {t('deliveryNotesList.jobPicker.actions.confirm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showValidation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="validation-title">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 id="validation-title" className="text-xl font-semibold text-gray-900">{t('deliveryNotesList.validation.title')}</h2>
              <button onClick={() => setShowValidation(false)} className="text-gray-400 hover:text-gray-600" aria-label={t('deliveryNotesList.validation.close')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {validationResults.map(r => (
                <div key={r.jobId} className={`border rounded-md p-3 ${r.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.jobNumber}</div>
                    <span className={`px-2 py-1 rounded-full text-xs ${r.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.ok ? t('deliveryNotesList.validation.ok') : t('deliveryNotesList.validation.failed')}</span>
                  </div>
                  {!r.ok && (
                    <ul className="mt-2 list-disc list-inside text-sm text-red-800">
                      {r.errors.map((e, idx) => (<li key={idx}>{e}</li>))}
                    </ul>
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowValidation(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">{t('deliveryNotesList.validation.actions.cancel')}</button>
                <button onClick={confirmCreateAfterValidation} className={`px-4 py-2 rounded-md text-white ${validationResults.every(r => r.ok) ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`} disabled={!validationResults.every(r => r.ok)}>{t('deliveryNotesList.validation.actions.proceed')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showDelete.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 id="delete-title" className="text-lg font-semibold text-gray-900">{t('deliveryNotesList.confirm.deleteTitle')}</h2>
              <button onClick={() => setShowDelete({ open: false })} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">{t('deliveryNotesList.confirm.deleteText')}</p>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setShowDelete({ open: false })} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">{t('deliveryNotesList.confirm.cancel')}</button>
                <button
                  onClick={() => {
                    if (showDelete.id) deleteDeliveryNote(showDelete.id);
                    setShowDelete({ open: false });
                    toast.success('BL soft-deleted');
                  }}
                  className="px-4 py-2 border border-red-600 text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  {t('deliveryNotesList.confirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEdit.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="edit-title">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 id="edit-title" className="text-lg font-semibold text-gray-900">{t('deliveryNotesList.actions.edit')}</h2>
              <button onClick={() => setShowEdit({ open: false })} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                <input type="date" value={editForm.expectedDeliveryDate} onChange={(e) => setEditForm({ ...editForm, expectedDeliveryDate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={editForm.deliveryNotes} onChange={(e) => setEditForm({ ...editForm, deliveryNotes: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowEdit({ open: false })} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">{t('deliveryNotesList.actions.cancel')}</button>
                <button
                  onClick={() => {
                    if (!showEdit.id) return;
                    const res = updateDeliveryNoteValidated(showEdit.id, { status: editForm.status as any, expectedDeliveryDate: editForm.expectedDeliveryDate, deliveryNotes: editForm.deliveryNotes });
                    if (res.success) {
                      toast.success('BL updated');
                      setShowEdit({ open: false });
                    } else {
                      toast.error(res.errors?.join(', ') || 'Update failed');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t('deliveryNotesList.actions.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <DocumentViewer
        title={t('deliveryNotesList.header')}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        source={{ type: 'html', html: viewerHtml }}
      />
    </div>
  );
};

export default DeliveryNotesList;
