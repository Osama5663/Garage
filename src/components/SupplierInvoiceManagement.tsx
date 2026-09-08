import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useInventoryStore } from '../stores/inventoryStore';
import { useDeliveryNotes } from '../hooks/useDeliveryNotes';
import { SupplierInvoice, InvoiceStatus, InvoicePaymentStatus } from '../types/inventory';
import { SupplierInvoiceForm } from './SupplierInvoiceForm';
import { SupplierInvoiceDetail } from './SupplierInvoiceDetail';
import { formatCurrency, formatDate } from '../utils/formatters';
import { DocumentTemplate, type DocumentItem, type DocumentTemplateProps } from './documents/DocumentTemplate';
import { Search, Plus, Filter, Eye, Edit, Trash2, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '../i18n';

const resolveSupplierIdFromDeliveryNote = (note: any, suppliers: any[]): string => {
  if (!note) return '';

  const direct = suppliers.find(s => s.id === note.supplier_id);
  if (direct) {
    return direct.id;
  }

  const email = note.suppliers?.email ? String(note.suppliers.email).toLowerCase() : '';
  if (email) {
    const byEmail = suppliers.find(s => s.email && s.email.toLowerCase() === email);
    if (byEmail) {
      return byEmail.id;
    }
  }

  const name = note.suppliers?.name ? String(note.suppliers.name).toLowerCase() : '';
  if (name) {
    const byName = suppliers.find(s => s.name.toLowerCase() === name);
    if (byName) {
      return byName.id;
    }
  }

  return note.supplier_id;
};

interface SupplierInvoiceManagementProps {
  currentUserRole: string;
  currentUserId: string;
}

export const SupplierInvoiceManagement: React.FC<SupplierInvoiceManagementProps> = ({
  currentUserRole
}) => {
  const location = useLocation();
  const {
    supplierInvoices,
    suppliers,
    purchaseOrders,
    inventoryItems,
    stockMovements,
    createSupplierInvoice,
    updateSupplierInvoice,
    deleteSupplierInvoice
  } = useInventoryStore();

  const { getDeliveryNoteById, getDeliveryNotesReadyForInvoicing } = useDeliveryNotes();
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);

  useEffect(() => {
    const loadDeliveryNotes = async () => {
      const notes = await getDeliveryNotesReadyForInvoicing();
      setDeliveryNotes(notes);
    };
    loadDeliveryNotes();
  }, [getDeliveryNotesReadyForInvoicing]);
  // This satisfies the requirement: "The inventory record must have been created through a valid delivery note transaction"
  const validInventoryItems = useMemo(() => {
    const validItemIds = new Set(
      stockMovements
        .filter(m => m.type === 'receive' || m.type === 'initial-stock') // Allowing initial-stock for legacy/setup items
        .map(m => m.inventoryItemId)
    );
    return inventoryItems.filter(item => validItemIds.has(item.id));
  }, [inventoryItems, stockMovements]);

  const [searchTerm, setSearchTerm] = useState('');
  const [initialInvoiceData, setInitialInvoiceData] = useState<any>(undefined);

  // Handle creating invoice from delivery note
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const deliveryNoteId = params.get('deliveryNoteId');
    
    if (deliveryNoteId && !showForm) {
      const initFromDN = async () => {
        try {
          const dn = await getDeliveryNoteById(deliveryNoteId);
          if (dn) {
            const invoiceData = {
              supplierId: resolveSupplierIdFromDeliveryNote(dn, suppliers),
              invoiceDate: new Date().toISOString().split('T')[0],
              purchaseOrderIds: dn.purchase_order_id ? [dn.purchase_order_id] : [],
              items: dn.supplier_delivery_note_items?.map((item: any) => {
                let invItemId = item.purchase_order_items?.inventory_item_id || '';

                if (invItemId) {
                  const direct = inventoryItems.find(i => i.id === invItemId);
                  if (!direct) {
                    invItemId = '';
                  }
                }

                if (!invItemId) {
                  const skuToFind = (item.item_reference || '').trim().toLowerCase();
                  const nameToFind = (item.item_name || '').trim().toLowerCase();

                  const found = inventoryItems.find(i =>
                    (i.sku && i.sku.trim().toLowerCase() === skuToFind) ||
                    (i.name && i.name.trim().toLowerCase() === nameToFind)
                  );

                  if (found) {
                    invItemId = found.id;
                  } else {
                    console.warn(`Could not find inventory item for SKU: ${item.item_reference} or Name: ${item.item_name}`);
                  }
                }

                return {
                  inventoryItemId: invItemId,
                  quantity: item.quantity_accepted,
                  unitPrice: parseFloat(item.unit_price_ht),
                  taxRate: dn.tva_rate ? dn.tva_rate / 100 : 0.20,
                  description: `${item.item_reference} - ${item.item_name}`,
                  deliveryNoteId: dn.id,
                  deliveryNoteNumber: dn.delivery_note_number
                };
              }) || [],
              notes: `Created from Delivery Note: ${dn.delivery_note_number}`
            };
            
            setInitialInvoiceData(invoiceData);
            setShowForm(true);
          }
        } catch (err) {
          console.error('Failed to load delivery note for invoice creation', err);
          toast.error('Failed to load delivery note details');
        }
      };
      
      initFromDN();
    }
  }, [location.search]);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<InvoicePaymentStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const canEdit = currentUserRole === 'admin' || currentUserRole === 'supervisor';
  const canDelete = currentUserRole === 'admin';

  // Initialize filter from URL (e.g., ?supplierId=SUP123)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const supplierId = params.get('supplierId');
    if (supplierId) {
      setSupplierFilter(supplierId);
      const s = suppliers.find((x) => x.id === supplierId);
      if (s) setSupplierQuery(s.name);
    }
  }, [location.search, suppliers]);

  // Filter invoices based on search and filters
  const filteredInvoices = useMemo(() => {
    return supplierInvoices.filter(invoice => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.items.some(item => item.itemName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

      // Payment status filter
      const matchesPaymentStatus = paymentStatusFilter === 'all' || invoice.paymentStatus === paymentStatusFilter;

      // Supplier filter (supports typing search by name)
      const normalizedQuery = supplierQuery.trim().toLowerCase();
      const matchesSupplier =
        supplierFilter === 'all'
          ? (normalizedQuery
              ? invoice.supplierName.toLowerCase().includes(normalizedQuery)
              : true)
          : invoice.supplierId === supplierFilter;

      // Date range filter
      let matchesDate = true;
      if (dateRangeFilter !== 'all') {
        const invoiceDate = new Date(invoice.invoiceDate);
        const now = new Date();
        
        switch (dateRangeFilter) {
          case 'today':
            matchesDate = invoiceDate.toDateString() === now.toDateString();
            break;
          case 'week': {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = invoiceDate >= weekAgo;
            break;
          }
          case 'month': {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = invoiceDate >= monthAgo;
            break;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesSupplier && matchesDate;
    });
  }, [supplierInvoices, searchTerm, statusFilter, paymentStatusFilter, supplierFilter, dateRangeFilter]);

  // Calculate invoice statistics
  const invoiceStats = useMemo(() => {
    const total = filteredInvoices.length;
    const paid = filteredInvoices.filter(i => i.paymentStatus === 'paid').length;
    const overdue = filteredInvoices.filter(i => 
      i.paymentStatus === 'unpaid' && 
      new Date(i.dueDate) < new Date()
    ).length;
    const totalOutstanding = filteredInvoices
      .filter(i => i.paymentStatus !== 'paid')
      .reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

    return { total, paid, overdue, totalOutstanding };
  }, [filteredInvoices]);

  const handleEditInvoice = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    setShowForm(true);
  };

  const handleViewInvoice = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    setShowDetail(true);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!canDelete) return;
    
    if (window.confirm('Are you sure you want to delete this supplier invoice?')) {
      try {
        await deleteSupplierInvoice(invoiceId);
        toast.success('Supplier invoice deleted successfully');
      } catch (error) {
        toast.error('Failed to delete supplier invoice');
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedInvoice(null);
  };

  const handleDetailClose = () => {
    setShowDetail(false);
    setSelectedInvoice(null);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (selectedInvoice) {
        await updateSupplierInvoice(selectedInvoice.id, data);
        toast.success('Supplier invoice updated successfully');
      } else {
        const created = await createSupplierInvoice(data);
        toast.success(`Supplier invoice ${created.invoiceNumber} created successfully`);
      }
      handleFormClose();
    } catch (error) {
      toast.error('Failed to save supplier invoice');
    }
  };

  const handleSupplierQueryChange = (val: string) => {
    setSupplierQuery(val)
    const normalized = val.trim().toLowerCase()
    if (
      normalized === '' ||
      normalized === 'all' ||
      normalized === t('supplierInvoiceManagement.filters.statusOptions.all').toLowerCase()
    ) {
      setSupplierFilter('all')
      return
    }
    const match = suppliers.find((s) => s.name.toLowerCase() === normalized)
    if (match) setSupplierFilter(match.id)
  }

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'disputed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: InvoicePaymentStatus) => {
    switch (status) {
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft': return t('supplierInvoiceManagement.filters.statusOptions.draft').toUpperCase();
      case 'sent': return t('supplierInvoiceManagement.filters.statusOptions.sent').toUpperCase();
      case 'paid': return t('supplierInvoiceManagement.filters.statusOptions.paid').toUpperCase();
      case 'partially_paid': return t('supplierInvoiceManagement.filters.statusOptions.partially_paid').toUpperCase();
      case 'overdue': return t('supplierInvoiceManagement.filters.statusOptions.overdue').toUpperCase();
      case 'cancelled': return t('supplierInvoiceManagement.filters.statusOptions.cancelled').toUpperCase();
      case 'disputed': return t('supplierInvoiceManagement.filters.statusOptions.disputed').toUpperCase();
      default: return String(status).toUpperCase();
    }
  };

  const getPaymentText = (status: InvoicePaymentStatus) => {
    switch (status) {
      case 'unpaid': return t('supplierInvoiceManagement.badges.payment.UNPAID');
      case 'partially_paid': return t('supplierInvoiceManagement.badges.payment.PARTIALLY_PAID');
      case 'paid': return t('supplierInvoiceManagement.badges.payment.PAID');
      case 'overdue': return t('supplierInvoiceManagement.badges.payment.OVERDUE');
      default: return String(status).toUpperCase();
    }
  };

  if (showForm) {
    return (
      <SupplierInvoiceForm
        invoice={selectedInvoice || undefined}
        initialData={initialInvoiceData}
        onSubmit={handleFormSubmit}
        onCancel={() => {
          handleFormClose();
          setInitialInvoiceData(undefined);
        }}
        suppliers={suppliers}
        purchaseOrders={purchaseOrders}
        deliveryNotes={deliveryNotes}
        inventoryItems={validInventoryItems}
      />
    );
  }

  if (showDetail && selectedInvoice) {
    return (
      <SupplierInvoiceDetail
        invoice={selectedInvoice}
        onClose={handleDetailClose}
        onEdit={canEdit ? () => handleEditInvoice(selectedInvoice) : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('supplierInvoiceManagement.header')}</h2>
          <p className="text-gray-600">{t('supplierInvoiceManagement.subtitle')}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>{t('supplierInvoiceManagement.actions.newInvoice')}</span>
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('supplierInvoiceManagement.cards.totalInvoices')}</p>
              <p className="text-2xl font-bold">{invoiceStats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('supplierInvoiceManagement.cards.paid')}</p>
              <p className="text-2xl font-bold">{invoiceStats.paid}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('supplierInvoiceManagement.cards.overdue')}</p>
              <p className="text-2xl font-bold">{invoiceStats.overdue}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('supplierInvoiceManagement.cards.outstanding')}</p>
              <p className="text-2xl font-bold">{formatCurrency(invoiceStats.totalOutstanding)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('supplierInvoiceManagement.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoiceManagement.filters.statusLabel')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('supplierInvoiceManagement.filters.statusOptions.all')}</option>
              <option value="draft">{t('supplierInvoiceManagement.filters.statusOptions.draft')}</option>
              <option value="sent">{t('supplierInvoiceManagement.filters.statusOptions.sent')}</option>
              <option value="paid">{t('supplierInvoiceManagement.filters.statusOptions.paid')}</option>
              <option value="partially_paid">{t('supplierInvoiceManagement.filters.statusOptions.partially_paid')}</option>
              <option value="overdue">{t('supplierInvoiceManagement.filters.statusOptions.overdue')}</option>
              <option value="cancelled">{t('supplierInvoiceManagement.filters.statusOptions.cancelled')}</option>
              <option value="disputed">{t('supplierInvoiceManagement.filters.statusOptions.disputed')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoiceManagement.filters.paymentStatusLabel')}</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as InvoicePaymentStatus | 'all')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('supplierInvoiceManagement.filters.paymentOptions.all')}</option>
              <option value="unpaid">{t('supplierInvoiceManagement.filters.paymentOptions.unpaid')}</option>
              <option value="partially_paid">{t('supplierInvoiceManagement.filters.paymentOptions.partially_paid')}</option>
              <option value="paid">{t('supplierInvoiceManagement.filters.paymentOptions.paid')}</option>
              <option value="overdue">{t('supplierInvoiceManagement.filters.paymentOptions.overdue')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoiceManagement.filters.supplierLabel')}</label>
            <input
              type="text"
              value={supplierQuery}
              onChange={(e) => handleSupplierQueryChange(e.target.value)}
              list="supplier-options"
              placeholder={t('supplierInvoiceManagement.searchSupplierPlaceholder') || 'Search supplier by typing'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-autocomplete="list"
            />
            <datalist id="supplier-options">
              <option value={t('supplierInvoiceManagement.filters.supplierOptions.all')} />
              {suppliers.map((s) => (
                <option key={String((s as any).id ?? (s as any)._id ?? s.name)} value={s.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierInvoiceManagement.filters.dateRangeLabel')}</label>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('supplierInvoiceManagement.filters.dateOptions.all')}</option>
              <option value="today">{t('supplierInvoiceManagement.filters.dateOptions.today')}</option>
              <option value="week">{t('supplierInvoiceManagement.filters.dateOptions.week')}</option>
              <option value="month">{t('supplierInvoiceManagement.filters.dateOptions.month')}</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPaymentStatusFilter('all');
                setSupplierFilter('all');
                setDateRangeFilter('all');
              }}
              className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>{t('supplierInvoiceManagement.filters.clear')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierInvoiceManagement.table.columns.invoiceNumber')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierInvoiceManagement.table.columns.supplier')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierInvoiceManagement.table.columns.date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierInvoiceManagement.table.columns.dueDate')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierInvoiceManagement.table.columns.amount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierInvoiceManagement.table.columns.relatedPOs')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierInvoiceManagement.table.columns.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierInvoiceManagement.table.columns.payment')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierInvoiceManagement.table.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={String((invoice as any).id ?? (invoice as any)._id ?? invoice.invoiceNumber)} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.supplierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(invoice.dueDate)}
                    {invoice.paymentStatus === 'unpaid' && new Date(invoice.dueDate) < new Date() && (
                      <span className="ml-2 text-xs text-red-600">{t('supplierInvoiceManagement.badges.payment.OVERDUE')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.purchaseOrderNumbers && invoice.purchaseOrderNumbers.length > 0 ? (
                      <div className="space-y-1">
                        {invoice.purchaseOrderIds.map((poId, idx) => (
                          <a
                            key={`${String((invoice as any).id ?? (invoice as any)._id ?? invoice.invoiceNumber)}-${poId}-${idx}`}
                            href={`/inventory/manage?tab=purchase-orders&po=${poId}`}
                            className="text-blue-600 hover:text-blue-800 text-xs block"
                          >
                            {invoice.purchaseOrderNumbers[idx]}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusText(invoice.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                      {getPaymentText(invoice.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-900"
                        title={t('supplierInvoiceManagement.tooltips.viewDetails')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleEditInvoice(invoice)}
                          className="text-green-600 hover:text-green-900"
                          title={t('supplierInvoiceManagement.tooltips.editInvoice')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="text-red-600 hover:text-red-900"
                          title={t('supplierInvoiceManagement.tooltips.deleteInvoice')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredInvoices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No supplier invoices found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};

interface SupplierPaymentManagementProps {
  currentUserRole: string;
  currentUserId: string;
}

export const SupplierPaymentManagement: React.FC<SupplierPaymentManagementProps> = ({
  currentUserRole: _currentUserRole
}) => {
  const {
    supplierInvoices,
    returnOrders,
    suppliers,
  } = useInventoryStore();

  const { deliveryNotes, fetchDeliveryNotes } = useDeliveryNotes();

  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDeliveryNoteIds, setSelectedDeliveryNoteIds] = useState<string[]>([]);
  const [selectedReturnIds, setSelectedReturnIds] = useState<string[]>([]);
  const [showSettlementPreview, setShowSettlementPreview] = useState(false);

  useEffect(() => {
    fetchDeliveryNotes({ status: 'validated' });
  }, [fetchDeliveryNotes]);

  const parseDate = (value: string | undefined) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const isWithinRange = (value: string | undefined) => {
    const d = parseDate(value);
    if (!d) return true;
    if (dateFrom) {
      const from = parseDate(dateFrom);
      if (from && d < from) return false;
    }
    if (dateTo) {
      const to = parseDate(dateTo);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }
    return true;
  };

  const matchesSupplier = (supplierId: string, supplierName: string) => {
    if (supplierFilter !== 'all' && supplierId !== supplierFilter) {
      return false;
    }
    const query = supplierQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return supplierName.toLowerCase().includes(query);
  };

  const toggleDeliveryNoteSelection = (id: string) => {
    setSelectedDeliveryNoteIds(prev =>
      prev.includes(id) ? prev.filter(existingId => existingId !== id) : [...prev, id]
    );
  };

  const toggleReturnSelection = (id: string) => {
    setSelectedReturnIds(prev =>
      prev.includes(id) ? prev.filter(existingId => existingId !== id) : [...prev, id]
    );
  };

  const notesRequiringAttention = useMemo(() => {
    const candidates = deliveryNotes.filter(note => note.status === 'validated');

    return candidates.filter(note => {
      const supplierName =
        (note.suppliers && note.suppliers.name) ||
        suppliers.find(s => s.id === note.supplier_id)?.name ||
        '';

      if (!matchesSupplier(note.supplier_id, supplierName)) {
        return false;
      }

      if (!isWithinRange(note.delivery_date)) {
        return false;
      }

      const links = note.delivery_note_invoices || [];
      if (links.length === 0) {
        return true;
      }

      const hasUnpaidLinkedInvoice = links.some(link => {
        const invoiceId = link.invoice_id;
        const related = supplierInvoices.find(inv => inv.id === invoiceId);
        if (!related) return true;
        return (
          related.paymentStatus === 'unpaid' ||
          related.paymentStatus === 'partially_paid' ||
          related.paymentStatus === 'overdue'
        );
      });

      return hasUnpaidLinkedInvoice;
    });
  }, [deliveryNotes, suppliers, supplierInvoices, supplierFilter, supplierQuery, dateFrom, dateTo]);

  const filteredReturns = useMemo(() => {
    const pending = returnOrders.filter(ro =>
      ro.status === 'requested' ||
      ro.status === 'approved'
    );

    return pending.filter(ro => {
      if (!matchesSupplier(ro.supplierId, ro.supplierName)) {
        return false;
      }
      if (!isWithinRange(ro.returnDate)) {
        return false;
      }
      return true;
    });
  }, [returnOrders, supplierFilter, supplierQuery, dateFrom, dateTo]);

  const handleSupplierQueryChange = (val: string) => {
    setSupplierQuery(val);
    const normalized = val.trim().toLowerCase();
    if (!normalized) {
      setSupplierFilter('all');
      return;
    }
    const match = suppliers.find(s => s.name.toLowerCase() === normalized);
    if (match) {
      setSupplierFilter(match.id);
    }
  };

  const handleClearFilters = () => {
    setSupplierFilter('all');
    setSupplierQuery('');
    setDateFrom('');
    setDateTo('');
    setSelectedDeliveryNoteIds([]);
    setSelectedReturnIds([]);
    setShowSettlementPreview(false);
  };

  const selectedDeliveryNotes = useMemo(
    () => notesRequiringAttention.filter(note => selectedDeliveryNoteIds.includes(note.id)),
    [notesRequiringAttention, selectedDeliveryNoteIds]
  );

  const selectedReturns = useMemo(
    () => filteredReturns.filter(ro => selectedReturnIds.includes(ro.id)),
    [filteredReturns, selectedReturnIds]
  );

  const totalDeliveryNotesAmount = selectedDeliveryNotes.reduce(
    (sum, note) => sum + (note.total_amount_ttc || 0),
    0
  );

  const totalReturnsAmount = selectedReturns.reduce(
    (sum, ro) => sum + (ro.totalAmount || 0),
    0
  );

  const netToPay = totalDeliveryNotesAmount - totalReturnsAmount;

  const settlementSupplierIds = new Set<string>();
  selectedDeliveryNotes.forEach(note => {
    const resolvedId = resolveSupplierIdFromDeliveryNote(note, suppliers);
    if (resolvedId) {
      settlementSupplierIds.add(String(resolvedId));
    } else if (note.supplier_id) {
      settlementSupplierIds.add(String(note.supplier_id));
    }
  });
  selectedReturns.forEach(ro => {
    if ((ro as any).supplierId) {
      settlementSupplierIds.add(String((ro as any).supplierId));
    }
  });

  let settlementRecipient: DocumentTemplateProps['recipientInfo'] = {
    name: 'Aucun élément sélectionné'
  };

  const primaryDeliveryNote = selectedDeliveryNotes[0];
  const primaryReturn = !primaryDeliveryNote && selectedReturns.length > 0 ? selectedReturns[0] : null;

  let candidateSupplierId: string | null = null;
  let candidateName: string | undefined;
  let candidateEmail: string | undefined;
  let candidatePhone: string | undefined;

  if (primaryDeliveryNote) {
    candidateSupplierId = resolveSupplierIdFromDeliveryNote(primaryDeliveryNote, suppliers) || primaryDeliveryNote.supplier_id;
    candidateName = primaryDeliveryNote.suppliers?.name;
    candidateEmail = primaryDeliveryNote.suppliers?.email;
    candidatePhone = primaryDeliveryNote.suppliers?.contact_person;
  } else if (primaryReturn) {
    candidateSupplierId = (primaryReturn as any).supplierId || null;
    candidateName = (primaryReturn as any).supplierName;
  } else if (settlementSupplierIds.size > 0) {
    candidateSupplierId = Array.from(settlementSupplierIds)[0];
  }

  let supplierFromStore =
    candidateSupplierId
      ? suppliers.find(s => s.id === candidateSupplierId || (s as any)._id === candidateSupplierId)
      : undefined;

  if (!supplierFromStore && candidateName) {
    const normalized = candidateName.toLowerCase();
    supplierFromStore = suppliers.find(s => s.name.toLowerCase() === normalized);
  }

  if (supplierFromStore) {
    const addressParts = [
      supplierFromStore.address,
      [supplierFromStore.postcode, supplierFromStore.city].filter(Boolean).join(' '),
      supplierFromStore.country
    ].filter(Boolean);

    settlementRecipient = {
      name: supplierFromStore.name,
      address: addressParts.join('\n'),
      phone: supplierFromStore.phone,
      email: supplierFromStore.email,
      taxId: supplierFromStore.taxId
    };
  } else if (candidateName) {
    settlementRecipient = {
      name: candidateName,
      phone: candidatePhone,
      email: candidateEmail
    };
  } else if (settlementSupplierIds.size > 1) {
    settlementRecipient = {
      name: 'Fournisseurs multiples'
    };
  }

  const settlementItems: DocumentItem[] = [
    ...selectedDeliveryNotes.map(note => ({
      code: note.delivery_note_number,
      description: `Bon de livraison ${note.delivery_note_number}`,
      quantity: 1,
      unitPrice: note.total_amount_ttc || 0,
      total: note.total_amount_ttc || 0
    })),
    ...selectedReturns.map(ro => ({
      code: ro.returnNumber,
      description: `Retour ${ro.returnNumber}`,
      quantity: 1,
      unitPrice: -ro.totalAmount,
      total: -ro.totalAmount
    }))
  ];

  const settlementTotals = {
    subtotal: netToPay,
    tax: 0,
    taxLabel: 'Ajustement',
    total: netToPay
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Règlements fournisseurs
        </h2>
        <p className="text-gray-600">
          Suivi des bons de livraison et des retours fournisseurs avec filtres simples.
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur
            </label>
            <input
              type="text"
              value={supplierQuery}
              onChange={e => handleSupplierQueryChange(e.target.value)}
              list="supplier-payment-options"
              placeholder="Filtrer par fournisseur"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="supplier-payment-options">
              {suppliers.map(s => (
                <option
                  key={String((s as any).id ?? (s as any)._id ?? s.name)}
                  value={s.name}
                />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleClearFilters}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Réinitialiser les filtres</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Bons de livraison
            </h3>
            <span className="text-sm text-gray-500">
              {notesRequiringAttention.length} élément(s)
            </span>
          </div>
          {notesRequiringAttention.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              Aucun bon de livraison trouvé pour ces filtres.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">
                      Sélect.
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Bon
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Fournisseur
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                      Montant TTC
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Factures liées
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notesRequiringAttention.map(note => {
                    const supplierName =
                      (note.suppliers && note.suppliers.name) ||
                      suppliers.find(s => s.id === note.supplier_id)?.name ||
                      '';
                    return (
                      <tr key={String((note as any).id ?? (note as any)._id ?? note.delivery_note_number)}>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            checked={selectedDeliveryNoteIds.includes(note.id)}
                            onChange={() => toggleDeliveryNoteSelection(note.id)}
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">
                          {note.delivery_note_number}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                          {supplierName || '—'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                          {formatDate(note.delivery_date)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-gray-700">
                          {formatCurrency(note.total_amount_ttc)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                          {note.delivery_note_invoices &&
                          note.delivery_note_invoices.length > 0 ? (
                            <div className="space-y-1">
                              {note.delivery_note_invoices.map(link => (
                                <div
                                  key={link.invoice_id}
                                  className="flex items-center space-x-2 text-xs"
                                >
                                  <span className="font-medium">
                                    {link.invoices?.invoice_number || link.invoice_id}
                                  </span>
                                  {link.invoices?.status && (
                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                      {link.invoices.status}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">
                              Aucune facture liée
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Retours
            </h3>
            <span className="text-sm text-gray-500">
              {filteredReturns.length} élément(s)
            </span>
          </div>
          {filteredReturns.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              Aucun retour trouvé pour ces filtres.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">
                      Sélect.
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Retour
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Fournisseur
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Motif
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReturns.map(ro => (
                    <tr key={String((ro as any).id ?? (ro as any)._id ?? ro.returnNumber)}>
                      <td className="px-4 py-2 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          checked={selectedReturnIds.includes(ro.id)}
                          onChange={() => toggleReturnSelection(ro.id)}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">
                        {ro.returnNumber}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                        {ro.supplierName}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                        {formatDate(ro.returnDate)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-gray-700">
                        {formatCurrency(ro.totalAmount)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700 capitalize">
                        {ro.returnReason.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ro.status === 'requested'
                              ? 'bg-yellow-100 text-yellow-800'
                              : ro.status === 'approved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {ro.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Section de règlement
            </h3>
            <p className="text-sm text-gray-600">
              Sélectionnez des BL et/ou des retours pour calculer un règlement.
            </p>
          </div>
          <div className="text-sm text-gray-700 space-y-1 md:text-right">
            <div>
              Total BL sélectionnés:{' '}
              <span className="font-semibold">
                {formatCurrency(totalDeliveryNotesAmount)}
              </span>
            </div>
            <div>
              Total retours sélectionnés:{' '}
              <span className="font-semibold">
                {formatCurrency(totalReturnsAmount)}
              </span>
            </div>
            <div>
              Net à régler:{' '}
              <span className="font-semibold">
                {formatCurrency(netToPay)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500">
            Éléments sélectionnés: {selectedDeliveryNotes.length} BL,{' '}
            {selectedReturns.length} retours
          </div>
          <button
            type="button"
            disabled={settlementItems.length === 0}
            onClick={() => setShowSettlementPreview(prev => !prev)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border ${
              settlementItems.length === 0
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            {showSettlementPreview
              ? 'Masquer le document de règlement'
              : 'Générer le document de règlement'}
          </button>
        </div>

        {showSettlementPreview && settlementItems.length > 0 && (
          <div className="mt-4 border rounded-lg bg-gray-50 p-4 max-h-[480px] overflow-auto">
            <DocumentTemplate
              title="Règlement Fournisseur"
              referenceNumber={`REG-${new Date()
                .toISOString()
                .slice(0, 10)}`}
              date={new Date()}
              recipientInfo={settlementRecipient}
              items={settlementItems}
              totals={settlementTotals}
              notes="Document de règlement généré à partir des bons de livraison et retours sélectionnés."
              paymentTerms="Règlement calculé sur la base des documents ci-dessus."
            />
          </div>
        )}
      </div>
    </div>
  );
};
