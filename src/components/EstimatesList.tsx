import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { formatCurrency, formatDate } from '../utils/formatters'
import { exportEstimateToPDF } from '../utils/exportUtils'
import { t } from '../i18n'
import {
  Plus,
  Search,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Edit,
  Trash2,
  DollarSign,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const EstimatesList = () => {
  const navigate = useNavigate()
  const { estimates, deleteEstimate, convertEstimateToInvoice } = useEstimateInvoiceStore()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status' | 'number'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const textLimit = 10

  // Filter estimates based on search and filters
  const filteredEstimates = useMemo(() => {
    const filtered = estimates.filter(estimate => {
      const matchesSearch = 
        (estimate.estimateNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (estimate.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (estimate.vehicleInfo?.make?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (estimate.vehicleInfo?.model?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (estimate.vehicleInfo?.registration?.toLowerCase() || '').includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || estimate.status === statusFilter

      const now = new Date()
      const estimateDate = new Date(estimate.issueDate)
      const matchesDate = dateFilter === 'all' || 
        (dateFilter === 'today' && estimateDate.toDateString() === now.toDateString()) ||
        (dateFilter === 'week' && estimateDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
        (dateFilter === 'month' && estimateDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))

      return matchesSearch && matchesStatus && matchesDate
    })

    // Sort estimates
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
          break
        case 'amount':
          comparison = a.totalAmount - b.totalAmount
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'number':
          comparison = a.estimateNumber.localeCompare(b.estimateNumber)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [estimates, searchTerm, statusFilter, dateFilter, sortBy, sortOrder])

  const totalPages = Math.ceil(filteredEstimates.length / pageSize) || 1

  const paginatedEstimates = useMemo(
    () =>
      filteredEstimates.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredEstimates, currentPage, pageSize]
  )

  const truncateText = (value: string, max: number) => {
    if (!value) return ''
    return value.length <= max ? value : `${value.slice(0, max)}…`
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, dateFilter, sortBy, sortOrder])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="w-4 h-4" />
      case 'sent': return <Send className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      case 'expired': return <Clock className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const handleDelete = (estimateId: string) => {
    if (window.confirm('Are you sure you want to delete this estimate? This action cannot be undone.')) {
      deleteEstimate(estimateId)
    }
  }

  const handleConvertToInvoice = (estimateId: string) => {
    if (window.confirm('Convert this estimate to an invoice? This will create a new invoice based on this estimate.')) {
      const newInvoice = convertEstimateToInvoice(estimateId)
      if (newInvoice) {
        navigate(`/invoices/${newInvoice.id}`)
      }
    }
  }

  const printEstimate = (estimateId: string) => {
    const est = estimates.find(e => e.id === estimateId)
    if (!est) return
    exportEstimateToPDF(est)
  }

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('estimatesList.header')}</h1>
          <p className="text-gray-600 mt-1">{t('estimatesList.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/estimates/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{t('estimatesList.actions.new')}</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('estimatesList.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('estimatesList.filters.statusOptions.all')}</option>
              <option value="draft">{t('estimatesList.filters.statusOptions.draft')}</option>
              <option value="sent">{t('estimatesList.filters.statusOptions.sent')}</option>
              <option value="accepted">{t('estimatesList.filters.statusOptions.accepted')}</option>
              <option value="rejected">{t('estimatesList.filters.statusOptions.rejected')}</option>
              <option value="expired">{t('estimatesList.filters.statusOptions.expired')}</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('estimatesList.filters.dateOptions.all')}</option>
              <option value="today">{t('estimatesList.filters.dateOptions.today')}</option>
              <option value="week">{t('estimatesList.filters.dateOptions.week')}</option>
              <option value="month">{t('estimatesList.filters.dateOptions.month')}</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field as any)
                setSortOrder(order as 'asc' | 'desc')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date-desc">{t('estimatesList.filters.sortOptions.newest')}</option>
              <option value="date-asc">{t('estimatesList.filters.sortOptions.oldest')}</option>
              <option value="amount-desc">{t('estimatesList.filters.sortOptions.highestAmount')}</option>
              <option value="amount-asc">{t('estimatesList.filters.sortOptions.lowestAmount')}</option>
              <option value="number-asc">{t('estimatesList.filters.sortOptions.number')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600">
          {t('estimatesList.resultsCountPrefix')} {filteredEstimates.length} {t('estimatesList.resultsCountMid')} {estimates.length} {t('estimatesList.resultsCountSuffix')}
        </p>
      </div>

      {/* Estimates Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredEstimates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('estimatesList.empty.title')}</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                ? t('estimatesList.empty.tipSearch')
                : t('estimatesList.empty.tipCreate')
              }
            </p>
            {!searchTerm && statusFilter === 'all' && dateFilter === 'all' && (
              <button
                onClick={() => navigate('/estimates/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                {t('estimatesList.empty.createFirst')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('estimatesList.table.estimateNumber')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('estimatesList.table.customer')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('estimatesList.table.vehicle')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('estimatesList.table.date')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('estimatesList.table.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('estimatesList.table.amount')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('estimatesList.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEstimates.map((estimate) => {
                  const vehicleLabel = `${estimate.vehicleInfo?.year ?? ''} ${estimate.vehicleInfo?.make ?? ''} ${estimate.vehicleInfo?.model ?? ''}`.trim()
                  const registrationLabel = estimate.vehicleInfo?.registration || ''

                  return (
                    <tr key={estimate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="text-sm font-medium text-gray-900"
                          title={estimate.estimateNumber}
                        >
                          {truncateText(estimate.estimateNumber, textLimit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="text-sm font-medium text-gray-900"
                          title={estimate.customerName}
                        >
                          {truncateText(estimate.customerName, textLimit)}
                        </div>
                        <div
                          className="text-sm text-gray-500"
                          title={`${t('estimatesList.table.customerIdPrefix')} ${estimate.customerId}`}
                        >
                          {t('estimatesList.table.customerIdPrefix')} {truncateText(estimate.customerId, textLimit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="text-sm text-gray-900"
                          title={vehicleLabel}
                        >
                          {truncateText(vehicleLabel, textLimit)}
                        </div>
                        <div
                          className="text-sm text-gray-500"
                          title={registrationLabel}
                        >
                          {truncateText(registrationLabel, textLimit)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(estimate.issueDate)}</div>
                        <div className="text-sm text-gray-500">
                          {isExpired(estimate.expiryDate) ? (
                            <span className="text-red-600">{t('estimatesList.expiry.expired')}</span>
                          ) : (
                            `${t('estimatesList.expiry.expiresOnPrefix')} ${formatDate(estimate.expiryDate)}`
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
                          {getStatusIcon(estimate.status)}
                          <span className="ml-1 capitalize">{t(`estimatesList.statusText.${estimate.status}`)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(estimate.totalAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/estimates/${estimate.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('estimatesList.actions.view')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => printEstimate(estimate.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Voir devis"
                            aria-label="Voir devis"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/estimates/edit/${estimate.id}`)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title={t('estimatesList.actions.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {estimate.status === 'accepted' && !estimate.convertedToInvoice && (
                            <button
                              onClick={() => handleConvertToInvoice(estimate.id)}
                              className="text-green-600 hover:text-green-900"
                              title={t('estimatesList.actions.convert')}
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(estimate.id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('estimatesList.actions.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
      {null}
    </div>
  )
}

export default EstimatesList
