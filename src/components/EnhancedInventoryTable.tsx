import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../stores/inventoryStore';
import { formatCurrency } from '../utils/formatters';
import { InventoryItem, InventoryFilter, InventorySort, StockAlert } from '../types/inventory';
import { Search, Filter, Plus, Edit, Trash2, Download, AlertTriangle, MapPin, History, X, Scan } from 'lucide-react';

interface EnhancedInventoryTableProps {
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  onStockOperation: (item: InventoryItem, operation: 'stock_in' | 'stock_out' | 'adjustment') => void;
  onTransferStock: (item: InventoryItem) => void;
  onViewHistory: (item: InventoryItem) => void;
  onViewWhereUsed: (item: InventoryItem) => void;
  onExportData: () => void;
  onBarcodeScan: () => void;
  currentUserRole: 'admin' | 'staff';
}

export const EnhancedInventoryTable: React.FC<EnhancedInventoryTableProps> = ({
  onAddItem,
  onEditItem,
  onDeleteItem,
  onStockOperation,
  onTransferStock,
  onViewHistory,
  onExportData,
  currentUserRole
}) => {
  const {
    inventoryItems,
    isLoading,
    sort,
    searchTerm,
    stockAlerts,
    getFilteredAndSortedItems,
    setSearchTerm,
    setFilters,
    setSort,
    dismissAlert
  } = useInventoryStore();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [quantityRange, setQuantityRange] = useState({ min: '', max: '' });

  const filteredItems = getFilteredAndSortedItems();

  const categories = Array.from(new Set(inventoryItems.map((item: InventoryItem) => item.category))) as string[];
  const suppliers = Array.from(new Set(inventoryItems.map((item: InventoryItem) => item.supplierId))) as string[];
  const locations = Array.from(new Set(inventoryItems.map((item: InventoryItem) => item.location || ''))) as string[];

  useEffect(() => {
    const newFilter: InventoryFilter = {
      category: selectedCategory ? [selectedCategory] : undefined,
      supplier: selectedSupplier ? [selectedSupplier] : undefined,
      location: selectedLocation ? [selectedLocation] : undefined,
      stockLevel: stockStatusFilter as 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock' | undefined
    };

    // Add price range if specified
    if (priceRange.min || priceRange.max) {
      newFilter.priceRange = {
        min: priceRange.min ? parseFloat(priceRange.min) : 0,
        max: priceRange.max ? parseFloat(priceRange.max) : 999999
      };
    }

    // Add quantity range if specified
    if (quantityRange.min || quantityRange.max) {
      newFilter.quantityRange = {
        min: quantityRange.min ? parseInt(quantityRange.min) : 0,
        max: quantityRange.max ? parseInt(quantityRange.max) : 999999
      };
    }
    setFilters(newFilter);
  }, [selectedCategory, selectedSupplier, selectedLocation, stockStatusFilter, priceRange, quantityRange]);

  const handleSort = (field: string) => {
    const newSort: InventorySort = {
      field: field as any,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc'
    };
    setSort(newSort);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const isLowStock = (item: InventoryItem) => {
    return item.quantity <= item.minimumStock;
  };

  const isOutOfStock = (item: InventoryItem) => {
    return item.quantity === 0;
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedSupplier('');
    setSelectedLocation('');
    setStockStatusFilter('');
    setPriceRange({ min: '', max: '' });
    setQuantityRange({ min: '', max: '' });
    setSearchTerm('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by SKU, name, category, supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

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
              Filters
            </button>

            <button
              onClick={() => {}} // TODO: Implement barcode scan
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Scan className="h-4 w-4" />
              Scan
            </button>

            <button
              onClick={onExportData}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>

            {currentUserRole === 'admin' && (
              <button
                onClick={onAddItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            )}
          </div>
        </div>

        {stockAlerts.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-medium text-yellow-800">
                Low Stock Alerts ({stockAlerts.length})
              </h3>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {stockAlerts.map((alert: StockAlert, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-yellow-700">
                    {alert.itemName} - Only {alert.currentStock} left (min: {alert.threshold})
                  </span>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier as string} value={supplier as string}>{supplier as string}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location as string} value={location as string}>{location as string}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={quantityRange.min}
                  onChange={(e) => setQuantityRange(prev => ({ ...prev, min: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={quantityRange.max}
                  onChange={(e) => setQuantityRange(prev => ({ ...prev, max: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { field: 'sku', label: 'SKU/Code' },
                  { field: 'name', label: 'Name' },
                  { field: 'category', label: 'Category' },
                  { field: 'quantity', label: 'Quantity' },
                  { field: 'unit', label: 'Unit' },
                  { field: 'minimumStock', label: 'Min Stock' },
                  { field: 'location', label: 'Location' },
                  { field: 'supplier', label: 'Supplier' },
                  { field: 'purchasePrice', label: 'Purchase Price' },
                  { field: 'salePrice', label: 'Sale Price' },
                  { field: 'taxRate', label: 'Tax Rate' },
                  { field: 'lastUpdated', label: 'Last Updated' }
                ].map(({ field, label }) => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {sort.field === field && (
                        <span className="text-blue-600">
                          {sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {isLowStock(item) && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      {isOutOfStock(item) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          OUT
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.category}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <span className={`font-medium ${
                      isOutOfStock(item) ? 'text-red-600' : 
                      isLowStock(item) ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.unit}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.minimumStock}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      {item.location || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.supplierId}
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
                    {formatDate(new Date(item.lastUpdated))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onStockOperation(item, 'stock_in')}
                        className="p-1 text-green-600 hover:text-green-800 transition-colors"
                        title="Stock In"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onStockOperation(item, 'stock_out')}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        title="Stock Out"
                      >
                        <span className="text-xs font-bold">-</span>
                      </button>
                      <button
                        onClick={() => onTransferStock(item)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Transfer Stock"
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onViewHistory(item)}
                        className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                        title="View History"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEditItem(item)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit Item"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {currentUserRole === 'admin' && (
                        <button
                          onClick={() => onDeleteItem(item)}
                          disabled={item.quantity > 0}
                          className={`p-1 transition-colors ${
                            item.quantity > 0 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-red-600 hover:text-red-800'
                          }`}
                          title={item.quantity > 0 ? "Cannot delete item with stock" : "Delete Item"}
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
            <p>No inventory items found matching your criteria.</p>
            <button
              onClick={clearFilters}
              className="mt-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{filteredItems.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Low Stock Items</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredItems.filter(isLowStock).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Out of Stock</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredItems.filter(isOutOfStock).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Value</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(filteredItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0))}
          </div>
        </div>
      </div>
    </div>
  );
};
