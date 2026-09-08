import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Plus, 
  Search, 
  Download,
  FileText,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Truck,
  DollarSign,

  TrendingDown
} from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { ReturnOrder, ReturnOrderStatus, ReturnReason } from '../types/inventory';
import { ReturnOrderForm } from './ReturnOrderForm';
import { ReturnOrderDetail } from './ReturnOrderDetail';
import { toast } from 'sonner';
import { t } from '../i18n';
import { useLangStore } from '../stores/langStore';
import { useDeliveryNotes } from '../hooks/useDeliveryNotes';

interface ReturnOrderManagementProps {
  currentUserRole: string;
  currentUserId: string;
}

export const ReturnOrderManagement: React.FC<ReturnOrderManagementProps> = ({
  currentUserRole,
  currentUserId
}) => {
  const { locale, currency } = useLangStore();
  const {
    returnOrders,
    suppliers,
    createReturnOrder,
    updateReturnOrder,
    deleteReturnOrder,
    processReturnOrder,
    getFilteredReturnOrders
  } = useInventoryStore();
  const { deliveryNotes, fetchDeliveryNotes } = useDeliveryNotes();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReturnOrderStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<ReturnReason | 'all'>('all');
  const [dateRangeFilter] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  const [showForm, setShowForm] = useState(false);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<ReturnOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedDeliveryNoteIdForForm, setSelectedDeliveryNoteIdForForm] = useState<string | undefined>(undefined);
  const canProcessReturns = ['admin', 'manager'].includes(currentUserRole);

  const formatCurrency = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(locale); } catch { return iso; }
  };

  useEffect(() => {
    fetchDeliveryNotes({ status: 'validated' });
  }, [fetchDeliveryNotes]);

  const validatedDeliveryNotes = useMemo(
    () => deliveryNotes.filter(note => note.status === 'validated'),
    [deliveryNotes]
  );

  // Filter return orders
  const filteredReturnOrders = useMemo(() => {
    let filtered = getFilteredReturnOrders({
      supplierId: supplierFilter === 'all' ? undefined : supplierFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      dateRange: dateRangeFilter.start && dateRangeFilter.end ? dateRangeFilter : undefined
    });

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.returnNumber.toLowerCase().includes(term) ||
        order.supplierName.toLowerCase().includes(term) ||
        order.items.some(item => item.itemName.toLowerCase().includes(term)) ||
        order.returnReasonDetails?.toLowerCase().includes(term)
      );
    }

    // Apply reason filter
    if (reasonFilter !== 'all') {
      filtered = filtered.filter(order => order.returnReason === reasonFilter);
    }

    return filtered;
  }, [returnOrders, searchTerm, statusFilter, supplierFilter, reasonFilter, dateRangeFilter, getFilteredReturnOrders]);

  const filteredDeliveryNotes = useMemo(() => {
    let notes = validatedDeliveryNotes;

    if (supplierFilter !== 'all') {
      notes = notes.filter(note => note.supplier_id === supplierFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      notes = notes.filter(note =>
        note.delivery_note_number.toLowerCase().includes(term) ||
        (note.suppliers?.name || '').toLowerCase().includes(term) ||
        (note.purchase_orders?.po_number || '').toLowerCase().includes(term)
      );
    }

    return notes;
  }, [validatedDeliveryNotes, supplierFilter, searchTerm]);

  const getDeliveryNoteReturnStatus = (deliveryNoteId: string) => {
    const relatedReturns = returnOrders.filter(order => order.deliveryNoteId === deliveryNoteId);

    if (relatedReturns.length === 0) {
      return { label: 'Aucun avoir', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }

    const hasProcessed = relatedReturns.some(order => order.status === 'processed' || order.status === 'completed');
    if (hasProcessed) {
      return { label: 'Avoir traité', color: 'bg-green-100 text-green-800 border-green-200' };
    }

    return { label: 'Avoir en cours', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalReturns = returnOrders.length;
    const pendingReturns = returnOrders.filter(order => order.status === 'requested' || order.status === 'approved').length;
    const processedReturns = returnOrders.filter(order => order.status === 'processed').length;
    const completedReturns = returnOrders.filter(order => order.status === 'completed').length;
    const cancelledReturns = returnOrders.filter(order => order.status === 'cancelled').length;
    const rejectedReturns = returnOrders.filter(order => order.status === 'rejected').length;

    const totalValue = returnOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const pendingValue = returnOrders
      .filter(order => order.status === 'requested' || order.status === 'approved')
      .reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      totalReturns,
      pendingReturns,
      processedReturns,
      completedReturns,
      cancelledReturns,
      rejectedReturns,
      totalValue,
      pendingValue
    };
  }, [returnOrders]);

  const handleCreateReturnOrder = (formData: any) => {
    try {
      const newReturnOrder = createReturnOrder(formData);
      toast.success(t('returnOrderDetail.messages.createSuccess').replace('{{number}}', newReturnOrder.returnNumber));
      setShowForm(false);
    } catch (error) {
      toast.error(t('returnOrderDetail.messages.createError').replace('{{error}}', error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleUpdateReturnOrder = (id: string, updates: Partial<ReturnOrder>) => {
    try {
      updateReturnOrder(id, updates);
      toast.success(t('returnOrderDetail.messages.updateSuccess'));
    } catch (error) {
      toast.error(t('returnOrderDetail.messages.updateError').replace('{{error}}', error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteReturnOrder = (id: string) => {
    if (window.confirm(t('returnOrderDetail.messages.deleteConfirm'))) {
      try {
        deleteReturnOrder(id);
        toast.success(t('returnOrderDetail.messages.deleteSuccess'));
      } catch (error) {
        toast.error(t('returnOrderDetail.messages.deleteError').replace('{{error}}', error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleProcessReturnOrder = (id: string) => {
    if (!canProcessReturns) {
      toast.error(t('returnOrderDetail.messages.processError').replace('{{error}}', 'Non autorisé'));
      return;
    }
    if (window.confirm(t('returnOrderDetail.messages.processConfirm'))) {
      try {
        processReturnOrder(id, currentUserId);
        toast.success(t('returnOrderDetail.messages.processSuccess'));
      } catch (error) {
        toast.error(t('returnOrderDetail.messages.processError').replace('{{error}}', error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleViewDetail = (returnOrder: ReturnOrder) => {
    setSelectedReturnOrder(returnOrder);
    setShowDetail(true);
  };

  const handleCreateReturnFromDeliveryNote = (deliveryNoteId: string) => {
    setSelectedDeliveryNoteIdForForm(deliveryNoteId);
    setShowForm(true);
  };

  const handleExportReturns = () => {
    const csvContent = [
      [
        t('returnOrderDetail.labels.returnNumber'),
        t('returnOrderDetail.labels.returnDate'),
        t('returnOrderDetail.labels.supplier'),
        t('returnOrderDetail.sections.items'), // Using generic label or specific column header
        t('returnOrderDetail.labels.reason'),
        t('returnOrderDetail.labels.total'),
        'Items Count'
      ],
      ...filteredReturnOrders.map(order => [
        order.returnNumber,
        order.returnDate,
        order.supplierName,
        order.status,
        order.returnReason,
        order.totalAmount.toFixed(2),
        order.items.length.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `return_orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('returnOrderDetail.messages.exportSuccess'));
  };

  const getStatusColor = (status: ReturnOrderStatus) => {
    switch (status) {
      case 'requested': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReasonIcon = (reason: ReturnReason) => {
    switch (reason) {
      case 'defective': return <XCircle className="h-4 w-4" />;
      case 'damaged': return <AlertTriangle className="h-4 w-4" />;
      case 'wrong_item': return <RotateCcw className="h-4 w-4" />;
      case 'excess_inventory': return <TrendingDown className="h-4 w-4" />;
      case 'expired': return <Calendar className="h-4 w-4" />;
      case 'quality_issue': return <AlertTriangle className="h-4 w-4" />;
      case 'incorrect_order': return <RotateCcw className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: ReturnOrderStatus) => {
    return t(`returnOrderDetail.status.${status}`);
  };

  const getReasonText = (reason: ReturnReason) => {
    return t(`returnOrderForm.reasons.${reason}`);
  };

  const ReturnOrderCard = ({ returnOrder }: { returnOrder: ReturnOrder }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{returnOrder.returnNumber}</h3>
          <p className="text-sm text-gray-500">{formatDate(returnOrder.returnDate)}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(returnOrder.status)}`}>
          {getStatusText(returnOrder.status)}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center text-sm">
          <Truck className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-900">{returnOrder.supplierName}</span>
        </div>

        <div className="flex items-center text-sm">
          {getReasonIcon(returnOrder.returnReason)}
          <span className="text-gray-900 ml-2">{getReasonText(returnOrder.returnReason)}</span>
        </div>

        <div className="flex items-center text-sm">
          <Package className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-900">{returnOrder.items.length} {t('returnsManagement.table.itemsCountSuffix')}</span>
        </div>

        <div className="flex items-center text-sm">
          <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-900 font-medium">{formatCurrency(returnOrder.totalAmount)}</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <button
          onClick={() => handleViewDetail(returnOrder)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {t('returnsManagement.tooltips.viewDetails')}
        </button>
        
        <div className="flex space-x-2">
          {returnOrder.status === 'approved' && canProcessReturns && (
            <button
              onClick={() => handleProcessReturnOrder(returnOrder.id)}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              {t('inventoryManagement.actionsTitles.transferStock')}
            </button>
          )}
          
          {returnOrder.status !== 'processed' && returnOrder.status !== 'completed' && (
            <button
              onClick={() => handleDeleteReturnOrder(returnOrder.id)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              {t('returnsManagement.tooltips.delete')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const ReturnOrderRow = ({ returnOrder }: { returnOrder: ReturnOrder }) => (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-gray-900">{returnOrder.returnNumber}</div>
          <div className="text-sm text-gray-500">{formatDate(returnOrder.returnDate)}</div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-900">{returnOrder.supplierName}</div>
      </td>
      <td className="px-4 py-3">
          <div className="flex items-center text-sm">
          {getReasonIcon(returnOrder.returnReason)}
          <span className="ml-2 text-sm text-gray-900">{getReasonText(returnOrder.returnReason)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(returnOrder.status)}`}>
          {getStatusText(returnOrder.status)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-900">{returnOrder.items.length} {t('returnsManagement.table.itemsCountSuffix')}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-gray-900">{formatCurrency(returnOrder.totalAmount)}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewDetail(returnOrder)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            <Eye className="h-4 w-4" />
          </button>
          
          {returnOrder.status === 'approved' && canProcessReturns && (
            <button
              onClick={() => handleProcessReturnOrder(returnOrder.id)}
            className="text-green-600 hover:text-green-800 text-sm"
            title={t('inventoryManagement.actionsTitles.transferStock')}
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          
          {returnOrder.status !== 'processed' && returnOrder.status !== 'completed' && (
            <button
              onClick={() => handleDeleteReturnOrder(returnOrder.id)}
            className="text-red-600 hover:text-red-800 text-sm"
            title={t('returnsManagement.tooltips.delete')}
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <RotateCcw className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('returnsManagement.cards.totalReturns')}</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalReturns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('returnsManagement.cards.pending')}</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingReturns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('returnsManagement.cards.completed')}</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completedReturns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('returnsManagement.cards.totalValue')}</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">BL validés</h2>
            <p className="text-sm text-gray-500">Sélectionnez les BL pour créer des avoirs</p>
          </div>
          <div className="text-sm text-gray-500">
            Total BL validés: <span className="font-medium">{validatedDeliveryNotes.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">BL</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Commande</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Montant TTC</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Statut avoir</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeliveryNotes.map(note => {
                const status = getDeliveryNoteReturnStatus(note.id);
                return (
                  <tr key={note.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {note.delivery_note_number}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {note.suppliers?.name || 'Inconnu'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {note.purchase_orders?.po_number || 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(note.delivery_date)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(note.total_amount_ttc || 0)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleCreateReturnFromDeliveryNote(note.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Créer un avoir
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredDeliveryNotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                    Aucun BL validé trouvé avec ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('returnsManagement.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReturnOrderStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('returnsManagement.filters.allStatus')}</option>
              <option value="requested">{t('returnOrderDetail.status.requested')}</option>
              <option value="approved">{t('returnOrderDetail.status.approved')}</option>
              <option value="processed">{t('returnOrderDetail.status.processed')}</option>
              <option value="completed">{t('returnOrderDetail.status.completed')}</option>
              <option value="cancelled">{t('returnOrderDetail.status.cancelled')}</option>
              <option value="rejected">{t('returnOrderDetail.status.rejected')}</option>
            </select>

            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('returnsManagement.filters.allSuppliers')}</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>

            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as ReturnReason | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('returnsManagement.filters.allReasons')}</option>
              <option value="defective">{t('returnOrderForm.reasons.defective')}</option>
              <option value="damaged">{t('returnOrderForm.reasons.damaged')}</option>
              <option value="wrong_item">{t('returnOrderForm.reasons.incorrect_item')}</option>
              <option value="excess_inventory">{t('returnOrderForm.reasons.excess_inventory')}</option>
              <option value="expired">{t('returnOrderForm.reasons.expired')}</option>
              <option value="quality_issue">{t('returnOrderForm.reasons.quality_issue')}</option>
              <option value="incorrect_order">{t('returnOrderForm.reasons.incorrect_order')}</option>
              <option value="other">{t('returnOrderForm.reasons.other')}</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {t('returnsManagement.viewToggle.list')}
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {t('returnsManagement.viewToggle.grid')}
              </button>
            </div>

            <button
              onClick={handleExportReturns}
              className="flex items-center px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-1" />
              {t('returnsManagement.actions.export')}
            </button>

            <button
              onClick={() => {
                setSelectedDeliveryNoteIdForForm(undefined);
                setShowForm(true);
              }}
              className="flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('returnsManagement.actions.newReturn')}
            </button>
          </div>
        </div>
      </div>

      {/* Return Orders List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReturnOrders.map((returnOrder) => (
              <ReturnOrderCard key={returnOrder.id} returnOrder={returnOrder} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('returnsManagement.table.columns.returnOrder')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('returnsManagement.table.columns.supplier')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('returnsManagement.table.columns.reason')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('returnsManagement.table.columns.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('returnsManagement.table.columns.items')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('returnsManagement.table.columns.amount')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('returnsManagement.table.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReturnOrders.map((returnOrder) => (
                  <ReturnOrderRow key={returnOrder.id} returnOrder={returnOrder} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredReturnOrders.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <RotateCcw className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>{t('returnOrderDetail.messages.noReturns')}</p>
            <p className="text-sm mt-1">{t('returnOrderDetail.messages.noReturnsDesc')}</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ReturnOrderForm
              onSubmit={handleCreateReturnOrder}
              onCancel={() => setShowForm(false)}
              initialDeliveryNoteId={selectedDeliveryNoteIdForForm}
            />
          </div>
        </div>
      )}

      {showDetail && selectedReturnOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ReturnOrderDetail
              returnOrder={selectedReturnOrder}
              onClose={() => setShowDetail(false)}
              onUpdate={handleUpdateReturnOrder}
              onProcess={handleProcessReturnOrder}
              currentUserRole={currentUserRole}
            />
          </div>
        </div>
      )}
    </div>
  );
};
