import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Download, Eye, Edit, Trash2, CheckCircle, XCircle, FileText } from 'lucide-react'
import useSupplierDeliveryNoteStore from '../stores/supplierDeliveryNoteStore'
import { useSupplierStore } from '../stores/supplierStore'
import { formatCurrency, formatDate } from '../utils/formatters'

const DeliveryNotesPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    deliveryNotes,
    loading,
    error,
    setFilters,
    fetchDeliveryNotes,
    updateDeliveryNoteStatus,
    deleteDeliveryNote
  } = useSupplierDeliveryNoteStore()

  const { suppliers, fetchSuppliers } = useSupplierStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [supplierFilter, setSupplierFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchDeliveryNotes()
    fetchSuppliers()
  }, [])

  useEffect(() => {
    const newFilters: { supplier_id?: string; status?: string; start_date?: string; end_date?: string } = {}
    if (statusFilter) newFilters.status = statusFilter
    if (supplierFilter) newFilters.supplier_id = supplierFilter
    if (dateFrom) newFilters.start_date = dateFrom
    if (dateTo) newFilters.end_date = dateTo
    
    setFilters(newFilters as any)
    fetchDeliveryNotes()
  }, [statusFilter, supplierFilter, dateFrom, dateTo])

  const handleView = (id: string) => {
    navigate(`/delivery-notes/${id}`)
  }

  const handleEdit = (id: string) => {
    navigate(`/delivery-notes/${id}/edit`)
  }

  const handleCreate = () => {
    navigate('/delivery-notes/new')
  }

  const handleValidate = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir valider ce bon de livraison ?')) {
      try {
        await updateDeliveryNoteStatus(id, 'validated')
      } catch (error) {
        console.error('Error validating delivery note:', error)
      }
    }
  }

  const handleCancel = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler ce bon de livraison ?')) {
      try {
        await updateDeliveryNoteStatus(id, 'cancelled')
      } catch (error) {
        console.error('Error cancelling delivery note:', error)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bon de livraison ?')) {
      try {
        await deleteDeliveryNote(id)
      } catch (error) {
        console.error('Error deleting delivery note:', error)
      }
    }
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export delivery notes')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'validated':
        return 'bg-green-100 text-green-800'
      case 'invoiced':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon'
      case 'validated':
        return 'Validé'
      case 'invoiced':
        return 'Facturé'
      case 'cancelled':
        return 'Annulé'
      default:
        return status
    }
  }

  if (loading && deliveryNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau BL
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Numéro BL, notes..."
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les fournisseurs</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="validated">Validé</option>
              <option value="invoiced">Facturé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date jusqu'à</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Notes Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                  Date de livraison
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant HT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveryNotes.filter(d => !!d.id).map((deliveryNote) => (
                <tr key={deliveryNote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {deliveryNote.delivery_note_number || deliveryNote.reference || deliveryNote.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deliveryNote.supplier_name || deliveryNote.supplier?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deliveryNote.purchase_order?.po_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(deliveryNote.delivery_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(deliveryNote.total_amount_ht)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(deliveryNote.status)}`}>
                      {getStatusText(deliveryNote.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleView(deliveryNote.id!)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {deliveryNote.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleEdit(deliveryNote.id!)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleValidate(deliveryNote.id!)}
                            className="text-green-600 hover:text-green-900"
                            title="Valider"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(deliveryNote.id!)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      {deliveryNote.status === 'validated' && (
                        <button
                          onClick={() => handleCancel(deliveryNote.id!)}
                          className="text-red-600 hover:text-red-900"
                          title="Annuler"
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
        
        {deliveryNotes.length === 0 && !loading && (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun bon de livraison</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer un nouveau bon de livraison.
            </p>
            <div className="mt-6">
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau BL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliveryNotesPage
