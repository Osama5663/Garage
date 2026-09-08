import { useEffect, useState } from 'react'
import { useDeliveryNoteStore } from '@/stores/deliveryNoteStore'
import { useSupplierStore } from '@/stores/supplierStore'
import { DeliveryNote } from '@/types/deliveryNote'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  Package,
  Calendar,
  User,
  Euro,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'

interface DeliveryNoteListProps {
  onSelectDeliveryNote?: (deliveryNote: DeliveryNote) => void
  onCreateDeliveryNote?: () => void
  onEditDeliveryNote?: (deliveryNote: DeliveryNote) => void
  onViewDeliveryNote?: (deliveryNote: DeliveryNote) => void
}

export default function DeliveryNoteList({
  onCreateDeliveryNote,
  onEditDeliveryNote,
  onViewDeliveryNote
}: DeliveryNoteListProps) {
  const {
    deliveryNotes,
    loading,
    error,
    filters,
    fetchDeliveryNotes,
    setFilters,
    validateDeliveryNote,
    cancelDeliveryNote,
    deleteDeliveryNote
  } = useDeliveryNoteStore()

  const { suppliers, fetchSuppliers } = useSupplierStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const textLimit = 10

  useEffect(() => {
    fetchDeliveryNotes()
    fetchSuppliers()
  }, [fetchDeliveryNotes, fetchSuppliers])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newFilters = {
        ...filters,
        searchTerm: searchTerm || undefined
      }
      setFilters(newFilters)
      fetchDeliveryNotes()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filters, setFilters, fetchDeliveryNotes])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filters])

  const handleStatusFilter = (status: string) => {
    const newFilters = {
      ...filters,
      status: status === 'all' ? undefined : [status as DeliveryNote['status']]
    }
    setFilters(newFilters)
    fetchDeliveryNotes()
  }

  const handleSupplierFilter = (supplierId: string) => {
    const newFilters = { ...filters, supplier_id: supplierId === 'all' ? undefined : supplierId }
    setFilters(newFilters)
    fetchDeliveryNotes()
  }

  const handleValidate = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir valider ce bon de livraison ?')) {
      try {
        await validateDeliveryNote(id)
      } catch (error) {
        console.error('Failed to validate delivery note:', error)
      }
    }
  }

  const handleCancel = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler ce bon de livraison ?')) {
      try {
        await cancelDeliveryNote(id)
      } catch (error) {
        console.error('Failed to cancel delivery note:', error)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bon de livraison ? Cette action est irréversible.')) {
      try {
        await deleteDeliveryNote(id)
      } catch (error) {
        console.error('Failed to delete delivery note:', error)
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Brouillon' },
      validated: { color: 'bg-green-100 text-green-800', label: 'Validé' },
      invoiced: { color: 'bg-blue-100 text-blue-800', label: 'Facturé' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Annulé' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', label: status }
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.label}</span>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'invoiced':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const truncateText = (value: string, max: number) => {
    if (!value) return ''
    return value.length <= max ? value : `${value.slice(0, max)}…`
  }

  const totalPages = Math.ceil(deliveryNotes.length / pageSize) || 1

  const paginatedDeliveryNotes = deliveryNotes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  if (loading && deliveryNotes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de Livraison Fournisseur</h1>
          <p className="text-gray-600">Gérez les bons de livraison de vos fournisseurs</p>
        </div>
        <button
          onClick={onCreateDeliveryNote}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau BL</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher un BL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filtres</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={filters.status || 'all'}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="validated">Validé</option>
                <option value="invoiced">Facturé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
              <select
                value={filters.supplier_id || 'all'}
                onChange={(e) => handleSupplierFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les fournisseurs</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de livraison (du)</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, dateFrom: e.target.value || undefined }
                  setFilters(newFilters)
                  fetchDeliveryNotes()
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de livraison (au)</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => {
                  const newFilters = { ...filters, dateTo: e.target.value || undefined }
                  setFilters(newFilters)
                  fetchDeliveryNotes()
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Delivery Notes List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {deliveryNotes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun bon de livraison</h3>
            <p className="mt-1 text-sm text-gray-500">Commencez par créer un nouveau bon de livraison.</p>
            <div className="mt-6">
              <button
                onClick={onCreateDeliveryNote}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau BL
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numéro BL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fournisseur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commande
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDeliveryNotes.map((deliveryNote) => {
                  const orderLabel = deliveryNote.jobOrderId || '-'

                  return (
                    <tr key={deliveryNote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-gray-400 mr-2" />
                          <div
                            className="text-sm font-medium text-gray-900"
                            title={deliveryNote.blNumber}
                          >
                            {truncateText(deliveryNote.blNumber, textLimit)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div
                            className="text-sm text-gray-900"
                            title={deliveryNote.customerName}
                          >
                            {truncateText(deliveryNote.customerName, textLimit)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="text-sm text-gray-900"
                          title={orderLabel}
                        >
                          {truncateText(orderLabel, textLimit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {format(new Date(deliveryNote.issueDate), 'dd MMM yyyy', { locale: fr })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(deliveryNote.status)}
                          {getStatusBadge(deliveryNote.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Euro className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {formatCurrency(deliveryNote.totalValue)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onViewDeliveryNote?.(deliveryNote)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {deliveryNote.status === 'draft' && (
                            <>
                              <button
                                onClick={() => onEditDeliveryNote?.(deliveryNote)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Modifier"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => handleValidate(deliveryNote.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Valider"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => handleCancel(deliveryNote.id)}
                                className="text-orange-600 hover:text-orange-900"
                                title="Annuler"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => handleDelete(deliveryNote.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          
                          {deliveryNote.status === 'validated' && (
                            <button
                              onClick={() => handleCancel(deliveryNote.id)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Annuler"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-6 py-3 border-t border-gray-200">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1
                    const isActive = page === currentPage
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded-md border ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
