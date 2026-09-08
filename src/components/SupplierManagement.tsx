import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useInventoryStore } from '../stores/inventoryStore';
import { useSupplierStore } from '../stores/supplierStore';
import { Supplier, SupplierFormData } from '../types/inventory';
import { SupplierDetail } from './SupplierDetail';
import { SupplierForm } from './SupplierForm';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';
import { t } from '../i18n';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building,
  Phone,
  Mail,
  MapPin,
  Eye,
  AlertTriangle,
  Receipt
} from 'lucide-react';

interface SupplierManagementProps {
  currentUserRole?: string;
  currentUserId?: string;
}

export const SupplierManagement: React.FC<SupplierManagementProps> = () => {
  const {
    suppliers,
    purchaseOrders,
    returnOrders,
    supplierInvoices,
    addSupplier,
    updateSupplier,
    deleteSupplier
  } = useInventoryStore();

  // State management
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'spending' | 'rating' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Calculate supplier statistics
  const calculateSupplierStats = useMemo(() => {
    return suppliers.map(supplier => {
      const supplierPOs = purchaseOrders.filter(po => po.supplierId === supplier.id);
      const supplierReturns = returnOrders.filter(ret => ret.supplierId === supplier.id);
      const supplierInvs = supplierInvoices.filter(inv => inv.supplierId === supplier.id);
      
      const totalSpending = supplierInvs.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const openOrders = supplierPOs.filter(po => 
        po.status === 'sent' || po.status === 'confirmed' || po.status === 'partially_received'
      ).length;
      const pendingInvoices = supplierInvs.filter(inv => 
        inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'partially_paid'
      ).length;
      
      return {
        ...supplier,
        totalSpending,
        openOrders,
        pendingInvoices,
        totalOrders: supplierPOs.length,
        totalReturns: supplierReturns.length,
        totalInvoices: supplierInvs.length
      };
    });
  }, [suppliers, purchaseOrders, returnOrders, supplierInvoices]);

  // Filter and sort suppliers
  const filteredSuppliers = useMemo(() => {
    const filtered = calculateSupplierStats.filter(supplier => {
      // Search filter
      const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && supplier.isActive) ||
                           (statusFilter === 'inactive' && !supplier.isActive);
      
      return matchesSearch && matchesStatus;
    });

    // Sort suppliers
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'spending':
          aValue = a.totalSpending;
          bValue = b.totalSpending;
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [calculateSupplierStats, searchTerm, statusFilter, sortBy, sortOrder]);

  // Check if supplier can be deleted
  const canDeleteSupplier = (supplier: Supplier) => {
    const supplierStats = calculateSupplierStats.find(s => s.id === supplier.id);
    if (!supplierStats) return false;
    
    const hasOpenOrders = supplierStats.openOrders > 0;
    const hasPendingInvoices = supplierStats.pendingInvoices > 0;
    
    return !hasOpenOrders && !hasPendingInvoices;
  };

  // Handle supplier operations
  const handleAddSupplier = useCallback(async (supplierData: SupplierFormData) => {
    try {
      await addSupplier(supplierData);
      try {
        const { fetchSuppliers } = useSupplierStore.getState();
        void fetchSuppliers();
      } catch {}
      toast.success('Supplier added successfully');
      setShowAddModal(false);
    } catch (error: any) {
      const message =
        (error && (error as any).message) ||
        'Failed to add supplier';
      console.error('Failed to add supplier:', error);
      toast.error(message);
    }
  }, [addSupplier]);

  const handleEditSupplier = useCallback((supplierData: SupplierFormData) => {
    if (!selectedSupplier) return;
    
    try {
      updateSupplier(selectedSupplier.id, supplierData);
      toast.success('Supplier updated successfully');
      setShowEditModal(false);
      setSelectedSupplier(null);
    } catch (error) {
      toast.error('Failed to update supplier');
    }
  }, [selectedSupplier, updateSupplier]);

  const handleDeleteSupplier = (supplier: Supplier) => {
    if (!canDeleteSupplier(supplier)) {
      toast.error('Cannot delete supplier with open orders or pending invoices');
      return;
    }
    
    setSupplierToDelete(supplier);
  };

  const confirmDeleteSupplier = () => {
    if (!supplierToDelete) return;
    
    try {
      deleteSupplier(supplierToDelete.id);
      toast.success('Supplier deleted successfully');
      setSupplierToDelete(null);
    } catch (error) {
      toast.error('Failed to delete supplier');
    }
  };

  // const handleQuickAction = (action: string, supplier: Supplier) => {
  //   switch (action) {
  //     case 'new-invoice':
  //       // Navigate to create invoice with supplier pre-selected
  //       toast.info('Create new invoice for ' + supplier.name);
  //       break;
  //     case 'new-po':
  //       // Navigate to create PO with supplier pre-selected
  //       toast.info('Create new purchase order for ' + supplier.name);
  //       break;
  //     case 'view-orders':
  //       // Filter orders by supplier
  //       toast.info('Viewing orders for ' + supplier.name);
  //       break;
  //     case 'payment-status':
  //       // Show payment status
  //       toast.info('Payment status for ' + supplier.name);
  //       break;
  //   }
  // };

  // Supplier card component
  const SupplierCard = ({ supplier }: { supplier: any }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${
            supplier.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
          }`}>
            <Building className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{supplier.name}</h3>
            <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            supplier.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {supplier.isActive ? t('supplierManagement.statusText.active') : t('supplierManagement.statusText.inactive')}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="h-4 w-4" />
          <span>{supplier.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4" />
          <span>{supplier.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>{supplier.city}, {supplier.country}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="text-center">
          <p className="text-gray-600">{t('supplierManagement.metrics.totalSpending')}</p>
          <p className="font-semibold text-lg text-blue-600">{formatCurrency(supplier.totalSpending)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600">{t('supplierManagement.metrics.openOrders')}</p>
          <p className="font-semibold text-lg text-orange-600">{supplier.openOrders}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          to={`/inventory/manage?tab=supplier-payments&supplierId=${supplier.id}`}
          className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
          title={t('supplierManagement.actions.managePayments')}
        >
          <Receipt className="h-4 w-4" />
          {t('supplierManagement.actions.managePayments')}
        </Link>
        <button
          onClick={() => {
            setSelectedSupplier(supplier);
            setShowDetailModal(true);
          }}
          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="h-4 w-4" />
          {t('supplierInvoiceManagement.tooltips.viewDetails')}
        </button>
        <button
          onClick={() => {
            setSelectedSupplier(supplier);
            setShowEditModal(true);
          }}
          className="px-3 py-2 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleDeleteSupplier(supplier)}
          disabled={!canDeleteSupplier(supplier)}
          className={`px-3 py-2 rounded-md transition-colors ${
            canDeleteSupplier(supplier)
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  // Supplier list row component
  const SupplierRow = ({ supplier }: { supplier: any }) => (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${
            supplier.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
          }`}>
            <Building className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{supplier.name}</div>
            <div className="text-sm text-gray-500">{supplier.contactPerson}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{supplier.email}</div>
        <div className="text-sm text-gray-500">{supplier.phone}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{supplier.city}</div>
        <div className="text-sm text-gray-500">{supplier.country}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          supplier.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {supplier.isActive ? t('supplierManagement.statusText.active') : t('supplierManagement.statusText.inactive')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{formatCurrency(supplier.totalSpending)}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{supplier.openOrders}</div>
        <div className="text-sm text-gray-500">{supplier.pendingInvoices} pending</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex gap-2">
          <Link
            to={`/inventory/manage?tab=supplier-payments&supplierId=${supplier.id}`}
            className="text-indigo-600 hover:text-indigo-900"
            title={t('supplierManagement.actions.managePayments')}
          >
            <Receipt className="h-4 w-4" />
          </Link>
          <button
            onClick={() => {
              setSelectedSupplier(supplier);
              setShowDetailModal(true);
            }}
            className="text-blue-600 hover:text-blue-900"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedSupplier(supplier);
              setShowEditModal(true);
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteSupplier(supplier)}
            disabled={!canDeleteSupplier(supplier)}
            className={`${
              canDeleteSupplier(supplier)
                ? 'text-red-600 hover:text-red-900'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('supplierManagement.header')}</h2>
          <p className="text-gray-600">{t('supplierManagement.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('supplierManagement.actions.addSupplier')}
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={t('supplierManagement.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('supplierManagement.filters.allStatus')}</option>
              <option value="active">{t('supplierManagement.filters.active')}</option>
              <option value="inactive">{t('supplierManagement.filters.inactive')}</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">{t('supplierManagement.filters.sortByName')}</option>
              <option value="spending">{t('supplierManagement.filters.sortBySpending')}</option>
              <option value="rating">{t('supplierManagement.filters.sortByRating')}</option>
              <option value="created">{t('supplierManagement.filters.sortByDate')}</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {t('supplierManagement.showing')} {filteredSuppliers.length} / {suppliers.length} {t('inventory.tab.suppliers')}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md text-sm ${
              viewMode === 'list'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('supplierManagement.listView')}
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-md text-sm ${
              viewMode === 'grid'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('supplierManagement.gridView')}
          </button>
        </div>
      </div>

      {/* Suppliers Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierManagement.table.columns.supplier')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierManagement.table.columns.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierManagement.table.columns.location')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierManagement.table.columns.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierManagement.table.columns.totalSpending')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierManagement.table.columns.ordersInvoices')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierManagement.table.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => (
                <SupplierRow key={supplier.id} supplier={supplier} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <div key="add-supplier-modal" className={`fixed inset-0 z-50 ${showAddModal ? 'block' : 'hidden'}`}>
        <SupplierForm
          onSubmit={handleAddSupplier}
          onClose={() => setShowAddModal(false)}
          mode="add"
        />
      </div>

      <div key="edit-supplier-modal" className={`fixed inset-0 z-50 ${showEditModal && selectedSupplier ? 'block' : 'hidden'}`}>
        {selectedSupplier && (
          <SupplierForm
            supplier={selectedSupplier}
            onSubmit={handleEditSupplier}
            onClose={() => {
              setShowEditModal(false);
              setSelectedSupplier(null);
            }}
            mode="edit"
          />
        )}
      </div>

      {showDetailModal && selectedSupplier && (
        <SupplierDetail
          supplier={selectedSupplier}
          purchaseOrders={purchaseOrders}
          supplierInvoices={supplierInvoices}
          returnOrders={returnOrders}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSupplier(null);
          }}
          onEditSupplier={() => {
            setShowDetailModal(false);
            setShowEditModal(true);
          }}
          onCreatePurchaseOrder={() => toast.info('Create purchase order functionality coming soon')}
          onCreateSupplierInvoice={() => toast.info('Create supplier invoice functionality coming soon')}
          onViewPurchaseOrder={() => toast.info('View purchase order functionality coming soon')}
          onViewSupplierInvoice={() => toast.info('View supplier invoice functionality coming soon')}
          onViewReturnOrder={() => toast.info('View return order functionality coming soon')}
        />
      )}

      {/* Delete Confirmation Modal */}
      {supplierToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Supplier</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{supplierToDelete.name}</strong>? 
              This action cannot be undone.
            </p>
            {(() => {
              const supplierStats = calculateSupplierStats.find(s => s.id === supplierToDelete.id);
              return supplierStats && supplierStats.totalSpending > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This supplier has {formatCurrency(supplierStats.totalSpending)} in total spending and {supplierStats.totalOrders} orders. 
                    Deleting will affect historical records.
                  </p>
                </div>
              );
            })()}
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteSupplier}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Supplier
              </button>
              <button
                onClick={() => setSupplierToDelete(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
