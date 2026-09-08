import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Calendar,
  DollarSign,
  Truck,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { useDeliveryNotes, DeliveryNote } from '../../hooks/useDeliveryNotes';
import { useSuppliers } from '../../hooks/useSuppliers';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { t } from '../../i18n';
import { api } from '../../services/api';

const DeliveryNoteList: React.FC = () => {
  const navigate = useNavigate();
  const { deliveryNotes, loading, error, fetchDeliveryNotes, deleteDeliveryNote } = useDeliveryNotes();
  const { suppliers, fetchSuppliers } = useSuppliers();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resolvedSuppliers, setResolvedSuppliers] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchSuppliers();
    if (fetchDeliveryNotes) {
      fetchDeliveryNotes(); // Initial fetch
    }
  }, []);

  useEffect(() => {
    const resolveMissingSuppliers = async () => {
      const missingIds = Array.from(
        new Set(
          deliveryNotes
            .filter(note => {
              if (!note.supplier_id) return false;
              if (note.suppliers?.name) return false;
              if (suppliers.find(s => s.id === note.supplier_id)) return false;
              return true;
            })
            .map(note => note.supplier_id)
        )
      );

      if (missingIds.length === 0) {
        return;
      }

      for (const id of missingIds) {
        const isMongoId = /^[0-9a-f]{24}$/i.test(id);
        if (!isMongoId) {
          continue;
        }

        try {
          const response = await api.get(`/suppliers/${id}`);
          const payload = response.data?.data ?? response.data;
          const name = payload?.name;
          if (name) {
            setResolvedSuppliers(prev => {
              if (prev[id]) {
                return prev;
              }
              return { ...prev, [id]: name };
            });
          }
        } catch (err) {
          console.error('Failed to resolve supplier for delivery note', id, err);
        }
      }
    };

    resolveMissingSuppliers();
  }, [deliveryNotes, suppliers]);

  // Refresh when focusing the window or returning to the page
  useEffect(() => {
    const handleFocus = () => {
      if (fetchDeliveryNotes) {
        fetchDeliveryNotes();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchDeliveryNotes]);

  const filteredNotes = deliveryNotes.filter(note => {
    const matchesSearch = searchTerm === '' || 
      note.delivery_note_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSupplier = selectedSupplier === '' || note.supplier_id === selectedSupplier;
    const matchesStatus = selectedStatus === '' || note.status === selectedStatus;
    
    const noteDate = new Date(note.delivery_date);
    const matchesDateFrom = dateFrom === '' || noteDate >= new Date(dateFrom);
    const matchesDateTo = dateTo === '' || noteDate <= new Date(dateTo);
    
    return matchesSearch && matchesSupplier && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: t('supplierDeliveryNotes.filters.draft') },
      validated: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: t('supplierDeliveryNotes.filters.validated') },
      invoiced: { color: 'bg-blue-100 text-blue-800', icon: FileText, label: t('supplierDeliveryNotes.filters.invoiced') },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: t('supplierDeliveryNotes.filters.cancelled') }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getSupplierName = (note: DeliveryNote) => {
    if (note.suppliers?.name) {
      return note.suppliers.name;
    }

    const supplier = suppliers.find(s => s.id === note.supplier_id);
    if (supplier?.name) {
      return supplier.name;
    }

    if (note.supplier_id && resolvedSuppliers[note.supplier_id]) {
      return resolvedSuppliers[note.supplier_id];
    }

    return t('common.unknown');
  };

  const handleDelete = async (e: React.MouseEvent, note: any) => {
    e.stopPropagation();
    if (!window.confirm(`${t('supplierDeliveryNotes.confirm.delete')}: ${note.delivery_note_number}`)) {
      return;
    }

    try {
      await deleteDeliveryNote(note.id);
    } catch (err) {
      console.error('Delete error:', err);
      alert(t('supplierDeliveryNotes.alerts.deleteFailed'));
    }
  };

  const stats = {
    total: filteredNotes.length,
    draft: filteredNotes.filter(n => n.status === 'draft').length,
    validated: filteredNotes.filter(n => n.status === 'validated').length,
    invoiced: filteredNotes.filter(n => n.status === 'invoiced').length,
    totalAmount: filteredNotes.reduce((sum, note) => sum + (note.total_amount_ttc || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{t('supplierDeliveryNotes.alerts.loadingError')}</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('supplierDeliveryNotes.header')}</h1>
          <p className="text-gray-600">{t('supplierDeliveryNotes.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/supplier-delivery-notes/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('supplierDeliveryNotes.newDeliveryNote')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('supplierDeliveryNotes.stats.totalNotes')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-gray-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('supplierDeliveryNotes.stats.draft')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('supplierDeliveryNotes.stats.validated')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.validated}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('supplierDeliveryNotes.stats.invoiced')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.invoiced}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('supplierDeliveryNotes.stats.totalAmount')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierDeliveryNotes.filters.search')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('supplierDeliveryNotes.filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierDeliveryNotes.filters.supplier')}</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('supplierDeliveryNotes.filters.allSuppliers')}</option>
              {suppliers.map((supplier, index) => (
                <option key={supplier.id || (supplier as any)._id || supplier.email || supplier.name || index} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierDeliveryNotes.filters.status')}</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('supplierDeliveryNotes.filters.allStatuses')}</option>
              <option value="draft">{t('supplierDeliveryNotes.filters.draft')}</option>
              <option value="validated">{t('supplierDeliveryNotes.filters.validated')}</option>
              <option value="invoiced">{t('supplierDeliveryNotes.filters.invoiced')}</option>
              <option value="cancelled">{t('supplierDeliveryNotes.filters.cancelled')}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierDeliveryNotes.filters.fromDate')}</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplierDeliveryNotes.filters.toDate')}</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Notes Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierDeliveryNotes.table.dnNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierDeliveryNotes.table.supplier')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierDeliveryNotes.table.deliveryDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierDeliveryNotes.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierDeliveryNotes.table.amountTTC')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierDeliveryNotes.table.items')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('supplierDeliveryNotes.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{note.delivery_note_number}</div>
                    <div className="text-xs text-gray-500">{formatDate(note.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getSupplierName(note)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(note.delivery_date)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(note.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(note.total_amount_ttc)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {note.supplier_delivery_note_items?.length || 0} {t('supplierDeliveryNotes.table.items').toLowerCase()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => navigate(`/supplier-delivery-notes/${note.id}`)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      {t('supplierDeliveryNotes.actions.view')}
                    </button>
                    {note.status === 'draft' && (
                      <button
                        onClick={() => navigate(`/supplier-delivery-notes/${note.id}/edit`)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        {t('supplierDeliveryNotes.actions.edit')}
                      </button>
                    )}
                    {(note.status === 'draft' || note.status === 'cancelled') && (
                      <button
                        onClick={(e) => handleDelete(e, note)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('supplierDeliveryNotes.empty.noNotes')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedSupplier || selectedStatus || dateFrom || dateTo
                ? t('supplierDeliveryNotes.empty.noMatch')
                : t('supplierDeliveryNotes.empty.getStarted')}
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/supplier-delivery-notes/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('supplierDeliveryNotes.newDeliveryNote')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryNoteList;
