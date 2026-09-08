import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Printer, Send, RotateCcw, ArrowLeft, Edit3, Check, X, FileSignature, FileText, Download, Loader2 } from 'lucide-react';
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore';
import { useJobOrderStore } from '../stores/jobOrderStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore';
import { Customer } from '../types/customer';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useWorkshopSettings, useSettingsStore } from '../stores/settingsStore';
import { renderDocument, convertWorkshopSettings } from '../utils/renderDocument';
import { printHtml } from '../utils/printHelpers';
import { useHasRole } from '../stores/authStore';
import { t } from '../i18n';

interface PartFormData {
  partId: string;
  quantity: number;
  notes?: string;
}

export const DeliveryNote: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    deliveryNotes, 
    updateDeliveryNote, 
    addPartToDeliveryNote, 
    removePartFromDeliveryNote, 
    updatePartQuantity,
    updateLaborItem,
    addSignature,
    markAsPrinted
  } = useDeliveryNoteStore();
  const { jobOrders } = useJobOrderStore();
  const workshop = useWorkshopSettings();
  const { inventoryItems } = useInventoryStore();
  const { createInvoice } = useEstimateInvoiceStore();
  
  const [deliveryNote, setDeliveryNote] = useState(deliveryNotes.find(dn => dn.id === id));
  const [isEditing, setIsEditing] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [partForm, setPartForm] = useState<PartFormData>({ partId: '', quantity: 1 });
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState(1);
  const [editingLaborId, setEditingLaborId] = useState<string | null>(null);
  const [editingLaborHours, setEditingLaborHours] = useState(0);
  // const [editingLaborRate, setEditingLaborRate] = useState(0);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureType, setSignatureType] = useState<'customer' | 'technician' | 'authorizedBy'>('customer');
  const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (id) {
      const found = deliveryNotes.find(dn => dn.id === id);
      setDeliveryNote(found);
    }
  }, [id, deliveryNotes]);

  useEffect(() => {
    if (showSignatureModal) {
      const canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          
          let isDrawing = false;
          let lastX = 0;
          let lastY = 0;
          
          const draw = (e: MouseEvent | TouchEvent) => {
            if (!isDrawing) return;
            
            const rect = canvas.getBoundingClientRect();
            let x, y;
            
            if (e instanceof MouseEvent) {
              x = e.clientX - rect.left;
              y = e.clientY - rect.top;
            } else {
              x = e.touches[0].clientX - rect.left;
              y = e.touches[0].clientY - rect.top;
            }
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            lastX = x;
            lastY = y;
          };
          
          const startDrawing = (e: MouseEvent | TouchEvent) => {
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            
            if (e instanceof MouseEvent) {
              lastX = e.clientX - rect.left;
              lastY = e.clientY - rect.top;
            } else {
              lastX = e.touches[0].clientX - rect.left;
              lastY = e.touches[0].clientY - rect.top;
            }
          };
          
          const stopDrawing = () => {
            isDrawing = false;
          };
          
          canvas.addEventListener('mousedown', startDrawing);
          canvas.addEventListener('mousemove', draw);
          canvas.addEventListener('mouseup', stopDrawing);
          canvas.addEventListener('mouseout', stopDrawing);
          canvas.addEventListener('touchstart', startDrawing);
          canvas.addEventListener('touchmove', draw);
          canvas.addEventListener('touchend', stopDrawing);
          
          return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseout', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
          };
        }
      }
    }
  }, [showSignatureModal]);

  if (!deliveryNote) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('deliveryNoteDetail.header.titlePrefix')} introuvable</h2>
          <button
            onClick={() => navigate('/delivery-notes')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('deliveryNoteDetail.header.back')}
          </button>
        </div>
      </div>
    );
  }

  const relatedJobOrder = jobOrders.find(jo => jo.id === deliveryNote.jobOrderId);
  const showPricing = useHasRole(['admin','supervisor','cashier']);

  // Audit Log for Price Access
  useEffect(() => {
    if (deliveryNote) {
      console.info(`[AUDIT] User accessed Delivery Note #${deliveryNote.blNumber} - Prices displayed: ${showPricing}`);
    }
  }, [deliveryNote, showPricing]);

  const getRelatedPartLabel = (labor: any, parts: any[] = []) => {
    const text = (labor?.description || '').toLowerCase()
    const match = (parts || []).find(p => text.includes((p.name || '').toLowerCase()) || text.includes((p.partNumber || '').toLowerCase()))
    if (match) return `${match.partNumber} — ${match.name}`
    return '—'
  }

  const handleStatusChange = async (newStatus: typeof deliveryNote.status) => {
    try {
      await updateDeliveryNote(deliveryNote.id, { status: newStatus });
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleAddPart = async () => {
    if (!partForm.partId || partForm.quantity <= 0) return;

    const selectedPart = inventoryItems.find((item: any) => item.id === partForm.partId);
    if (!selectedPart) return;

    if (selectedPart.quantity < partForm.quantity) {
      alert(`Insufficient quantity. Available stock: ${selectedPart.quantity}`);
      return;
    }

    try {
      await addPartToDeliveryNote(deliveryNote.id, {
        id: `bl-part-${Date.now()}-${selectedPart.id}`,
        partId: partForm.partId,
        partNumber: selectedPart.sku,
        name: selectedPart.name,
        description: selectedPart.description,
        quantity: partForm.quantity,
        unitCost: selectedPart.unitCost,
        unitPrice: selectedPart.sellingPrice,
        totalCost: selectedPart.unitCost * partForm.quantity,
        totalPrice: selectedPart.sellingPrice * partForm.quantity,
        notes: partForm.notes
      });

      setPartForm({ partId: '', quantity: 1, notes: '' });
      setShowAddPart(false);
    } catch (error) {
      console.error('Error adding part:', error);
    }
  };

  const handleRemovePart = async (partId: string) => {
    if (!confirm('Are you sure you want to remove this part from the delivery note?')) return;

    try {
      await removePartFromDeliveryNote(deliveryNote.id, partId);
    } catch (error) {
      console.error('Error removing part:', error);
    }
  };

  const handlePartUpdate = async (partId: string) => {
    if (editingQuantity <= 0) return;

    try {
      // Only quantity update allowed - Price is read-only
      await updatePartQuantity(deliveryNote.id, partId, editingQuantity);
      console.info(`[AUDIT] User updated quantity for part ${partId} in BL ${deliveryNote.blNumber}`);
      setEditingPartId(null);
    } catch (error) {
      console.error('Error updating part:', error);
    }
  };

  const handleLaborUpdate = async (laborId: string) => {
    if (editingLaborHours < 0) return;

    try {
      const existingLabor = deliveryNote.laborItems.find((l: any) => l.id === laborId);
      if (!existingLabor) return;

      const updatedLabor = {
        ...existingLabor,
        hours: editingLaborHours,
        totalAmount: (existingLabor.hourlyRate || 0) * editingLaborHours
      };

      await updateLaborItem(deliveryNote.id, updatedLabor);
      setEditingLaborId(null);
    } catch (error) {
      console.error('Error updating labor:', error);
    }
  };

  const handleSignature = async (signatureData: string) => {
    try {
      await addSignature(deliveryNote.id, signatureType, {
        name: signatureType === 'customer' ? deliveryNote.customerName : 'Technician',
        date: new Date().toISOString(),
        signature: signatureData
      });
      setShowSignatureModal(false);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  };

  const handlePrint = async () => {
    try { 
      setIsPrinting(true);
      await markAsPrinted(deliveryNote.id) 
    
      const document = {
        number: deliveryNote.blNumber,
        date: deliveryNote.issueDate,
        lines: deliveryNote.parts.map((part: any, index: number) => ({
          ref: part.partNumber || `P${String(index + 1).padStart(3, '0')}`,
          description: part.description || part.name,
          shortDescription: part.notes,
          quantity: part.quantity,
          unitPrice: part.unitPrice || 0,
          discount: 0,
          lineTotal: part.totalPrice || 0,
          tvaRate: 0
        })),
        subtotal: deliveryNote.subtotal || 0,
        vatTotal: deliveryNote.taxAmount || 0,
        grandTotal: deliveryNote.totalValue || 0,
        paid: 0,
        balance: deliveryNote.totalValue || 0,
        showPrices: true,
        notes: deliveryNote.notes || '',
        labor: (deliveryNote.laborItems || []).map((l: any) => ({
          description: l.description,
          shortDescription: l.notes,
          hours: l.hours,
          hourlyRate: l.hourlyRate || 0,
          totalAmount: l.totalAmount || 0
        })),
        partsSubtotal: deliveryNote.totalPartsValue || 0,
        laborSubtotal: deliveryNote.totalLaborValue || 0
      }
      const customer = {
        name: deliveryNote.customerName,
        address: deliveryNote.customerContact?.address || '',
        postalCode: '',
        city: '',
        phone: deliveryNote.customerContact?.phone || '',
        email: deliveryNote.customerContact?.email || ''
      }
      const vehicle = {
        make: deliveryNote.vehicleInfo?.make || '',
        model: deliveryNote.vehicleInfo?.model || '',
        registration: deliveryNote.vehicleInfo?.registration || '',
        vin: deliveryNote.vehicleInfo?.vin || '',
        year: deliveryNote.vehicleInfo?.year || 0
      }
      const html = renderDocument('bon-livraison', convertWorkshopSettings(useSettingsStore.getState().workshop || workshop!), document, customer, vehicle)
      
      // Use the improved iframe printing
      await printHtml(html)
    } catch (e) {
      console.error('Print error:', e);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPDF = async () => {
    
    const document = {
      number: deliveryNote.blNumber,
      date: deliveryNote.issueDate,
      lines: deliveryNote.parts.map((part: any, index: number) => ({
        ref: part.partNumber || `P${String(index + 1).padStart(3, '0')}`,
        description: part.description || part.name,
        shortDescription: part.notes,
        quantity: part.quantity,
        unitPrice: part.unitPrice || 0,
        discount: 0,
        lineTotal: part.totalPrice || 0,
        tvaRate: 0
      })),
      subtotal: deliveryNote.subtotal || 0,
      vatTotal: deliveryNote.taxAmount || 0,
      grandTotal: deliveryNote.totalValue || 0,
      paid: 0,
      balance: deliveryNote.totalValue || 0,
      showPrices: true,
      notes: deliveryNote.notes || '',
      labor: (deliveryNote.laborItems || []).map((l: any) => ({
        description: l.description,
        shortDescription: l.notes,
        hours: l.hours,
        hourlyRate: l.hourlyRate || 0,
        totalAmount: l.totalAmount || 0
      })),
      partsSubtotal: deliveryNote.totalPartsValue || 0,
      laborSubtotal: deliveryNote.totalLaborValue || 0
    }
    const customer = {
      name: deliveryNote.customerName,
      address: deliveryNote.customerContact?.address || '',
      postalCode: '',
      city: '',
      phone: deliveryNote.customerContact?.phone || '',
      email: deliveryNote.customerContact?.email || ''
    }
    const vehicle = {
      make: deliveryNote.vehicleInfo?.make || '',
      model: deliveryNote.vehicleInfo?.model || '',
      registration: deliveryNote.vehicleInfo?.registration || '',
      vin: deliveryNote.vehicleInfo?.vin || '',
      year: deliveryNote.vehicleInfo?.year || 0
    }
    const html = renderDocument('bon-livraison', convertWorkshopSettings(useSettingsStore.getState().workshop || workshop!), document, customer, vehicle)
    await printHtml(html)
  };

  const handleConvertToInvoice = async () => {
    try {
      const conversionData = {
      convertToInvoice: true,
      invoiceSettings: {
        paymentTerms: '30 jours',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        taxRate: 20,
        includeLabor: deliveryNote.totalLaborValue > 0,
        notes: `Facture générée depuis le bon de livraison #${deliveryNote.blNumber}`
      }
    };
      
      // Create the invoice using the invoice store
      const invoiceData = {
        customerId: deliveryNote.customerId,
        vehicleId: deliveryNote.vehicleInfo.vin || deliveryNote.vehicleInfo.registration,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: conversionData.invoiceSettings.dueDate,
        items: [
          ...deliveryNote.parts.map(part => ({
            id: part.id,
            type: 'part' as const,
            description: part.name,
            quantity: part.quantity,
            unitPrice: part.unitPrice,
            totalPrice: part.totalPrice,
            partNumber: part.partNumber,
            taxRate: conversionData.invoiceSettings.taxRate
          })),
          ...(deliveryNote.laborItems && deliveryNote.laborItems.length > 0
            ? deliveryNote.laborItems.map(labor => ({
                id: labor.id,
                type: 'labor' as const,
                description: labor.description,
                quantity: labor.hours,
                unitPrice: labor.hourlyRate,
                totalPrice: labor.totalAmount,
                laborHours: labor.hours,
                hourlyRate: labor.hourlyRate,
                taxRate: conversionData.invoiceSettings.taxRate
              }))
            : [])
        ],
        notes: conversionData.invoiceSettings.notes,
        termsAndConditions: `Paiement à ${conversionData.invoiceSettings.paymentTerms}. TVA ${conversionData.invoiceSettings.taxRate}%.`
      };
      
      // Create proper Customer object from delivery note data
      const customer: Customer = {
        id: deliveryNote.customerId,
        type: 'individual',
        firstName: deliveryNote.customerName.split(' ')[0] || '',
        lastName: deliveryNote.customerName.split(' ').slice(1).join(' ') || '',
        email: deliveryNote.customerContact.email,
        phone: deliveryNote.customerContact.phone,
        address: {
          street: deliveryNote.customerContact.address.split(',')[0] || deliveryNote.customerContact.address,
          city: deliveryNote.customerContact.address.split(',')[1]?.trim() || '',
          state: deliveryNote.customerContact.address.split(',')[2]?.trim() || '',
          zipCode: deliveryNote.customerContact.address.split(',')[3]?.trim() || ''
        },
        vehicles: [],
        totalSpent: 0,
        registrationDate: new Date().toISOString()
      };
      
      // Create vehicle object
      const vehicle = {
        id: deliveryNote.vehicleInfo.vin,
        make: deliveryNote.vehicleInfo.make,
        model: deliveryNote.vehicleInfo.model,
        year: deliveryNote.vehicleInfo.year,
        vin: deliveryNote.vehicleInfo.vin,
        registration: deliveryNote.vehicleInfo.registration,
        mileage: deliveryNote.vehicleInfo.mileage,
        serviceHistory: [],
        invoices: []
      };
      
      const createdInvoice = createInvoice(invoiceData, customer, vehicle);
      await updateDeliveryNote(deliveryNote.id, { relatedInvoiceId: createdInvoice.id, status: 'invoiced' });
      alert('Delivery note successfully converted to invoice!');
      navigate(`/invoices/${createdInvoice.id}`);
    } catch (error) {
      console.error('Error converting to invoice:', error);
      alert('Error converting to invoice');
    }
  };

  const getStatusColor = (status: typeof deliveryNote.status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'validated': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'invoiced': return 'bg-purple-100 text-purple-800';
      case 'issued': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: typeof deliveryNote.status) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'pending': return 'En attente';
      case 'validated': return 'Validé';
      case 'approved': return 'Approuvé';
      case 'invoiced': return 'Facturé';
      case 'issued': return 'Émis';
      case 'delivered': return 'Livré';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/delivery-notes')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('deliveryNoteDetail.header.back')}
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('deliveryNoteDetail.header.titlePrefix')} #{deliveryNote.blNumber}
                </h1>
                <p className="text-sm text-gray-500">
                  {t('deliveryNoteDetail.header.issuedOn')} {formatDate(deliveryNote.issueDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(deliveryNote.status)}`}>
                {getStatusLabel(deliveryNote.status)}
              </span>
              <div className="flex items-center space-x-2">
                {deliveryNote.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('pending')}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {t('deliveryNoteDetail.actions.submit')}
                    </button>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {isEditing ? t('deliveryNoteDetail.actions.finish') : t('deliveryNoteDetail.actions.edit')}
                    </button>
                  </>
                )}
                {deliveryNote.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('validated')}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Valider le BL
                    </button>
                    <button
                      onClick={() => handleStatusChange('cancelled')}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t('deliveryNoteDetail.actions.reject')}
                    </button>
                  </>
                )}
                <button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait"
                >
                  {isPrinting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2" />
                  )}
                  {isPrinting ? 'Impression...' : t('deliveryNoteDetail.actions.print')}
                </button>
                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('deliveryNoteDetail.actions.exportPdf')}
                </button>
                {deliveryNote.status === 'validated' && (
                  <button
                    onClick={() => setShowInvoiceConfirm(true)}
                    className="inline-flex items-center px-3 py-2 border border-green-600 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Créer facture à partir de ce BL
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer and Vehicle Info */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t('deliveryNoteDetail.sections.customer')}</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Customer:</span> {deliveryNote.customerName}</p>
                <p>
                  <span className="font-medium">Job Order:</span>{' '}
                  {relatedJobOrder ? (
                    <button
                      onClick={() => navigate(`/job-orders/${relatedJobOrder.id}`)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {relatedJobOrder.jobNumber}
                    </button>
                  ) : (
                    'N/A'
                  )}
                </p>
                {deliveryNote.relatedInvoiceId && (
                  <p>
                    <span className="font-medium">{t('deliveryNoteDetail.invoiceLabel')}</span>{' '}
                    <button
                      onClick={() => navigate(`/invoices/${deliveryNote.relatedInvoiceId}`)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {deliveryNote.relatedInvoiceId}
                    </button>
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t('deliveryNoteDetail.sections.vehicle')}</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Make:</span> {deliveryNote.vehicleInfo.make}</p>
                <p><span className="font-medium">Model:</span> {deliveryNote.vehicleInfo.model}</p>
                <p><span className="font-medium">Year:</span> {deliveryNote.vehicleInfo.year}</p>
                <p><span className="font-medium">Registration:</span> {deliveryNote.vehicleInfo.registration}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Labor Section */}
      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">{t('deliveryNoteDetail.sections.labor')}</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.description')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.hours')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.hourlyRate')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.total')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.technician')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.relatedPart')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveryNote.laborItems && deliveryNote.laborItems.length > 0 ? (
                deliveryNote.laborItems.map((labor: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{labor.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingLaborId === labor.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={editingLaborHours}
                            onChange={(e) => setEditingLaborHours(parseFloat(e.target.value) || 0)}
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <button
                            onClick={() => handleLaborUpdate(labor.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingLaborId(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="flex items-center">
                          {labor.hours}
                          {isEditing && deliveryNote.status === 'draft' && (
                            <button
                              onClick={() => {
                                setEditingLaborId(labor.id);
                                setEditingLaborHours(labor.hours);
                                // setEditingLaborRate(labor.hourlyRate);
                              }}
                              className="ml-2 text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {showPricing ? formatCurrency(labor.hourlyRate || 0) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{showPricing ? formatCurrency(labor.totalAmount || 0) : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{labor.technician || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getRelatedPartLabel(labor, deliveryNote.parts)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">{t('deliveryNoteDetail.empty.noLabor')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Labor Subtotal */}
        {showPricing && deliveryNote.totalLaborValue > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('deliveryNoteDetail.totals.labor')}</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(deliveryNote.totalLaborValue)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      
      {/* Parts Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">{t('deliveryNoteDetail.sections.parts')}</h2>
            {isEditing && deliveryNote.status === 'draft' && (
              <button
                onClick={() => setShowAddPart(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('deliveryNoteDetail.actions.addPart')}
              </button>
            )}
          </div>
        </div>

        {/* Add Part Form */}
        {showAddPart && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('deliveryNoteDetail.table.ref')}</label>
                <select
                  value={partForm.partId}
                  onChange={(e) => setPartForm({ ...partForm, partId: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Sélectionner une pièce</option>
                  {inventoryItems
                    .filter((item: any) => item.quantity > 0)
                    .map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.description} (Stock: {item.quantity})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('deliveryNoteDetail.table.quantity')}</label>
                <input
                  type="number"
                  min="1"
                  value={partForm.quantity}
                  onChange={(e) => setPartForm({ ...partForm, quantity: parseInt(e.target.value) || 1 })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('deliveryNoteDetail.table.notes')}</label>
                <input
                  type="text"
                  value={partForm.notes || ''}
                  onChange={(e) => setPartForm({ ...partForm, notes: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={handleAddPart}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {t('deliveryNoteDetail.actions.add')}
                </button>
                <button
                  onClick={() => setShowAddPart(false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('deliveryNoteDetail.actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Parts List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.ref')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.description')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.quantity')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix unitaire HT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total HT</th>
                {showPricing && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TVA (20%)</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.notes')}</th>
                {isEditing && deliveryNote.status === 'draft' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('deliveryNoteDetail.table.actions')}</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveryNote.parts.map((part: any, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{part.partNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {inventoryItems.find((i: any) => i.id === part.partId)?.quantity || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingPartId === part.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={editingQuantity}
                          onChange={(e) => setEditingQuantity(parseInt(e.target.value) || 1)}
                          className="w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          onClick={() => handlePartUpdate(part.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingPartId(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center">
                        {part.quantity}
                        {isEditing && deliveryNote.status === 'draft' && (
                          <button
                            onClick={() => {
                              setEditingPartId(part.id);
                              setEditingQuantity(part.quantity);
                            }}
                            className="ml-2 text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {showPricing ? formatCurrency(part.unitPrice) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{showPricing ? formatCurrency(part.totalPrice) : '-'}</td>
                  {showPricing && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency((part.totalPrice || 0) * 0.20)}</td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-500">{part.notes || '-'}</td>
                  {isEditing && deliveryNote.status === 'draft' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleRemovePart(part.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {deliveryNote.parts.length === 0 && (
                <tr>
                  <td colSpan={isEditing && deliveryNote.status === 'draft' ? 7 : 6} className="px-6 py-8 text-center text-sm text-gray-500">
                    {t('deliveryNoteDetail.empty.noParts')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Parts Subtotal */}
        {showPricing && deliveryNote.parts.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('deliveryNoteDetail.totals.parts')}</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(deliveryNote.totalPartsValue)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document References */}
      {deliveryNote.relatedInvoiceId && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Document References</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Associated Invoice:</span>
              <button
                onClick={() => navigate(`/invoices/${deliveryNote.relatedInvoiceId}`)}
                className="ml-2 text-indigo-600 hover:text-indigo-900 font-medium"
              >
                #{deliveryNote.relatedInvoiceId}
              </button>
            </p>
          </div>
        </div>
      )}

      

      {/* TVA Summary and Totals */}
      {showPricing && (
        <>
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Résumé TVA</h3>
            <div className="flex justify-end">
              <div className="space-y-2 text-right w-full max-w-md">
                <div className="flex justify-between gap-8">
                  <span className="text-sm text-gray-600">Sous‑total HT</span>
                  <span className="font-medium">{formatCurrency(deliveryNote.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-sm text-gray-600">TVA 20%</span>
                  <span className="font-medium">{formatCurrency(deliveryNote.taxAmount || 0)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-sm font-semibold text-gray-900">Total TTC</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(deliveryNote.totalValue || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Signatures Section (Bottom) */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <FileSignature className="h-5 w-5 mr-2 text-gray-400" />
          {t('deliveryNoteDetail.sections.signatures')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Signature Client</h4>
            {deliveryNote.signatures?.customer ? (
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                <img 
                  src={deliveryNote.signatures.customer.signature} 
                  alt="Signature client" 
                  className="max-h-20 mx-auto"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {new Intl.DateTimeFormat('fr-FR').format(new Date(deliveryNote.signatures.customer.date))}
                </p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <p className="text-sm text-gray-500">Pas encore signé</p>
                {deliveryNote.status === 'delivered' && (
                  <button
                    onClick={() => {
                      setSignatureType('customer');
                      setShowSignatureModal(true);
                    }}
                    className="mt-2 inline-flex items-center px-3 py-1 border border-indigo-300 rounded-md text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                  >
                    <FileSignature className="h-3 w-3 mr-1" />
                    Signer
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Signature Technicien</h4>
            {deliveryNote.signatures?.technician ? (
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                <img 
                  src={deliveryNote.signatures.technician.signature} 
                  alt="Signature technicien" 
                  className="max-h-20 mx-auto"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {new Intl.DateTimeFormat('fr-FR').format(new Date(deliveryNote.signatures.technician.date))}
                </p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <p className="text-sm text-gray-500">Pas encore signé</p>
                <button
                  onClick={() => {
                    setSignatureType('technician');
                    setShowSignatureModal(true);
                  }}
                  className="mt-2 inline-flex items-center px-3 py-1 border border-indigo-300 rounded-md text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                >
                  <FileSignature className="h-3 w-3 mr-1" />
                  Signer
                </button>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Autorisé par</h4>
            {deliveryNote.signatures?.authorizedBy ? (
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                <img 
                  src={deliveryNote.signatures.authorizedBy.signature} 
                  alt="Signature autorisée" 
                  className="max-h-20 mx-auto"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {new Intl.DateTimeFormat('fr-FR').format(new Date(deliveryNote.signatures.authorizedBy.date))}
                </p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <p className="text-sm text-gray-500">Pas encore signé</p>
                <button
                  onClick={() => {
                    setSignatureType('authorizedBy');
                    setShowSignatureModal(true);
                  }}
                  className="mt-2 inline-flex items-center px-3 py-1 border border-indigo-300 rounded-md text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                >
                  <FileSignature className="h-3 w-3 mr-1" />
                  Signer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Ajouter une signature - {signatureType === 'customer' ? 'Client' : signatureType === 'technician' ? 'Technicien' : 'Autorisé'}
              </h3>
              <div className="mb-4">
                <canvas
                  id="signatureCanvas"
                  width="350"
                  height="150"
                  className="border border-gray-300 rounded"
                  style={{ touchAction: 'none' }}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement;
                    if (canvas) {
                      handleSignature(canvas.toDataURL());
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Conversion Confirmation Modal */}
      {showInvoiceConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirmer la conversion en facture
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Êtes-vous sûr de vouloir convertir ce bon de livraison en facture ?
                Cette action est irréversible.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowInvoiceConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConvertToInvoice}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
