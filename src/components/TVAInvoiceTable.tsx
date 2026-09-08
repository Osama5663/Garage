import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Search, Filter, AlertTriangle } from 'lucide-react'
import { Invoice, TVAAnomalies } from '../types/tva'
import { formatCurrency, formatDate } from '../utils/formatters'

interface TVAInvoiceTableProps {
  invoices: Invoice[]
  type: 'sales' | 'purchases'
  onExportCSV: () => void
  anomalies: TVAAnomalies
  limit?: number
  showMoreHref?: string
}

export const TVAInvoiceTable: React.FC<TVAInvoiceTableProps> = ({
  invoices,
  type,
  onExportCSV,
  anomalies,
  limit,
  showMoreHref
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof Invoice>('invoiceDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      validated: 'bg-green-100 text-green-800',
      paid: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    const labels = {
      draft: 'Brouillon',
      validated: 'Validée',
      paid: 'Payée',
      cancelled: 'Annulée'
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getAnomalyBadge = (invoice: Invoice) => {
    const anomalies = []
    
    if (Math.abs(invoice.tvaRate - 0.20) > 0.001) {
      anomalies.push('Taux non standard')
    }
    if (invoice.totalTVA < 0) {
      anomalies.push('TVA négative')
    }
    if (invoice.totalTVA === 0) {
      anomalies.push('TVA nulle')
    }
    if (invoice.totalHT > 0) {
      const actualRatio = invoice.totalTVA / invoice.totalHT
      if (Math.abs(actualRatio - 0.20) > 0.05) {
        anomalies.push('Ratio anormal')
      }
    }

    if (anomalies.length === 0) return null

    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <span className="text-xs text-orange-600 font-medium">
          {anomalies.join(', ')}
        </span>
      </div>
    )
  }

  const filteredAndSortedInvoices = invoices
    .filter(invoice => {
      const matchesSearch = searchTerm === '' || 
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (type === 'sales' && invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (type === 'purchases' && invoice.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

  const visibleInvoices =
    typeof limit === 'number' ? filteredAndSortedInvoices.slice(0, Math.max(0, limit)) : filteredAndSortedInvoices
  const isLimited =
    typeof limit === 'number' && limit >= 0 && filteredAndSortedInvoices.length > limit

  const handleSort = (field: keyof Invoice) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: keyof Invoice) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {type === 'sales' ? 'Factures de vente' : 'Factures d\'achat'}
            </h3>
            <p className="text-sm text-gray-600">
              {visibleInvoices.length} / {filteredAndSortedInvoices.length} facture{filteredAndSortedInvoices.length !== 1 ? 's' : ''}
              {anomalies.totalAnomalies > 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  ({anomalies.totalAnomalies} anomalie{anomalies.totalAnomalies !== 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isLimited && showMoreHref ? (
              <Link
                to={showMoreHref}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Voir plus
              </Link>
            ) : null}
            <button
              onClick={onExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Rechercher par numéro ${type === 'sales' ? 'ou client' : 'ou fournisseur'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="validated">Validée</option>
              <option value="paid">Payée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('invoiceNumber')}
              >
                Numéro {getSortIcon('invoiceNumber')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('invoiceDate')}
              >
                Date {getSortIcon('invoiceDate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {type === 'sales' ? 'Client' : 'Fournisseur'}
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalHT')}
              >
                HT {getSortIcon('totalHT')}
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalTVA')}
              >
                TVA {getSortIcon('totalTVA')}
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalTTC')}
              >
                TTC {getSortIcon('totalTTC')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taux TVA
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Anomalies
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleInvoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(invoice.invoiceDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {type === 'sales' ? invoice.customerName : invoice.supplierName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  {formatCurrency(invoice.totalHT)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  {formatCurrency(invoice.totalTVA)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                  {formatCurrency(invoice.totalTTC)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {(invoice.tvaRate * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getAnomalyBadge(invoice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedInvoices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune facture trouvée pour les critères sélectionnés.</p>
        </div>
      )}
    </div>
  )
}
