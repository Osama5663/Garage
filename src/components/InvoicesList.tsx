import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useCustomerStore } from '../stores/customerStore'
import { useSettingsStore } from '../stores/settingsStore'
import { formatCurrency, formatDate } from '../utils/formatters'
import { renderDocument, convertWorkshopSettings } from '../utils/renderDocument'
import { printHtml } from '../utils/printHelpers'
import { t } from '../i18n'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2,
  CreditCard,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const InvoicesList = () => {
  const navigate = useNavigate()
  const { invoices, deleteInvoice } = useEstimateInvoiceStore()
  const { customers } = useCustomerStore()
  const { workshop } = useSettingsStore()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'paymentStatus' | 'status' | 'number'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const textLimit = 10

  // Filter invoices based on search and filters
  const filteredInvoices = useMemo(() => {
    const filtered = invoices.filter(invoice => {
      const matchesSearch = 
        (invoice.invoiceNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (invoice.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (invoice.vehicleInfo?.make?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (invoice.vehicleInfo?.model?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (invoice.vehicleInfo?.registration?.toLowerCase() || '').includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
      const matchesPaymentStatus = paymentStatusFilter === 'all' || invoice.paymentStatus === paymentStatusFilter

      const now = new Date()
      const invoiceDate = new Date(invoice.issueDate)
      const matchesDate = dateFilter === 'all' || 
        (dateFilter === 'today' && invoiceDate.toDateString() === now.toDateString()) ||
        (dateFilter === 'week' && invoiceDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
        (dateFilter === 'month' && invoiceDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))

      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesDate
    })

    // Sort invoices
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
          break
        case 'amount':
          comparison = a.totalAmount - b.totalAmount
          break
        case 'paymentStatus':
          comparison = a.paymentStatus.localeCompare(b.paymentStatus)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'number':
          comparison = a.invoiceNumber.localeCompare(b.invoiceNumber)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [invoices, searchTerm, statusFilter, paymentStatusFilter, dateFilter, sortBy, sortOrder])

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1

  const paginatedInvoices = useMemo(
    () =>
      filteredInvoices.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredInvoices, currentPage, pageSize]
  )

  const truncateText = (value: string, max: number) => {
    if (!value) return ''
    return value.length <= max ? value : `${value.slice(0, max)}…`
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, paymentStatusFilter, dateFilter, sortBy, sortOrder])

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />
      case 'partial': return <Clock className="w-4 h-4" />
      default: return <XCircle className="w-4 h-4" />
    }
  }

  const isOverdue = (dueDate: string, paymentStatus: string) => {
    return new Date(dueDate) < new Date() && paymentStatus !== 'paid'
  }

  const handleDelete = async (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await deleteInvoice(invoiceId);
        toast.success('Invoice deleted successfully');
      } catch (error) {
        toast.error('Failed to delete invoice');
      }
    }
  }

  const handlePayment = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}?payment=true`)
  }

  const handleQuickPrint = async (inv: typeof invoices[number]) => {
    if (inv.customData?.invoiceType === 'SNTL') {
      try {
        const customer = customers.find(c => c.id === inv.customerId)
        const subtotal = inv.items.reduce((sum, item) => sum + item.totalPrice, 0)
        const vatTotal = inv.items.reduce((sum, item) => sum + (item.totalPrice * item.taxRate / 100), 0)
        const grandTotal = subtotal + vatTotal
        
        const doc = {
          number: inv.invoiceNumber,
          date: inv.issueDate,
          lines: inv.items.map((item, index) => ({
            ref: item.type === 'service' ? 'MO' : `P${index + 1}`,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.totalPrice,
            tvaRate: item.taxRate
          })),
          labor: [],
          subtotal: subtotal,
          vatTotal: vatTotal,
          grandTotal: grandTotal,
          description: inv.notes || '',
          blNumber: inv.customData?.blNumber || ''
        }
        
        const cust = {
          name: inv.customerName,
          address: customer ? `${customer.address.street}, ${customer.address.zipCode} ${customer.address.city}` : '',
          postalCode: customer?.address.zipCode ?? '',
          city: customer?.address.city ?? '',
          phone: customer?.phone || '',
          email: customer?.email || ''
        }
        
        const veh = {
          make: inv.vehicleInfo?.make || '',
          model: inv.vehicleInfo?.model || '',
          registration: inv.vehicleInfo?.registration || '',
          vin: inv.vehicleInfo?.vin || '',
          year: inv.vehicleInfo?.year || new Date().getFullYear(),
          mileage: undefined
        }
        
        const html = renderDocument('facture-sntl', convertWorkshopSettings(workshop!), doc, cust, veh)
        await printHtml(html)
      } catch (error) {
        console.error('Print error:', error)
        toast.error("Erreur lors de l'impression de la facture SNTL")
      }
    } else {
      try {
        const customer = customers.find(c => c.id === inv.customerId)

        const laborItems = (inv.items || []).filter((i: any) => i.type === 'labor' || i.type === 'service')
        const partItems = (inv.items || []).filter((i: any) => !(i.type === 'labor' || i.type === 'service'))
        const partsSubtotal = partItems.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0)
        const laborSubtotal = laborItems.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0)

        const docData = {
          number: inv.invoiceNumber,
          date: inv.issueDate,
          dueDate: inv.dueDate,
          lines: partItems.map((item: any, index: number) => ({
            ref: `L${String(index + 1).padStart(3, '0')}`,
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: Number(item.discountRate ?? 0),
            lineTotal: item.totalPrice,
            tvaRate: (() => {
              const raw = Number(item.taxRate ?? 20)
              return raw <= 1 ? raw * 100 : raw
            })()
          })),
          labor: laborItems.map((item: any) => ({
            category: item.category,
            description: item.description,
            shortDescription: item.notes,
            hours: item.quantity,
            hourlyRate: item.unitPrice,
            discount: Number(item.discountRate ?? 0),
            totalAmount: item.totalPrice,
            tvaRate: (() => {
              const raw = Number(item.taxRate ?? 20)
              return raw <= 1 ? raw * 100 : raw
            })()
          })),
          subtotal: inv.subtotal,
          partsSubtotal,
          laborSubtotal,
          vatTotal: inv.vatAmount,
          grandTotal: inv.totalAmount,
          paid: inv.amountPaid,
          balance: inv.totalAmount - inv.amountPaid,
          payments: []
        }

        const cust = {
          name: inv.customerName,
          address: customer ? `${customer.address.street}, ${customer.address.zipCode} ${customer.address.city}` : '',
          postalCode: customer?.address.zipCode ?? '',
          city: customer?.address.city ?? '',
          phone: customer?.phone || '',
          email: customer?.email || ''
        }

        const veh = {
          make: inv.vehicleInfo?.make || '',
          model: inv.vehicleInfo?.model || '',
          registration: inv.vehicleInfo?.registration || '',
          vin: inv.vehicleInfo?.vin || '',
          year: inv.vehicleInfo?.year || new Date().getFullYear()
        }

        const html = renderDocument('facture', convertWorkshopSettings(workshop!), docData, cust, veh)
        await printHtml(html)
      } catch (error) {
        console.error('Print error:', error)
        toast.error("Erreur lors de l'impression de la facture")
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('invoicesList.header')}</h1>
          <p className="text-gray-600 mt-1">{t('invoicesList.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/sales/sntl-invoice/new')}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Facture SNTL</span>
          </button>
          <button
            onClick={() => navigate('/invoices/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{t('invoicesList.actions.new')}</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('invoicesList.searchPlaceholder')}
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
              <option value="all">{t('invoicesList.filters.statusOptions.all')}</option>
              <option value="draft">{t('invoicesList.filters.statusOptions.draft')}</option>
              <option value="sent">{t('invoicesList.filters.statusOptions.sent')}</option>
              <option value="paid">{t('invoicesList.filters.statusOptions.paid')}</option>
              <option value="overdue">{t('invoicesList.filters.statusOptions.overdue')}</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('invoicesList.filters.paymentOptions.all')}</option>
              <option value="unpaid">{t('invoicesList.filters.paymentOptions.unpaid')}</option>
              <option value="partial">{t('invoicesList.filters.paymentOptions.partial')}</option>
              <option value="paid">{t('invoicesList.filters.paymentOptions.paid')}</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('invoicesList.filters.dateOptions.all')}</option>
              <option value="today">{t('invoicesList.filters.dateOptions.today')}</option>
              <option value="week">{t('invoicesList.filters.dateOptions.week')}</option>
              <option value="month">{t('invoicesList.filters.dateOptions.month')}</option>
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
              <option value="date-desc">{t('invoicesList.filters.sortOptions.newest')}</option>
              <option value="date-asc">{t('invoicesList.filters.sortOptions.oldest')}</option>
              <option value="amount-desc">{t('invoicesList.filters.sortOptions.highestAmount')}</option>
              <option value="amount-asc">{t('invoicesList.filters.sortOptions.lowestAmount')}</option>
              <option value="paymentStatus-asc">{t('invoicesList.filters.sortOptions.payment')}</option>
              <option value="number-asc">{t('invoicesList.filters.sortOptions.number')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600">
          {t('invoicesList.resultsCountPrefix')} {filteredInvoices.length} {t('invoicesList.resultsCountMid')} {invoices.length} {t('invoicesList.resultsCountSuffix')}
        </p>
        <div className="text-sm text-gray-500">
          {t('invoicesList.totalOutstanding')}: {formatCurrency(
            filteredInvoices
              .filter(inv => inv.paymentStatus !== 'paid')
              .reduce((sum, inv) => sum + (inv.totalAmount - inv.amountPaid), 0)
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('invoicesList.empty.title')}</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' || dateFilter !== 'all' 
                ? t('invoicesList.empty.tipSearch')
                : t('invoicesList.empty.tipCreate')
              }
            </p>
            {!searchTerm && statusFilter === 'all' && paymentStatusFilter === 'all' && dateFilter === 'all' && (
              <button
                onClick={() => navigate('/invoices/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                {t('invoicesList.empty.createFirst')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoicesList.table.invoiceNumber')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoicesList.table.customer')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoicesList.table.vehicle')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoicesList.table.date')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoicesList.table.amount')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoicesList.table.paymentStatus')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoicesList.table.dueDate')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoicesList.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedInvoices.map((invoice) => {
                  const vehicleLabel = `${invoice.vehicleInfo?.year ?? ''} ${invoice.vehicleInfo?.make ?? ''} ${invoice.vehicleInfo?.model ?? ''}`.trim()
                  const registrationLabel = invoice.vehicleInfo?.registration || ''

                  return (
                    <tr key={invoice.id} className={`hover:bg-gray-50 ${isOverdue(invoice.dueDate, invoice.paymentStatus) ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="text-sm font-medium text-gray-900"
                          title={invoice.invoiceNumber}
                        >
                          {truncateText(invoice.invoiceNumber, textLimit)}
                        </div>
                        {invoice.estimateId && (
                          <div
                            className="text-xs text-gray-500"
                            title={`${t('invoicesList.table.fromEstimatePrefix')} ${invoice.estimateId}`}
                          >
                            {t('invoicesList.table.fromEstimatePrefix')} {truncateText(invoice.estimateId, textLimit)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="text-sm font-medium text-gray-900"
                          title={invoice.customerName}
                        >
                          {truncateText(invoice.customerName, textLimit)}
                        </div>
                        <div
                          className="text-sm text-gray-500"
                          title={`${t('invoicesList.table.customerIdPrefix')} ${invoice.customerId}`}
                        >
                          {t('invoicesList.table.customerIdPrefix')} {truncateText(invoice.customerId, textLimit)}
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
                        <div className="text-sm text-gray-900">{formatDate(invoice.issueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</div>
                        <div className="text-xs text-gray-500">
                          {t('invoicesList.table.paidPrefix')}: {formatCurrency(invoice.amountPaid)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                          {getPaymentStatusIcon(invoice.paymentStatus)}
                          <span className="ml-1 capitalize">
                            {t(`invoicesList.paymentStatusText.${invoice.paymentStatus}`)}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(invoice.dueDate)}</div>
                        {isOverdue(invoice.dueDate, invoice.paymentStatus) && (
                          <div className="text-xs text-red-600 font-medium">{t('invoicesList.badge.overdue')}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                                if (invoice.customData?.invoiceType === 'SNTL') {
                                    navigate(`/sales/sntl-invoice/${invoice.id}`)
                                } else {
                                    navigate(`/invoices/${invoice.id}`)
                                }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('invoicesList.actions.view')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                                if (invoice.customData?.invoiceType === 'SNTL') {
                                    navigate(`/sales/sntl-invoice/${invoice.id}`)
                                } else {
                                    navigate(`/invoices/edit/${invoice.id}`)
                                }
                            }}
                            className="text-yellow-600 hover:text-yellow-900"
                            title={t('invoicesList.actions.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {invoice.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => handlePayment(invoice.id)}
                              className="text-green-600 hover:text-green-900"
                            title={t('invoicesList.actions.recordPayment')}
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleQuickPrint(invoice)}
                            className="text-gray-700 hover:text-gray-900"
                            title={t('invoicesList.actions.print')}
                            aria-label={t('invoicesList.actions.print')}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('invoicesList.actions.delete')}
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
    </div>
  )
}

export default InvoicesList
