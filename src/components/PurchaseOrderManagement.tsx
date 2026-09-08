import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '../stores/inventoryStore';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import { PurchaseOrder, PurchaseOrderFormData } from '../types/inventory';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  AlertTriangle, 
  Building,
  FileText,
  Send,
  DollarSign,
  Clock,
  Package,
  Eye,
  Printer,
  Mail,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { t } from '../i18n';
import { useLangStore } from '../stores/langStore';

import { PrintablePurchaseOrder } from './PrintablePurchaseOrder';

interface PurchaseOrderManagementProps {
  currentUserRole: 'admin' | 'staff';
  currentUserId: string;
}

export const PurchaseOrderManagement: React.FC<PurchaseOrderManagementProps> = ({
  currentUserRole
}) => {
  const {
    suppliers,
    inventoryItems
  } = useInventoryStore();

  const {
    purchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    receivePurchaseOrder
  } = usePurchaseOrders();

  const navigate = useNavigate();

  // State management
  const [showFilters, setShowFilters] = useState(false);
  const [showAddPOModal, setShowAddPOModal] = useState(false);
  const [showEditPOModal, setShowEditPOModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [printPO, setPrintPO] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });
  // Read query params to preselect PO
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const poId = params.get('po');
    if (poId) {
      const po = purchaseOrders.find((p) => p.id === poId);
      if (po) {
        setSearchTerm(po.orderNumber);
        setSelectedPO(po);
        setShowDetailModal(true);
      }
    }
  }, [location.search, purchaseOrders]);

  // Form states
  const [poFormData, setPoFormData] = useState<Partial<PurchaseOrderFormData>>({
    supplierId: '',
    expectedDeliveryDate: '',
    referenceNumber: '',
    notes: '',
    items: []
  });
  const [itemSearchQueries, setItemSearchQueries] = useState<Record<number, string>>({})
  const [itemLookupOpen, setItemLookupOpen] = useState<Record<number, boolean>>({})
  const [itemLookupHighlight, setItemLookupHighlight] = useState<Record<number, number>>({})
  const [bulkSelectOpen, setBulkSelectOpen] = useState(false)
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Record<string, boolean>>({})
  const [receiveItems, setReceiveItems] = useState<{ inventoryItemId: string; quantity: number; batchNumber?: string; expiryDate?: string; unitCost?: number }[]>([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [invModalLoading, setInvModalLoading] = useState(false)
  const [invModalError, setInvModalError] = useState<string | null>(null)
  const [invModalSearch, setInvModalSearch] = useState('')
  const [invModalSelected, setInvModalSelected] = useState<Record<string, boolean>>({})
  const [invHighlightIdx, setInvHighlightIdx] = useState(-1)

  // Formatting functions
  const formatCurrency = (amount: number) => {
    const { locale, currency } = useLangStore.getState();
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const { locale } = useLangStore.getState();
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return t('poManagement.statusText.draft');
      case 'pending': return t('poManagement.statusText.pending');
      case 'sent': return t('poManagement.statusText.sent');
      case 'confirmed': return t('poManagement.statusText.confirmed');
      case 'partially_received': return t('poManagement.statusText.partially_received');
      case 'received': return t('poManagement.statusText.received');
      case 'cancelled': return t('poManagement.statusText.cancelled');
      default: return status;
    }
  };

  const isOverdue = (expectedDate: string, status: string) => {
    return new Date(expectedDate) < new Date() && status !== 'received' && status !== 'cancelled';
  };

  // Get stats from hook data
  const stats = {
    pendingOrders: purchaseOrders.filter(o => o.status === 'pending').length,
    overdueOrders: purchaseOrders.filter(o => isOverdue(o.expectedDeliveryDate || o.orderDate, o.status)).length
  };

  // Filter purchase orders
  const filteredPOs = purchaseOrders.filter(order => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(term) ||
        order.supplierName.toLowerCase().includes(term) ||
        order.referenceNumber?.toLowerCase().includes(term) ||
        order.items.some(item => item.itemName.toLowerCase().includes(term));
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;

    // Supplier filter
    if (supplierFilter !== 'all' && order.supplierId !== supplierFilter) return false;

    // Date range filter
    if (dateRangeFilter.from && new Date(order.orderDate) < new Date(dateRangeFilter.from)) return false;
    if (dateRangeFilter.to && new Date(order.orderDate) > new Date(dateRangeFilter.to)) return false;

    return true;
  });

  // Action handlers
  const handleAddPO = () => {
    setPoFormData({
      supplierId: '',
      expectedDeliveryDate: '',
      referenceNumber: '',
      notes: '',
    items: []
    });
    const draft = sessionStorage.getItem('po-draft-items')
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        if (Array.isArray(parsed)) {
          setPoFormData(prev => ({ ...prev, items: parsed }))
        }
      } catch {}
    }
    setShowAddPOModal(true);
  };

  const handleEditPO = (order: PurchaseOrder) => {
    setSelectedPO(order);
    setPoFormData({
      supplierId: order.supplierId,
      expectedDeliveryDate: order.expectedDeliveryDate?.split('T')[0],
      referenceNumber: order.referenceNumber,
      notes: order.notes,
      items: order.items.map(item => {
        // Resolve inventoryItemId from SKU if missing
        const invItem = item.inventoryItemId 
          ? inventoryItems.find(i => i.id === item.inventoryItemId)
          : inventoryItems.find(i => i.sku === item.sku);
          
        return {
          inventoryItemId: invItem?.id || item.inventoryItemId || '',
          quantity: item.quantityOrdered,
          unitCost: item.unitCost
        };
      })
    });
    setShowEditPOModal(true);
  };

  const handleViewPO = (order: PurchaseOrder) => {
    setSelectedPO(order);
    setShowDetailModal(true);
  };

  const handleDeletePO = async (order: PurchaseOrder) => {
    if (order.status === 'received' || order.status === 'partially_received') {
      toast.error('Cannot delete purchase order with received items. Cancel it instead.')
      return
    }
    // Allow admins to delete any PO, but restrict staff
    if (currentUserRole !== 'admin' && order.status !== 'pending' && order.status !== 'draft' && order.status !== 'cancelled') {
      toast.error('Cannot delete purchase order that is not in pending/draft/cancelled status');
      return;
    }
    
    if (confirm(`Are you sure you want to delete PO ${order.orderNumber}? This action cannot be undone.`)) {
      try {
        await deletePurchaseOrder(order.id);
        toast.success('Purchase order deleted successfully');
        setShowDetailModal(false); // Close modal if open
      } catch (error: any) {
        console.error('Delete failed:', error);
        // specific check for FK constraint violation
        if (error.code === '23503') { // Postgres foreign_key_violation
           toast.error('Cannot delete this Purchase Order because it is linked to other documents (e.g., Delivery Notes).');
        } else {
           const message =
             error?.response?.data?.error ||
             error?.message ||
             'Unknown error'
           toast.error(`Failed to delete purchase order: ${message}`);
        }
      }
    }
  };

  const handleReceivePO = (order: PurchaseOrder) => {
    setSelectedPO(order);
    setReceiveItems(order.items.map(item => {
      // Resolve inventoryItemId from SKU if missing
      const invItem = item.inventoryItemId 
        ? inventoryItems.find(i => i.id === item.inventoryItemId)
        : inventoryItems.find(i => i.sku === item.sku);

      return {
        inventoryItemId: invItem?.id || item.inventoryItemId || '',
        quantity: item.quantityOrdered - item.quantityReceived,
        batchNumber: '',
        expiryDate: '',
        unitCost: item.unitCost
      };
    }));
    setShowReceiveModal(true);
  };

  const handleMarkAsSent = (order: PurchaseOrder) => {
    updatePurchaseOrder(order.id, { status: 'sent' });
    toast.success('Purchase order marked as sent');
  };

  const handleCancelPO = (order: PurchaseOrder) => {
    if (order.status === 'received') {
      toast.error('Cannot cancel received purchase order');
      return;
    }
    
    if (confirm(`Are you sure you want to cancel PO ${order.orderNumber}?`)) {
      updatePurchaseOrder(order.id, { status: 'cancelled' });
      toast.success('Purchase order cancelled successfully');
    }
  };

  // Form submission handlers
  const handleSubmitPOForm = async (isEdit: boolean) => {
    try {
      if (!poFormData.supplierId) {
        toast.error(t('poManagement.modal.validation.supplierRequired'));
        return;
      }

      if (!poFormData.items || poFormData.items.length === 0) {
        toast.error(t('poManagement.modal.validation.supplierRequired'));
        return;
      }

      // Basic validation for items
      const invalid = poFormData.items.some(it => (it.quantity || 0) <= 0 || (it.unitCost || 0) < 0)
      if (invalid) {
        toast.error('Please ensure all items have valid quantity and unit cost');
        return;
      }

      if (isEdit && selectedPO) {
        // Map form data to PurchaseOrder updates
        const updates: Partial<PurchaseOrder> = {
          supplierId: poFormData.supplierId,
          expectedDeliveryDate: poFormData.expectedDeliveryDate || undefined,
          referenceNumber: poFormData.referenceNumber,
          notes: poFormData.notes,
          // Convert form items to PurchaseOrderItem format
          items: poFormData.items?.map(item => ({
            id: `${item.inventoryItemId || 'manual'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            itemId: item.inventoryItemId || `manual_${Date.now()}`,
            inventoryItemId: item.inventoryItemId,
            itemName: item.itemName || inventoryItems.find(i => i.id === item.inventoryItemId)?.name || 'Unknown Item',
            sku: item.sku || inventoryItems.find(i => i.id === item.inventoryItemId)?.sku || 'MANUAL',
            quantityOrdered: item.quantity,
            quantityReceived: 0,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
            receivedBatches: [],
            status: 'pending' as const,
            name: item.itemName || inventoryItems.find(i => i.id === item.inventoryItemId)?.name || 'Unknown Item'
          })) || []
        };
        
        await updatePurchaseOrder(selectedPO.id, updates);
        toast.success(t('poManagement.modal.success.updated'));
        setShowEditPOModal(false);
      } else {
        await createPurchaseOrder(poFormData as PurchaseOrderFormData);
        toast.success(t('poManagement.modal.success.created'));
        setShowAddPOModal(false);
        setSearchTerm('');
        sessionStorage.removeItem('po-draft-items');
      }
      
      setPoFormData({
        supplierId: '',
        expectedDeliveryDate: '',
        referenceNumber: '',
        notes: '',
        items: []
      });
      setSelectedPO(null);
    } catch (error: any) {
      const message = error?.message || error?.details || 'Unknown error'
      console.error(`Error saving purchase order: ${message}`)
      toast.error(t('poManagement.modal.error.save').replace('{{error}}', message));
    }
  };

  const handleSubmitReceive = () => {
    if (!selectedPO) return;

    try {
      const validReceiveItems = receiveItems.filter(item => item.quantity > 0);
      if (validReceiveItems.length === 0) {
        toast.error('Please enter quantities to receive');
        return;
      }

      receivePurchaseOrder(selectedPO.id, validReceiveItems);
      toast.success('Items received successfully');
      setShowReceiveModal(false);
      setSelectedPO(null);
      setReceiveItems([]);
    } catch (error) {
      toast.error(`Error receiving items: ${error}`);
    }
  };

  // Quick actions
  const handlePrintPO = (order?: PurchaseOrder) => {
    const target = order || selectedPO;
    if (target) {
      setPrintPO(target);
      setTimeout(() => {
        window.print();
        setPrintPO(null);
      }, 500);
    }
  };

  const handleEmailPO = (order: PurchaseOrder) => {
    const supplier = suppliers.find(s => s.id === order.supplierId);
    if (supplier?.email) {
      window.location.href = `mailto:${supplier.email}?subject=Purchase Order ${order.orderNumber}`;
      toast.success('Email client opened');
    } else {
      toast.error('Supplier email not found');
    }
  };

  const handleExportPO = (order: PurchaseOrder) => {
    const csvContent = [
      ['Purchase Order', order.orderNumber],
      ['Supplier', order.supplierName],
      ['Order Date', formatDate(order.orderDate)],
      ['Expected Delivery', order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'N/A'],
      ['Status', order.status],
      ['Total Amount', formatCurrency(order.totalAmount)],
      [''],
      ['Items'],
      ['Item Name', 'SKU', 'Quantity', 'Unit Cost', 'Total Cost'],
      ...order.items.map(item => [
        item.itemName,
        item.sku,
        item.quantityOrdered.toString(),
        formatCurrency(item.unitCost),
        formatCurrency(item.totalCost)
      ])
    ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PO_${order.orderNumber}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Purchase order exported successfully');
  };

  // Add item to PO form
  const handleAddItemToPO = () => {
    setPoFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), {
        inventoryItemId: '',
        quantity: 1,
        unitCost: 0
      }]
    }));
  };

  const handleRemoveItemFromPO = (index: number) => {
    setPoFormData(prev => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index) || []
    }));
  };

  const handleUpdatePOItem = (index: number, field: string, value: any) => {
    setPoFormData(prev => {
      const items = [...(prev.items || [])];
      if (field === 'inventoryItemId') {
        const selectedItem = inventoryItems.find(item => item.id === value);
        if (selectedItem) {
          items[index] = {
            ...items[index],
            inventoryItemId: value,
            itemName: selectedItem.name,
            sku: selectedItem.sku,
            unitCost: selectedItem.unitCost
          };
          // stock-selected item; no error handling needed here
        }
      } else {
        items[index] = {
          ...items[index],
          [field]: value
        };
      }
      return { ...prev, items };
    });
  };

  // Persist items in session until submission
  useEffect(() => {
    if (poFormData.items) {
      sessionStorage.setItem('po-draft-items', JSON.stringify(poFormData.items))
    }
  }, [poFormData.items])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'partially_received': return 'bg-orange-100 text-orange-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate totals for current PO form
  const calculatePOTotals = () => {
    const subtotal = (poFormData.items || []).reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unitCost || 0)
      return sum + itemTotal
    }, 0)
    const taxAmount = subtotal * 0.20
    const totalAmount = subtotal + taxAmount
    return { subtotal, taxAmount, totalAmount }
  }

  const totals = calculatePOTotals();

  const openInventoryModal = () => {
    console.log('[analytics] open_inventory_modal')
    setInvModalLoading(true)
    try {
      setShowInventoryModal(true)
      setInvModalLoading(false)
      setInvModalError(null)
    } catch (e: any) {
      setInvModalError('Failed to load inventory')
      setInvModalLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('poManagement.cards.totalPOs')}</p>
              <p className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('poManagement.cards.pendingOrders')}</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('poManagement.cards.overdueOrders')}</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdueOrders}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('poManagement.cards.totalValue')}</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(filteredPOs.reduce((sum, order) => sum + order.totalAmount, 0))}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Alerts for Overdue Orders */}
      {filteredPOs.filter(order => isOverdue(order.expectedDeliveryDate || order.orderDate, order.status)).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-medium text-red-800">{t('poManagement.alerts.overdueTitle')} ({filteredPOs.filter(order => isOverdue(order.expectedDeliveryDate || order.orderDate, order.status)).length})</h3>
            </div>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {filteredPOs
              .filter(order => isOverdue(order.expectedDeliveryDate || order.orderDate, order.status))
              .slice(0, 5)
              .map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <span className="text-red-700">
                    {order.orderNumber} - {order.supplierName} ({t('poManagement.table.columns.expectedDelivery')}: {formatDate(order.expectedDeliveryDate || order.orderDate)})
                  </span>
                  <button
                    onClick={() => handleReceivePO(order)}
                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                  >
                    {t('poManagement.actions.receive')}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Search and Action Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={t('poManagement.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              {t('poManagement.actions.filters')}
            </button>

            <button
              onClick={handleAddPO}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('poManagement.actions.newPO')}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('poManagement.table.columns.status')}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('jobOrders.filters.allStatus')}</option>
                  <option value="draft">{t('poManagement.statusText.draft')}</option>
                  <option value="pending">{t('poManagement.statusText.pending')}</option>
                  <option value="sent">{t('poManagement.statusText.sent')}</option>
                  <option value="confirmed">{t('poManagement.statusText.confirmed')}</option>
                  <option value="partially_received">{t('poManagement.statusText.partially_received')}</option>
                  <option value="received">{t('poManagement.statusText.received')}</option>
                  <option value="cancelled">{t('poManagement.statusText.cancelled')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventoryManagement.filtersPanel.supplier')}</label>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('inventoryManagement.filtersPanel.supplier')}</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.recentInvoices') /* placeholder */}</label>
                <input
                  type="date"
                  value={dateRangeFilter.from}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.recentJobs') /* placeholder */}</label>
                <input
                  type="date"
                  value={dateRangeFilter.to}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSupplierFilter('all');
                  setDateRangeFilter({ from: '', to: '' });
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('inventoryManagement.filtersPanel.clearAll')}
              </button>
              <div className="text-sm text-gray-500">
                {t('inventoryManagement.filtersPanel.showing')} {filteredPOs.length} / {purchaseOrders.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('poManagement.table.columns.poNumber')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('poManagement.table.columns.supplier')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('poManagement.table.columns.orderDate')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('poManagement.table.columns.expectedDelivery')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('poManagement.table.columns.status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('poManagement.table.columns.items')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('poManagement.table.columns.totalAmount')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('poManagement.table.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPOs.map((order) => (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isOverdue(order.expectedDeliveryDate || order.orderDate, order.status) ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.orderNumber}
                    {order.referenceNumber && (
                      <div className="text-xs text-gray-500">Ref: {order.referenceNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{order.supplierName}</div>
                        {order.supplierId && (
                          <div className="text-xs text-gray-500">
                            {suppliers.find(s => s.id === order.supplierId)?.contactPerson}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(order.orderDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {order.expectedDeliveryDate ? (
                      <span className={isOverdue(order.expectedDeliveryDate, order.status) ? 'text-red-600 font-medium' : ''}>
                        {formatDate(order.expectedDeliveryDate)}
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{order.items.length} {t('poManagement.table.itemsCountSuffix')}</div>
                        <div className="text-xs text-gray-500">
                          {order.items.reduce((sum, item) => sum + item.quantityReceived, 0)} / {order.items.reduce((sum, item) => sum + item.quantityOrdered, 0)} {t('poManagement.table.receivedSuffix')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewPO(order)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title={t('poManagement.tooltips.viewDetails')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleMarkAsSent(order)}
                          className="p-1 text-green-600 hover:text-green-800 transition-colors"
                          title={t('poManagement.tooltips.markSent')}
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      
                      {(order.status === 'pending' || order.status === 'sent' || order.status === 'confirmed') && (
                        <button
                          onClick={() => handleReceivePO(order)}
                          className="p-1 text-orange-600 hover:text-orange-800 transition-colors"
                          title={t('poManagement.tooltips.receiveItems')}
                        >
                          <Package className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handlePrintPO(order)}
                        className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                        title={t('poManagement.tooltips.printPO')}
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleEmailPO(order)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title={t('poManagement.tooltips.emailPO')}
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleExportPO(order)}
                        className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                        title={t('poManagement.tooltips.exportPO')}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      
                      {currentUserRole === 'admin' && (
                        <>
                          <button
                          onClick={() => handleEditPO(order)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title={t('poManagement.tooltips.editPO')}
                          disabled={order.status === 'cancelled' || order.status === 'received'}
                        >
                          <Edit className={`h-4 w-4 ${order.status === 'cancelled' || order.status === 'received' ? 'text-gray-400' : ''}`} />
                        </button>
                        
                        {/* Status Change Shortcut */}
                        <div className="relative inline-flex items-center">
                          <select
                            value={order.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as any;
                              updatePurchaseOrder(order.id, { status: newStatus });
                              toast.success(t('poManagement.modal.success.updated'));
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            title={t('poManagement.tooltips.changeStatus')}
                          >
                            <option value="pending">{t('poManagement.statusText.pending')}</option>
                            <option value="sent">{t('poManagement.statusText.sent')}</option>
                            <option value="confirmed">{t('poManagement.statusText.confirmed')}</option>
                            <option value="partially_received">{t('poManagement.statusText.partially_received')}</option>
                            <option value="received">{t('poManagement.statusText.received')}</option>
                            <option value="cancelled">{t('poManagement.statusText.cancelled')}</option>
                          </select>
                          <button className="p-1 text-gray-600 hover:text-gray-800 transition-colors">
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                          
                          <button
                            onClick={() => handleDeletePO(order)}
                            className="px-2 py-1 text-red-600 hover:text-red-800 transition-colors border border-red-300 rounded"
                            title={t('poManagement.tooltips.deletePO')}
                          >
                            <span className="inline-flex items-center gap-1">
                              <Trash2 className="h-4 w-4" />
                              {t('poManagement.tooltips.deletePO')}
                            </span>
                          </button>
                        </>
                      )}
                      
                      {(order.status === 'pending' || order.status === 'sent') && (
                        <button
                          onClick={() => handleCancelPO(order)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        title={t('poManagement.tooltips.cancelPO')}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPOs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">{t('poManagement.empty.noPOs')}</p>
            <p className="text-sm">{t('poManagement.empty.adjustFilters')}</p>
          </div>
        )}
      </div>

      {/* Add/Edit PO Modal */}
      {(showAddPOModal || showEditPOModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {showEditPOModal ? t('poManagement.modal.editTitle') : t('poManagement.modal.createTitle')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('poManagement.modal.supplier')}</label>
                <select
                  value={poFormData.supplierId || ''}
                  onChange={(e) => setPoFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={showEditPOModal}
                >
                  <option value="">{t('poManagement.modal.selectSupplier')}</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('poManagement.modal.expectedDate')}</label>
                <input
                  type="date"
                  value={poFormData.expectedDeliveryDate || ''}
                  onChange={(e) => setPoFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('poManagement.modal.reference')}</label>
                <input
                  type="text"
                  value={poFormData.referenceNumber || ''}
                  onChange={(e) => setPoFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('poManagement.modal.reference')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('poManagement.modal.notes')}</label>
                <textarea
                  value={poFormData.notes || ''}
                  onChange={(e) => setPoFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('poManagement.modal.notes')}
                  rows={2}
                />
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-medium text-gray-900">{t('poManagement.modal.items')}</h3>
                <button
                  onClick={handleAddItemToPO}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {t('poManagement.modal.addItem')}
                </button>
                <button
                  onClick={openInventoryModal}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Stock Items"
                >
                  <Package className="h-4 w-4" />
                  <span>Stock Items</span>
                </button>
              </div>
              <div className="mb-3">
                <button onClick={() => setBulkSelectOpen(!bulkSelectOpen)} className="text-xs px-2 py-1 border rounded-md hover:bg-gray-50">
                  {bulkSelectOpen ? 'Close Bulk Add' : 'Bulk Add from Inventory'}
                </button>
                {bulkSelectOpen && (
                  <div className="mt-2 border rounded-md p-3">
                    <div role="listbox" aria-label="Inventory items" className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {inventoryItems.map(inv => (
                        <label key={inv.id} className="flex items-start gap-2 p-2 border rounded-md hover:bg-gray-50">
                          <input type="checkbox" checked={!!bulkSelectedIds[inv.id]} onChange={(e) => setBulkSelectedIds(prev => ({ ...prev, [inv.id]: e.target.checked }))} aria-label={`Select ${inv.name}`} />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{inv.name} ({inv.sku})</div>
                            <div className="text-gray-600">{inv.description}</div>
                            <div className="text-gray-500">Qty: {inv.quantity}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => {
                          const ids = Object.entries(bulkSelectedIds).filter(([, v]) => v).map(([id]) => id)
                          if (ids.length === 0) return
                          setPoFormData(prev => ({
                            ...prev,
                            items: [
                              ...((prev.items || [])),
                              ...ids.map(id => ({ inventoryItemId: id, quantity: 1, unitCost: inventoryItems.find(i => i.id === id)?.unitCost || 0 }))
                            ]
                          }))
                          setBulkSelectedIds({})
                          setBulkSelectOpen(false)
                        }}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add Selected
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {poFormData.items?.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('poManagement.modal.item')}</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={itemSearchQueries[index] ?? ''}
                          onChange={(e) => {
                            const q = e.target.value
                            setItemSearchQueries(prev => ({ ...prev, [index]: q }))
                            setItemLookupOpen(prev => ({ ...prev, [index]: q.length >= 1 }))
                            // Update item name for manual entry
                            handleUpdatePOItem(index, 'itemName', q)
                          }}
                          onFocus={() => setItemLookupOpen(prev => ({ ...prev, [index]: true }))}
                          onKeyDown={(e) => {
                            const open = itemLookupOpen[index]
                            const q = itemSearchQueries[index] ?? ''
                            const results = (inventoryItems || []).filter(i => {
                              const term = q.trim().toLowerCase()
                              return i.name?.toLowerCase().includes(term) || i.sku?.toLowerCase().includes(term)
                            }).slice(0, 8)
                            if (!open || results.length === 0) return
                            if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              setItemLookupHighlight(prev => ({ ...prev, [index]: Math.min((prev[index] ?? -1) + 1, results.length - 1) }))
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              setItemLookupHighlight(prev => ({ ...prev, [index]: Math.max((prev[index] ?? 0) - 1, 0) }))
                            } else if (e.key === 'Enter') {
                              e.preventDefault()
                              const hi = itemLookupHighlight[index] ?? 0
                              const chosen = results[hi]
                              if (chosen) {
                                handleUpdatePOItem(index, 'inventoryItemId', chosen.id)
                                setItemSearchQueries(prev => ({ ...prev, [index]: `${chosen.name} (${chosen.sku})` }))
                                setItemLookupOpen(prev => ({ ...prev, [index]: false }))
                              }
                            } else if (e.key === 'Escape') {
                              setItemLookupOpen(prev => ({ ...prev, [index]: false }))
                            }
                          }}
                          aria-label="Search inventory items"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Search or enter item name"
                          required
                        />
                        {itemLookupOpen[index] && (
                          <div role="listbox" aria-label="Inventory results" className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-48 overflow-auto">
                            {((inventoryItems || []).filter(i => {
                              const term = (itemSearchQueries[index] ?? '').trim().toLowerCase()
                              return i.name?.toLowerCase().includes(term) || i.sku?.toLowerCase().includes(term)
                            }).slice(0, 8)).map((invItem, idx) => (
                              <button
                                key={invItem.id}
                                role="option"
                                aria-selected={(itemLookupHighlight[index] ?? -1) === idx}
                                onClick={() => {
                                  handleUpdatePOItem(index, 'inventoryItemId', invItem.id)
                                  setItemSearchQueries(prev => ({ ...prev, [index]: `${invItem.name} (${invItem.sku})` }))
                                  setItemLookupOpen(prev => ({ ...prev, [index]: false }))
                                }}
                                className={`w-full text-left p-2 text-sm ${((itemLookupHighlight[index] ?? -1) === idx) ? 'bg-blue-50' : ''} hover:bg-blue-50`}
                              >
                                <div className="flex justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">{invItem.name} ({invItem.sku})</div>
                                    <div className="text-xs text-gray-600 truncate">{invItem.description}</div>
                                  </div>
                                  <div className="text-right text-xs text-gray-700">Qty: {invItem.quantity}</div>
                                </div>
                              </button>
                            ))}
                            <button
                              onClick={() => setItemLookupOpen(prev => ({ ...prev, [index]: false }))}
                              className="w-full text-left p-2 text-xs text-gray-500 hover:bg-gray-50"
                            >
                              Close
                            </button>
                          </div>
                        )}
                        <div className="mt-1 text-xs">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full ${item.inventoryItemId ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {item.inventoryItemId ? 'Stock' : 'Manuel'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('poManagement.modal.quantity')}</label>
                      <input
                        type="number"
                        value={item.quantity || 1}
                        onChange={(e) => handleUpdatePOItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('poManagement.modal.unitCost')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitCost || 0}
                        onChange={(e) => handleUpdatePOItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                        required
                      />
                      {!item.inventoryItemId && (item.unitCost ?? 0) === 0 && (
                        <div className="mt-1 text-xs text-red-600">Please set unit cost for manual items</div>
                      )}
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={() => handleRemoveItemFromPO(index)}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {(!poFormData.items || poFormData.items.length === 0) && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No items added yet</p>
                  <button
                    onClick={handleAddItemToPO}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Add your first item
                  </button>
                </div>
              )}
            </div>

            {/* Totals */}
            {poFormData.items && poFormData.items.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
                  <div>
                    <div className="text-sm text-gray-600">Subtotal</div>
                    <div className="font-semibold">{formatCurrency(totals.subtotal)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Tax (10%)</div>
                    <div className="font-semibold">{formatCurrency(totals.taxAmount)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total</div>
                    <div className="font-semibold text-lg text-blue-600">{formatCurrency(totals.totalAmount)}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddPOModal(false);
                  setShowEditPOModal(false);
                  setSelectedPO(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('poManagement.modal.cancel')}
              </button>
              <button
                onClick={() => handleSubmitPOForm(showEditPOModal)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {showEditPOModal ? t('poManagement.modal.update') : t('poManagement.modal.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Items Modal */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{t('poManagement.tooltips.receiveItems')} - {selectedPO.orderNumber}</h2>
            
            <div className="space-y-4 mb-6">
              {selectedPO.items.map((item) => {
                // Resolve inventoryItemId
                const invItem = item.inventoryItemId 
                  ? inventoryItems.find(i => i.id === item.inventoryItemId)
                  : inventoryItems.find(i => i.sku === item.sku);
                const resolvedId = invItem?.id || item.inventoryItemId || '';

                const remainingQty = item.quantityOrdered - item.quantityReceived;
                const currentReceiveItem = receiveItems.find(ri => ri.inventoryItemId === resolvedId);
                
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                        <div className="text-sm text-gray-500">
                          Ordered: {item.quantityOrdered} | Received: {item.quantityReceived} | Remaining: {remainingQty}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{t('supplierInvoiceDetail.items.unitCost' /* if exists */) || 'Unit Cost'}</div>
                        <div className="font-medium">{formatCurrency(item.unitCost)}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('poManagement.tooltips.receiveItems')}</label>
                        <input
                          type="number"
                          value={currentReceiveItem?.quantity || 0}
                          onChange={(e) => {
                            const newReceiveItems = [...receiveItems];
                            const existingIndex = newReceiveItems.findIndex(ri => ri.inventoryItemId === resolvedId);
                            if (existingIndex >= 0) {
                              newReceiveItems[existingIndex].quantity = parseInt(e.target.value) || 0;
                            } else {
                              newReceiveItems.push({
                                inventoryItemId: resolvedId,
                                quantity: parseInt(e.target.value) || 0,
                                batchNumber: '',
                                expiryDate: '',
                                unitCost: item.unitCost
                              });
                            }
                            setReceiveItems(newReceiveItems);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          min="0"
                          max={remainingQty}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                        <input
                          type="text"
                          value={currentReceiveItem?.batchNumber || ''}
                          onChange={(e) => {
                            const newReceiveItems = [...receiveItems];
                            const existingIndex = newReceiveItems.findIndex(ri => ri.inventoryItemId === resolvedId);
                            if (existingIndex >= 0) {
                              newReceiveItems[existingIndex].batchNumber = e.target.value;
                            } else {
                              newReceiveItems.push({
                                inventoryItemId: resolvedId,
                                quantity: 0,
                                batchNumber: e.target.value,
                                expiryDate: '',
                                unitCost: item.unitCost
                              });
                            }
                            setReceiveItems(newReceiveItems);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional batch number"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={currentReceiveItem?.expiryDate || ''}
                          onChange={(e) => {
                            const newReceiveItems = [...receiveItems];
                            const existingIndex = newReceiveItems.findIndex(ri => ri.inventoryItemId === resolvedId);
                            if (existingIndex >= 0) {
                              newReceiveItems[existingIndex].expiryDate = e.target.value;
                            } else {
                              newReceiveItems.push({
                                inventoryItemId: resolvedId,
                                quantity: 0,
                                batchNumber: '',
                                expiryDate: e.target.value,
                                unitCost: item.unitCost
                              });
                            }
                            setReceiveItems(newReceiveItems);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowReceiveModal(false);
                  setSelectedPO(null);
                  setReceiveItems([]);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('inventoryManagement.empty.clearFilters')}
              </button>
              <button
                onClick={handleSubmitReceive}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {t('poManagement.tooltips.receiveItems')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 id="inventory-modal-title" className="text-lg font-semibold">Stock Items</h2>
              <button onClick={() => { setShowInventoryModal(false); setInvModalSelected({}); setInvModalSearch(''); setInvHighlightIdx(-1); console.log('[analytics] close_inventory_modal') }} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={invModalSearch}
                onChange={(e) => { setInvModalSearch(e.target.value); setInvHighlightIdx(-1) }}
                onKeyDown={(e) => {
                  const results = (inventoryItems || []).filter(i => {
                    const term = invModalSearch.trim().toLowerCase()
                    return i.name?.toLowerCase().includes(term) || i.sku?.toLowerCase().includes(term)
                  })
                  if (e.key === 'ArrowDown') { e.preventDefault(); setInvHighlightIdx(prev => Math.min(prev + 1, results.length - 1)) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setInvHighlightIdx(prev => Math.max(prev - 1, 0)) }
                  else if (e.key === 'Enter') {
                    e.preventDefault();
                    const chosen = results[Math.max(invHighlightIdx, 0)]
                    if (chosen) {
                      setInvModalSelected(prev => ({ ...prev, [chosen.id]: !prev[chosen.id] }))
                      console.log('[analytics] toggle_select_inventory', { id: chosen.id })
                    }
                  } else if (e.key === 'Escape') {
                    setShowInventoryModal(false)
                  }
                }}
                placeholder="Search stock items"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Search stock items"
              />
            </div>
            {invModalLoading && (
              <div className="p-4 text-sm text-gray-600">Loading inventory…</div>
            )}
            {invModalError && (
              <div className="p-4 text-sm text-red-600">{invModalError}</div>
            )}
            {!invModalLoading && !invModalError && (
              <div role="listbox" aria-label="Inventory list" className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {(inventoryItems || []).filter(i => {
                  const term = invModalSearch.trim().toLowerCase()
                  return !term || i.name?.toLowerCase().includes(term) || i.sku?.toLowerCase().includes(term) || i.description?.toLowerCase().includes(term)
                }).map((invItem, idx) => (
                  <label key={invItem.id} className={`flex items-start gap-2 p-3 border rounded-md hover:bg-gray-50 ${invHighlightIdx === idx ? 'bg-blue-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!!invModalSelected[invItem.id]}
                      onChange={(e) => { setInvModalSelected(prev => ({ ...prev, [invItem.id]: e.target.checked })); console.log('[analytics] select_inventory', { id: invItem.id, checked: e.target.checked }) }}
                      aria-label={`Select ${invItem.name}`}
                    />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{invItem.name} ({invItem.sku})</div>
                      <div className="text-gray-600">{invItem.description}</div>
                      <div className="text-gray-500">Qty: {invItem.quantity}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => { setShowInventoryModal(false); console.log('[analytics] cancel_inventory_modal') }} className="px-3 py-1 border rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => {
                  const ids = Object.entries(invModalSelected).filter(([, v]) => v).map(([id]) => id)
                  if (ids.length === 0) return
                  setPoFormData(prev => ({
                    ...prev,
                    items: [
                      ...((prev.items || [])),
                      ...ids.map(id => ({ inventoryItemId: id, quantity: 1, unitCost: inventoryItems.find(i => i.id === id)?.unitCost || 0 }))
                    ]
                  }))
                  console.log('[analytics] add_selected_inventory', { count: ids.length })
                  setShowInventoryModal(false)
                  setInvModalSelected({})
                  setInvModalSearch('')
                  setInvHighlightIdx(-1)
                }}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Add Selected Stock Items"
              >
                <span className="inline-flex items-center gap-2"><Package className="h-4 w-4" /> Stock Items</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Detail Modal */}
      {showDetailModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">{t('poManagement.detail.title')} - {selectedPO.orderNumber}</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex justify-end mb-4">
              <button
                onClick={() => handlePrintPO()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Printer className="h-4 w-4" />
                {t('poManagement.tooltips.printPO')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">{t('poManagement.detail.orderInfo')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('poManagement.detail.orderNumber')}:</span>
                    <span className="font-medium">{selectedPO.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('poManagement.detail.reference')}:</span>
                    <span className="font-medium">{selectedPO.referenceNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('poManagement.table.columns.orderDate')}:</span>
                    <span className="font-medium">{formatDate(selectedPO.orderDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('poManagement.table.columns.expectedDelivery')}:</span>
                    <span className="font-medium">
                      {selectedPO.expectedDeliveryDate ? formatDate(selectedPO.expectedDeliveryDate) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPO.status)}`}>
                      {getStatusText(selectedPO.status)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">{t('poManagement.detail.supplierInfo')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('poManagement.table.columns.supplier')}:</span>
                    <span className="font-medium">{selectedPO.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('supplierInvoiceDetail.paymentTerms' /* fallback */) || 'Payment Terms'}:</span>
                    <span className="font-medium">{selectedPO.paymentTerms}</span>
                  </div>
                  {selectedPO.supplierId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('poManagement.detail.contact')}:</span>
                      <span className="font-medium">
                        {suppliers.find(s => s.id === selectedPO.supplierId)?.contactPerson}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">{t('poManagement.detail.itemsTitle')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPO.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.itemName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.quantityOrdered}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.quantityReceived}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.unitCost)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatCurrency(item.totalCost)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === 'received' ? 'bg-green-100 text-green-800' :
                            item.status === 'partially_received' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status?.replace('-', ' ').toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
                <div>
                  <div className="text-sm text-gray-600">{t('poManagement.detail.subtotal')}</div>
                  <div className="font-semibold">{formatCurrency(selectedPO.subtotal)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('poManagement.detail.tax')}</div>
                  <div className="font-semibold">{formatCurrency(selectedPO.taxAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('poManagement.detail.shipping')}</div>
                  <div className="font-semibold">{formatCurrency(selectedPO.shippingCost)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('poManagement.detail.total')}</div>
                  <div className="font-semibold text-lg text-blue-600">{formatCurrency(selectedPO.totalAmount)}</div>
                </div>
              </div>
            </div>
            
            {selectedPO.notes && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">{t('poManagement.detail.notes')}</h4>
                <p className="text-sm text-blue-800">{selectedPO.notes}</p>
              </div>
            )}

            <div className="mt-6 flex justify-between gap-3 border-t pt-4">
              <div className="flex gap-3">
                {currentUserRole === 'admin' && (
                  <button
                    onClick={() => handleDeletePO(selectedPO)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    title="Delete Purchase Order"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('poManagement.tooltips.deletePO')}
                  </button>
                )}
                {(selectedPO.status === 'pending' || selectedPO.status === 'sent') && (
                  <button
                    onClick={() => handleCancelPO(selectedPO)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    title="Cancel Purchase Order"
                  >
                    <XCircle className="h-4 w-4" />
                    {t('poManagement.tooltips.cancelPO')}
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  navigate(`/supplier-delivery-notes/new?po_id=${selectedPO.id}`);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Convert to Delivery Note"
              >
                <FileText className="h-4 w-4" />
                Convert to Delivery Note
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Printable Component */}
      {printPO && (
        <PrintablePurchaseOrder order={printPO} />
      )}
    </div>
  );
};
