import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'
import { t } from '../i18n';
import { useLangStore } from '../stores/langStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { PurchaseOrderManagement } from './PurchaseOrderManagement';
import { ReturnOrderManagement } from './ReturnOrderManagement';
import { SupplierInvoiceManagement, SupplierPaymentManagement } from './SupplierInvoiceManagement';
import { SupplierManagement } from './SupplierManagement';
import DeliveryNoteList from './supplier-delivery-notes/DeliveryNoteList';
import { 
  InventoryItem, 
  InventoryFormData, 
  StockOperationFormData, 
  StockTransferFormData, 
  InventoryFilter, 
  InventorySort
} from '../types/inventory';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  AlertTriangle, 
  MapPin, 
  History, 
  Package, 
  ArrowUp, 
  ArrowDown,
  X,
  Check,
  DollarSign,
  Building,
  Box,
  Eye,
  Scan,
  FileText,
  RotateCcw,
  Receipt,
  Users
} from 'lucide-react';

interface InventoryManagementProps {
  currentUserRole: 'admin' | 'staff';
  currentUserId: string;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  currentUserRole,
  currentUserId
}) => {
  const {
    inventoryItems,
    suppliers,
    stockAlerts,
    filters,
    sort,
    searchTerm,
    isLoading,
    setFilters,
    setSort,
    setSearchTerm,
    getFilteredAndSortedItems,
    getInventoryStats,
    getStockHistory,
    getWhereUsed,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    performStockOperation,
    transferStock,
    dismissAlert,
    resolveAlert,
    lookupByBarcode,
    fetchInventoryItems,
    fetchSuppliers
  } = useInventoryStore();

  useEffect(() => {
    fetchInventoryItems();
    fetchSuppliers();
  }, []);

  // Debug: Track data synchronization and differences between interfaces
  useEffect(() => {
    console.log('=== INVENTORY MANAGEMENT DATA SYNC DEBUG ===')
    console.log('Management - inventoryItems count:', inventoryItems.length)
    console.log('Management - stockAlerts count:', stockAlerts.length)
    console.log('Management - filters:', filters)
    console.log('Management - isLoading:', isLoading)
    console.log('Management - First 3 inventory items:', inventoryItems.slice(0, 3))
    console.log('Management - First 3 stockAlerts:', stockAlerts.slice(0, 3))
    console.log('=== END MANAGEMENT DEBUG ===')
  }, [inventoryItems, stockAlerts, filters, isLoading]);

  useEffect(() => {
    const w = window as any
    w.__UI_SNAPSHOTS__ = w.__UI_SNAPSHOTS__ || {}
    w.__UI_SNAPSHOTS__.management = {
      displayedItems: getFilteredAndSortedItems(),
      filters,
      searchTerm,
      sort,
      timestamp: Date.now()
    }
  }, [inventoryItems, filters, searchTerm, sort])

  // State management
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchase-orders' | 'returns' | 'supplier-invoices' | 'supplier-payments' | 'suppliers' | 'delivery-notes'>('inventory');
  const location = useLocation()
  const [showFilters, setShowFilters] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showStockOperationModal, setShowStockOperationModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showWhereUsedModal, setShowWhereUsedModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedStockOperation, setSelectedStockOperation] = useState<'stock_in' | 'stock_out' | 'adjustment' | 'transfer'>('stock_in');
  
  // Filter states
  const [localFilters, setLocalFilters] = useState<InventoryFilter>(filters);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  
  const [localSort, setLocalSort] = useState<InventorySort>(sort);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      localFilters.searchTerm !== '' ||
      localFilters.stockLevel !== 'all' ||
      (localFilters.status && localFilters.status.length > 0 && localFilters.status.length < 3) || // Not showing all status types
      (localFilters.category && localFilters.category.length > 0) ||
      (localFilters.supplier && localFilters.supplier.length > 0) ||
      (localFilters.location && localFilters.location.length > 0)
    );
  };

  // Form states
  const [itemFormData, setItemFormData] = useState<Partial<InventoryFormData>>({});
  const [stockOperationFormData, setStockOperationFormData] = useState<Partial<StockOperationFormData>>({});
  const [transferFormData, setTransferFormData] = useState<Partial<StockTransferFormData>>({});
  const [barcodeInput, setBarcodeInput] = useState('');

  // Stats and data
  const stats = getInventoryStats();
  const filteredItems = getFilteredAndSortedItems();

  const getSupplierName = (item: InventoryItem) => {
    const supplier = suppliers.find(s => s.id === item.supplierId);
    return supplier?.name || item.supplierName || 'N/A';
  };

  // Initialize filters
  useEffect(() => {
    setFilters(localFilters);
  }, [localFilters, setFilters]);

  useEffect(() => {
    setSearchTerm(localSearchTerm);
  }, [localSearchTerm, setSearchTerm]);

  useEffect(() => {
    setSort(localSort);
  }, [localSort, setSort]);

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab') as any
    if (tab === 'supplier-invoices' || tab === 'supplier-payments' || tab === 'inventory' || tab === 'purchase-orders' || tab === 'returns' || tab === 'suppliers' || tab === 'delivery-notes') {
      setActiveTab(tab)
    }
    const category = params.get('category')
    if (category) {
      setActiveTab('inventory')
      setLocalFilters((prev) => ({
        ...prev,
        category: [category],
        status: prev.status && prev.status.length > 0 ? prev.status : ['active', 'low_stock', 'out_of_stock'],
        stockLevel: prev.stockLevel || 'all'
      }))
    }
    const sku = params.get('sku')
    if (sku) {
      setActiveTab('inventory')
      setLocalFilters((prev) => ({
        ...prev,
        category: prev.category || [],
        supplier: prev.supplier || [],
        location: prev.location || [],
        status: prev.status && prev.status.length > 0 ? prev.status : ['active', 'low_stock', 'out_of_stock'],
        stockLevel: prev.stockLevel || 'all',
        searchTerm: sku
      }))
      setLocalSearchTerm(sku)
    }
  }, [location.search])

  // Formatting functions
  const formatCurrency = (amount: number) => {
    const { locale, currency } = useLangStore.getState();
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const { locale } = useLangStore.getState();
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  // Stock status functions
  const isLowStock = (item: InventoryItem) => item.quantity <= item.minimumStock;
  const isOutOfStock = (item: InventoryItem) => item.quantity === 0;

  // Action handlers
  const handleAddItem = () => {
    setItemFormData({});
    setShowAddItemModal(true);
  };

  const handleShowAllItems = () => {
    // Clear all filters to show all items
    setLocalFilters({
      searchTerm: '',
      stockLevel: 'all',
      status: ['active', 'low_stock', 'out_of_stock'],
      category: [],
      supplier: [],
      location: []
    });
    setLocalSearchTerm('');
    setSearchTerm('');
    setFilters({
      searchTerm: '',
      stockLevel: 'all',
      status: ['active', 'low_stock', 'out_of_stock'],
      category: [],
      supplier: [],
      location: []
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemFormData({
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      sellingPrice: item.sellingPrice,
      taxRate: item.taxRate,
      minimumStock: item.minimumStock,
      maximumStock: item.maximumStock,
      reorderPoint: item.reorderPoint,
      location: item.location,
      locationDetails: item.locationDetails,
      supplierId: item.supplierId,
      supplierSku: item.supplierSku,
      supplierPartNumber: item.supplierPartNumber,
      manufacturer: item.manufacturer,
      manufacturerPartNumber: item.manufacturerPartNumber,
      manufacturerWarrantyMonths: item.manufacturerWarrantyMonths,
      barcode: item.barcode,
      expiryDate: item.expiryDate,
      leadTimeDays: item.leadTimeDays,
      isTaxable: item.isTaxable,
      isTrackable: item.isTrackable,
      notes: item.notes,
      specifications: item.specifications,
      compatibility: item.compatibility,
      safetyInfo: item.safetyInfo,
      storageRequirements: item.storageRequirements
    });
    setShowEditItemModal(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (item.quantity > 0) {
      alert('Cannot delete item with existing stock. Please adjust stock to zero first.');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${item.name}? This action cannot be undone.`)) {
      await deleteInventoryItem(item.id);
    }
  };

  const handleStockOperation = (item: InventoryItem, operation: 'stock_in' | 'stock_out' | 'adjustment') => {
    setSelectedItem(item);
    setSelectedStockOperation(operation);
    setStockOperationFormData({
      operationType: operation,
      items: [{
        inventoryItemId: item.id,
        sku: item.sku,
        itemName: item.name,
        quantity: 0,
        unitCost: item.unitCost,
        fromLocation: item.location,
        toLocation: item.location
      }],
      reason: ''
    });
    setShowStockOperationModal(true);
  };

  const handleTransferStock = (item: InventoryItem) => {
    setSelectedItem(item);
    setTransferFormData({
      fromLocation: item.location,
      toLocation: '',
      items: [{
        inventoryItemId: item.id,
        quantity: 0,
        unitCost: item.unitCost
      }],
      reason: ''
    });
    setShowTransferModal(true);
  };

  const handleViewHistory = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
  };

  const handleViewWhereUsed = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowWhereUsedModal(true);
  };

  const handleBarcodeScan = () => {
    setBarcodeInput('');
    setShowBarcodeModal(true);
  };

  const handleBarcodeLookup = () => {
    if (!barcodeInput.trim()) return;
    
    const item = lookupByBarcode(barcodeInput.trim());
    if (item) {
      setSelectedItem(item);
      alert(`Found item: ${item.name} (${item.sku}) - Quantity: ${item.quantity}`);
    } else {
      alert('No item found with this barcode.');
    }
    setShowBarcodeModal(false);
  };

  const handleExportData = () => {
    const csvContent = [
      ['SKU', 'Name', 'Category', 'Quantity', 'Unit', 'Min Stock', 'Location', 'Supplier', 'Purchase Price', 'Sale Price', 'Tax Rate', 'Last Updated'],
      ...filteredItems.map(item => [
        item.sku,
        item.name,
        item.category,
        item.quantity.toString(),
        item.unit,
        item.minimumStock.toString(),
        item.location,
        item.supplierName || 'N/A',
        item.unitCost.toString(),
        item.sellingPrice.toString(),
        item.taxRate.toString(),
        formatDate(item.lastUpdated)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Form submission handlers
  const handleSubmitItemForm = async (isEdit: boolean) => {
    console.log('=== FORM SUBMISSION DEBUG START ===')
    console.log('isEdit:', isEdit)
    console.log('selectedItem:', selectedItem)
    console.log('itemFormData:', itemFormData)

    if (
      !itemFormData.sku ||
      !itemFormData.name ||
      !itemFormData.category ||
      !itemFormData.unit ||
      !itemFormData.location ||
      !itemFormData.supplierId
    ) {
      alert('Please fill all required fields, including supplier, before saving the item.')
      return
    }
    
    try {
      if (isEdit && selectedItem) {
        console.log('Updating existing item...')
        await updateInventoryItem(selectedItem.id, itemFormData);
        setShowEditItemModal(false);
      } else {
        console.log('Adding new item...')
        const result = await addInventoryItem(itemFormData as InventoryFormData);
        console.log('Add item result:', result)
        setShowAddItemModal(false);
      }
      setItemFormData({});
      setSelectedItem(null);
      console.log('=== FORM SUBMISSION DEBUG END ===')
    } catch (error) {
      console.error('Error saving item:', error)
      alert(`Error saving item: ${error}`);
    }
  };

  const handleSubmitStockOperation = async () => {
    try {
      await performStockOperation(stockOperationFormData as StockOperationFormData);
      setShowStockOperationModal(false);
      setStockOperationFormData({});
      setSelectedItem(null);
    } catch (error) {
      alert(`Error performing stock operation: ${error}`);
    }
  };

  const handleSubmitTransfer = async () => {
    try {
      await transferStock(transferFormData as StockTransferFormData);
      setShowTransferModal(false);
      setTransferFormData({});
      setSelectedItem(null);
    } catch (error) {
      alert(`Error performing transfer: ${error}`);
    }
  };

  // Filter handlers
  const clearFilters = () => {
    setLocalFilters({
      searchTerm: '',
      stockLevel: 'all',
      status: ['active'],
      category: [],
      supplier: [],
      location: []
    });
    setLocalSearchTerm('');
  };

  // Get unique values for filters
  const categories = Array.from(new Set(inventoryItems.map(item => item.category)));
  const locations = Array.from(new Set(inventoryItems.map(item => item.location).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('inventoryManagement.tabs.inventory')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('purchase-orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'purchase-orders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('inventoryManagement.tabs.purchaseOrders')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'returns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('inventoryManagement.tabs.returns')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('delivery-notes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'delivery-notes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('nav.deliveryNotes')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('supplier-invoices')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'supplier-invoices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              {t('inventoryManagement.tabs.supplierInvoices')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('supplier-payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'supplier-payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              {t('inventoryManagement.tabs.supplierPayments')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'suppliers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('inventoryManagement.tabs.suppliers')}
            </div>
          </button>
        </nav>
      </div>

      {/* Inventory Items Tab */}
      {activeTab === 'inventory' && (
        <>
          {/* Header with Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('inventoryDashboard.metrics.totalItems')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                </div>
                <Box className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('inventoryDashboard.metrics.totalValue')}</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('inventoryDashboard.metrics.lowStockItems')}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('inventoryDashboard.metrics.outOfStock')}</p>
                  <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
                </div>
                <Package className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

      {/* Alerts Section */}
      {stockAlerts.filter(alert => !alert.isResolved).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-medium text-yellow-800">{t('inventoryManagement.alerts.stockAlerts')} ({stockAlerts.filter(alert => !alert.isResolved).length})</h3>
            </div>
            <button
              onClick={() => stockAlerts.filter(alert => !alert.isResolved).forEach(alert => dismissAlert(alert.id))}
              className="text-yellow-600 hover:text-yellow-800 text-sm"
            >
              {t('inventoryManagement.actions.dismissAll')}
            </button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {stockAlerts.filter(alert => !alert.isResolved).slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span className="text-yellow-700">{alert.message}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="text-green-600 hover:text-green-800"
                    title={t('inventoryManagement.alerts.markResolved')}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-yellow-600 hover:text-yellow-800"
                    title={t('inventoryManagement.alerts.dismissAlert')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
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
                placeholder={t('inventoryManagement.searchPlaceholder')}
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
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
                  : hasActiveFilters()
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              {t('inventoryManagement.actions.filters')} {hasActiveFilters() && '•'}
            </button>

            <button
              onClick={handleBarcodeScan}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Scan className="h-4 w-4" />
              {t('inventoryManagement.actions.scan')}
            </button>

            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              {t('inventoryManagement.actions.export')}
            </button>

            {currentUserRole === 'admin' && (
              <button
                onClick={handleAddItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('inventoryManagement.actions.addItem')}
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventoryManagement.filtersPanel.category')}</label>
                <select
                  multiple
                  value={localFilters.category || []}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, category: Array.from(e.target.selectedOptions, option => option.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventoryManagement.filtersPanel.supplier')}</label>
                <select
                  multiple
                  value={localFilters.supplier || []}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, supplier: Array.from(e.target.selectedOptions, option => option.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventoryManagement.filtersPanel.location')}</label>
                <select
                  multiple
                  value={localFilters.location || []}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, location: Array.from(e.target.selectedOptions, option => option.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventoryManagement.filtersPanel.stockLevel')}</label>
                <select
                  value={localFilters.stockLevel || 'all'}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, stockLevel: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('inventoryManagement.filtersPanel.allItems')}</option>
                  <option value="in_stock">{t('inventoryManagement.filtersPanel.inStock')}</option>
                  <option value="low_stock">{t('inventoryManagement.filtersPanel.lowStock')}</option>
                  <option value="out_of_stock">{t('inventoryManagement.filtersPanel.outOfStock')}</option>
                  <option value="overstock">{t('inventoryManagement.filtersPanel.overstock')}</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('inventoryManagement.filtersPanel.clearAll')}
              </button>
              <div className="text-sm text-gray-500">
                {t('inventoryManagement.filtersPanel.showing')} {filteredItems.length} / {inventoryItems.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { field: 'sku', label: t('inventoryManagement.table.columns.skuCode') },
                  { field: 'name', label: t('inventoryManagement.table.columns.name') },
                  { field: 'category', label: t('inventoryManagement.table.columns.category') },
                  { field: 'quantity', label: t('inventoryManagement.table.columns.quantity') },
                  { field: 'unit', label: t('inventoryManagement.table.columns.unit') },
                  { field: 'minimumStock', label: t('inventoryManagement.table.columns.minStock') },
                  { field: 'location', label: t('inventoryManagement.table.columns.location') },
                  { field: 'supplierName', label: t('inventoryManagement.table.columns.supplier') },
                  { field: 'unitCost', label: t('inventoryManagement.table.columns.purchasePrice') },
                  { field: 'sellingPrice', label: t('inventoryManagement.table.columns.salePrice') },
                  { field: 'taxRate', label: t('inventoryManagement.table.columns.taxRate') },
                  { field: 'lastUpdated', label: t('inventoryManagement.table.columns.lastUpdated') }
                ].map(({ field, label }) => (
                  <th
                    key={field}
                    onClick={() => setLocalSort({ field: field as any, direction: localSort.field === field && localSort.direction === 'asc' ? 'desc' : 'asc' })}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {localSort.field === field && (
                        <span className="text-blue-600">
                          {localSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('inventoryManagement.table.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isOutOfStock(item) ? 'bg-red-50' : isLowStock(item) ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.sku}
                    {item.barcode && (
                      <div className="text-xs text-gray-500">{item.barcode}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                        )}
                      </div>
                      {isLowStock(item) && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      {isOutOfStock(item) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {t('inventoryManagement.table.badgeOut')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {item.category.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      isOutOfStock(item) ? 'text-red-600' : 
                      isLowStock(item) ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {item.unit}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.minimumStock}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      {item.location}
                      {item.locationDetails && (
                        <div className="text-xs text-gray-500">
                          {item.locationDetails.rack && `Rack ${item.locationDetails.rack}`}
                          {item.locationDetails.shelf && `Étagère ${item.locationDetails.shelf}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3 text-gray-400" />
                      {getSupplierName(item)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.unitCost)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.sellingPrice)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.taxRate}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.lastUpdated)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStockOperation(item, 'stock_in')}
                        className="p-1 text-green-600 hover:text-green-800 transition-colors"
                        title={t('inventoryManagement.actionsTitles.stockIn')}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleStockOperation(item, 'stock_out')}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        title={t('inventoryManagement.actionsTitles.stockOut')}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTransferStock(item)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title={t('inventoryManagement.actionsTitles.transferStock')}
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleViewHistory(item)}
                        className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                        title={t('inventoryManagement.actionsTitles.viewHistory')}
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleViewWhereUsed(item)}
                        className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                        title={t('inventoryManagement.actionsTitles.whereUsed')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {item.supplierId && (
                        <a
                          href={`/inventory/manage?tab=supplier-invoices&supplierId=${item.supplierId}`}
                          className="p-1 text-indigo-600 hover:text-indigo-800 transition-colors"
                          title={t('supplierManagement.actions.managePayments')}
                        >
                          <Receipt className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title={t('inventoryManagement.actionsTitles.editItem')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {currentUserRole === 'admin' && (
                        <button
                          onClick={() => handleDeleteItem(item)}
                          disabled={item.quantity > 0}
                          className={`p-1 transition-colors ${
                            item.quantity > 0 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-red-600 hover:text-red-800'
                          }`}
                          title={item.quantity > 0 ? t('inventoryManagement.actionsTitles.cannotDeleteWithStock') : t('inventoryManagement.actionsTitles.deleteItem')}
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

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>{t('inventoryManagement.empty.noItems')}</p>
            <div className="mt-2 space-x-2">
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                {t('inventoryManagement.empty.clearFilters')}
              </button>
              {hasActiveFilters() && (
                <>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={handleShowAllItems}
                    className="text-green-600 hover:text-green-800 transition-colors"
                  >
                    {t('inventoryManagement.empty.showAll')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals will be implemented in the next step */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Add New Inventory Item</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Basic Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Basic Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU/Code *</label>
                <input
                  type="text"
                  value={itemFormData.sku || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter SKU or item code"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={itemFormData.name || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={itemFormData.category || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  <option value="parts">Parts</option>
                  <option value="consumables">Consumables</option>
                  <option value="tools">Tools</option>
                  <option value="fluids">Fluids</option>
                  <option value="equipment">Equipment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={itemFormData.description || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item description"
                  rows={2}
                />
              </div>
              
              {/* Stock Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Stock Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  value={itemFormData.quantity || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                <select
                  value={itemFormData.unit || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, unit: e.target.value as InventoryFormData['unit'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Unit</option>
                  <option value="piece">Piece</option>
                  <option value="liter">Liter</option>
                  <option value="kg">Kilogram</option>
                  <option value="meter">Meter</option>
                  <option value="set">Set</option>
                  <option value="box">Box</option>
                  <option value="can">Can</option>
                  <option value="bottle">Bottle</option>
                  <option value="roll">Roll</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock *</label>
                <input
                  type="number"
                  value={itemFormData.minimumStock || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, minimumStock: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Stock</label>
                <input
                  type="number"
                  value={itemFormData.maximumStock || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, maximumStock: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                <input
                  type="number"
                  value={itemFormData.reorderPoint || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              {/* Pricing Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Pricing Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemFormData.unitCost || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemFormData.sellingPrice || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={itemFormData.taxRate || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={itemFormData.isTaxable || false}
                    onChange={(e) => setItemFormData(prev => ({ ...prev, isTaxable: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Item is Taxable
                </label>
              </div>
              
              {/* Location Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Location Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <input
                  type="text"
                  value={itemFormData.location || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Warehouse A, Store 1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rack</label>
                <input
                  type="text"
                  value={itemFormData.locationDetails?.rack || ''}
                  onChange={(e) => setItemFormData(prev => ({ 
                    ...prev, 
                    locationDetails: { ...prev.locationDetails, rack: e.target.value } 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Rack number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shelf</label>
                <input
                  type="text"
                  value={itemFormData.locationDetails?.shelf || ''}
                  onChange={(e) => setItemFormData(prev => ({ 
                    ...prev, 
                    locationDetails: { ...prev.locationDetails, shelf: e.target.value } 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Shelf number"
                />
              </div>
              
              {/* Supplier Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Supplier Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={itemFormData.supplierId || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier SKU</label>
                <input
                  type="text"
                  value={itemFormData.supplierSku || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, supplierSku: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Supplier's SKU"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Part Number</label>
                <input
                  type="text"
                  value={itemFormData.supplierPartNumber || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, supplierPartNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Supplier's part number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (Days)</label>
                <input
                  type="number"
                  value={itemFormData.leadTimeDays || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, leadTimeDays: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              {/* Additional Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Additional Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                <input
                  type="text"
                  value={itemFormData.barcode || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, barcode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Scan or enter barcode"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={itemFormData.manufacturer || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Manufacturer name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Part Number</label>
                <input
                  type="text"
                  value={itemFormData.manufacturerPartNumber || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, manufacturerPartNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Manufacturer's part number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty (Months)</label>
                <input
                  type="number"
                  value={itemFormData.manufacturerWarrantyMonths || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, manufacturerWarrantyMonths: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={itemFormData.isTrackable || false}
                    onChange={(e) => setItemFormData(prev => ({ ...prev, isTrackable: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Track Serial Numbers
                </label>
              </div>
              
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={itemFormData.notes || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitItemForm(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Inventory Item</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Basic Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Basic Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU/Code *</label>
                <input
                  type="text"
                  value={itemFormData.sku || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter SKU or item code"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={itemFormData.name || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={itemFormData.category || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  <option value="parts">Parts</option>
                  <option value="consumables">Consumables</option>
                  <option value="tools">Tools</option>
                  <option value="fluids">Fluids</option>
                  <option value="equipment">Equipment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={itemFormData.description || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter item description"
                  rows={2}
                />
              </div>
              
              {/* Stock Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Stock Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  value={itemFormData.quantity || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                <select
                  value={itemFormData.unit || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, unit: e.target.value as InventoryFormData['unit'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Unit</option>
                  <option value="piece">Piece</option>
                  <option value="liter">Liter</option>
                  <option value="kg">Kilogram</option>
                  <option value="meter">Meter</option>
                  <option value="set">Set</option>
                  <option value="box">Box</option>
                  <option value="can">Can</option>
                  <option value="bottle">Bottle</option>
                  <option value="roll">Roll</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock *</label>
                <input
                  type="number"
                  value={itemFormData.minimumStock || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, minimumStock: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Stock</label>
                <input
                  type="number"
                  value={itemFormData.maximumStock || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, maximumStock: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                <input
                  type="number"
                  value={itemFormData.reorderPoint || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              {/* Pricing Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Pricing Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemFormData.unitCost || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemFormData.sellingPrice || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={itemFormData.taxRate || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={itemFormData.isTaxable || false}
                    onChange={(e) => setItemFormData(prev => ({ ...prev, isTaxable: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Item is Taxable
                </label>
              </div>
              
              {/* Location Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Location Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <input
                  type="text"
                  value={itemFormData.location || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Warehouse A, Store 1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rack</label>
                <input
                  type="text"
                  value={itemFormData.locationDetails?.rack || ''}
                  onChange={(e) => setItemFormData(prev => ({ 
                    ...prev, 
                    locationDetails: { ...prev.locationDetails, rack: e.target.value } 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Rack number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shelf</label>
                <input
                  type="text"
                  value={itemFormData.locationDetails?.shelf || ''}
                  onChange={(e) => setItemFormData(prev => ({ 
                    ...prev, 
                    locationDetails: { ...prev.locationDetails, shelf: e.target.value } 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Shelf number"
                />
              </div>
              
              {/* Supplier Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Supplier Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={itemFormData.supplierId || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier SKU</label>
                <input
                  type="text"
                  value={itemFormData.supplierSku || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, supplierSku: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Supplier's SKU"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Part Number</label>
                <input
                  type="text"
                  value={itemFormData.supplierPartNumber || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, supplierPartNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Supplier's part number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (Days)</label>
                <input
                  type="number"
                  value={itemFormData.leadTimeDays || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, leadTimeDays: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              {/* Additional Information */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b">Additional Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                <input
                  type="text"
                  value={itemFormData.barcode || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, barcode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Scan or enter barcode"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={itemFormData.manufacturer || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Manufacturer name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Part Number</label>
                <input
                  type="text"
                  value={itemFormData.manufacturerPartNumber || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, manufacturerPartNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Manufacturer's part number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty (Months)</label>
                <input
                  type="number"
                  value={itemFormData.manufacturerWarrantyMonths || 0}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, manufacturerWarrantyMonths: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={itemFormData.isTrackable || false}
                    onChange={(e) => setItemFormData(prev => ({ ...prev, isTrackable: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Track Serial Numbers
                </label>
              </div>
              
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={itemFormData.notes || ''}
                  onChange={(e) => setItemFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowEditItemModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitItemForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showStockOperationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {selectedStockOperation === 'stock_in' ? 'Stock In' : 
               selectedStockOperation === 'stock_out' ? 'Stock Out' : 'Stock Adjustment'}
            </h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Item:</div>
                <div className="font-medium">{selectedItem?.name}</div>
                <div className="text-sm text-gray-500">SKU: {selectedItem?.sku}</div>
                <div className="text-sm text-gray-500">Current Stock: {selectedItem?.quantity} {selectedItem?.unit}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedStockOperation === 'stock_in' ? 'Quantity to Add' : 
                   selectedStockOperation === 'stock_out' ? 'Quantity to Remove' : 'New Quantity'}
                </label>
                <input
                  type="number"
                  value={stockOperationFormData.items?.[0]?.quantity || 0}
                  onChange={(e) => {
                    const quantity = parseInt(e.target.value) || 0;
                    setStockOperationFormData(prev => ({
                      ...prev,
                      items: [{
                        inventoryItemId: prev.items?.[0]?.inventoryItemId || '',
                        sku: prev.items?.[0]?.sku || '',
                        itemName: prev.items?.[0]?.itemName || '',
                        quantity: quantity,
                        unitCost: prev.items?.[0]?.unitCost,
                        fromLocation: prev.items?.[0]?.fromLocation,
                        toLocation: prev.items?.[0]?.toLocation
                      }]
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              {selectedStockOperation === 'stock_in' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stockOperationFormData.items?.[0]?.unitCost || 0}
                    onChange={(e) => {
                      const unitCost = parseFloat(e.target.value) || 0;
                      setStockOperationFormData(prev => ({
                        ...prev,
                        items: [{
                          inventoryItemId: prev.items?.[0]?.inventoryItemId || '',
                          sku: prev.items?.[0]?.sku || '',
                          itemName: prev.items?.[0]?.itemName || '',
                          quantity: prev.items?.[0]?.quantity || 0,
                          unitCost: unitCost,
                          fromLocation: prev.items?.[0]?.fromLocation,
                          toLocation: prev.items?.[0]?.toLocation
                        }]
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={stockOperationFormData.reason || ''}
                  onChange={(e) => setStockOperationFormData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter reason for this operation"
                  rows={2}
                />
              </div>
              
              {selectedStockOperation === 'stock_out' && selectedItem && stockOperationFormData.items?.[0]?.quantity && stockOperationFormData.items[0].quantity > selectedItem.quantity && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div className="text-sm text-red-800">
                      Warning: Attempting to remove more items than available in stock.
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowStockOperationModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitStockOperation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm Operation
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Transfer Stock</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Item:</div>
                <div className="font-medium">{selectedItem?.name}</div>
                <div className="text-sm text-gray-500">SKU: {selectedItem?.sku}</div>
                <div className="text-sm text-gray-500">Current Stock: {selectedItem?.quantity} {selectedItem?.unit}</div>
                <div className="text-sm text-gray-500">Current Location: {selectedItem?.location}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Location</label>
                <input
                  type="text"
                  value={transferFormData.fromLocation || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Location *</label>
                <input
                  type="text"
                  value={transferFormData.toLocation || ''}
                  onChange={(e) => setTransferFormData(prev => ({ ...prev, toLocation: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter destination location"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Transfer *</label>
                <input
                  type="number"
                  value={transferFormData.items?.[0]?.quantity || 0}
                  onChange={(e) => {
                    const quantity = parseInt(e.target.value) || 0;
                    setTransferFormData(prev => ({
                      ...prev,
                      items: [{
                        inventoryItemId: prev.items?.[0]?.inventoryItemId || '',
                        quantity: quantity,
                        unitCost: prev.items?.[0]?.unitCost,
                        notes: prev.items?.[0]?.notes
                      }]
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max={selectedItem?.quantity || 0}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={transferFormData.reason || ''}
                  onChange={(e) => setTransferFormData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter reason for transfer"
                  rows={2}
                />
              </div>
              
              {transferFormData.items?.[0]?.quantity && selectedItem?.quantity && transferFormData.items[0].quantity > selectedItem.quantity && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div className="text-sm text-red-800">
                      Warning: Cannot transfer more items than available in stock.
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTransfer}
                disabled={!transferFormData.toLocation || !transferFormData.items?.[0]?.quantity || transferFormData.items[0].quantity <= 0 || (selectedItem?.quantity && transferFormData.items[0].quantity > selectedItem.quantity) || false}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {showBarcodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Barcode Lookup</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter Barcode</label>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleBarcodeLookup()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBarcodeLookup}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Lookup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Stock History - {selectedItem.name}</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {getStockHistory(selectedItem.id).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No stock history available for this item.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getStockHistory(selectedItem.id).map((movement, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(movement.movementDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              movement.type === 'in' ? 'bg-green-100 text-green-800' :
                              movement.type === 'out' ? 'bg-red-100 text-red-800' :
                              movement.type === 'adjustment' ? 'bg-yellow-100 text-yellow-800' :
                              movement.type === 'transfer' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {movement.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(movement.unitCost || 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {movement.toLocation || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {movement.createdBy || 'System'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={movement.reason || ''}>
                              {movement.reason || 'N/A'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Where Used Modal */}
      {showWhereUsedModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Where Used - {selectedItem.name}</h2>
              <button
                onClick={() => setShowWhereUsedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {getWhereUsed(selectedItem.id).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>This item has not been used in any job orders yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Order</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Used</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Used</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getWhereUsed(selectedItem.id).map((usage, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {usage.jobOrderId}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {usage.customerName || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {usage.quantityUsed} {selectedItem.unit}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(usage.dateUsed || usage.movementDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {usage.technicianName || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              usage.jobOrderStatus === 'completed' ? 'bg-green-100 text-green-800' :
                              usage.jobOrderStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              usage.jobOrderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {(usage.jobOrderStatus || 'unknown').toUpperCase()}
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
        </div>
      )}
        </>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'purchase-orders' && (
        <PurchaseOrderManagement 
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      )}

      {/* Returns Tab */}
      {activeTab === 'returns' && (
        <ReturnOrderManagement 
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      )}

      {/* Delivery Notes Tab */}
      {activeTab === 'delivery-notes' && (
        <DeliveryNoteList />
      )}

      {/* Supplier Invoices Tab */}
      {activeTab === 'supplier-invoices' && (
        <SupplierInvoiceManagement 
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      )}

      {/* Supplier Payments Tab */}
      {activeTab === 'supplier-payments' && (
        <SupplierPaymentManagement 
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <SupplierManagement 
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};
