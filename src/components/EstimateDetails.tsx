import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { PrintableEstimate } from './PrintableEstimate'
import { PrintStyles } from './PrintStyles'
import { formatCurrency, formatDate } from '../utils/formatters'
import { t } from '../i18n'
import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2,
  Send,
  ChevronDown,
  DollarSign,
  User,
  Wrench
} from 'lucide-react'
import { exportEstimateToCSV, exportEstimateToPDF, exportEstimateItemsToCSV } from '../utils/exportUtils'

interface EstimateDetailsProps {
  estimateId: string
}

export const EstimateDetails: React.FC<EstimateDetailsProps> = ({ estimateId }) => {
  const navigate = useNavigate()
  const { estimates, deleteEstimate, updateEstimate, convertEstimateToInvoice } = useEstimateInvoiceStore()
  const { jobOrders } = useJobOrderStore()
  const [showPrintView] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  const estimate = estimates.find(est => est.id === estimateId)
  const linkedJobOrder = estimate?.jobOrderId ? jobOrders.find(jo => jo.id === estimate.jobOrderId) : null

  if (!estimate) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('estimateDetails.notFound.title')}</h2>
          <p className="text-gray-600 mb-4">{t('estimateDetails.notFound.message')}</p>
          <button
            onClick={() => navigate('/estimates')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm rounded-lg"
          >
            {t('estimateDetails.notFound.backButton')}
          </button>
        </div>
      </div>
    )
  }

  const handleDelete = () => {
    if (window.confirm(t('estimateDetails.confirm.delete'))) {
      deleteEstimate(estimate.id)
      navigate('/estimates')
    }
  }

  const handleConvertToJobOrder = () => {
    if (window.confirm(t('estimateDetails.confirm.convertToJobOrder'))) {
      navigate('/job-orders/new', { 
        state: { 
          fromEstimate: true,
          estimateId: estimate.id,
          initialData: {
            customerId: estimate.customerId,
            vehicleId: estimate.vehicleId,
            description: estimate.items.map(item => item.description).join('\n'),
            parts: estimate.items.filter(item => item.type === 'part').map(item => ({
              id: `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: item.description,
              partNumber: item.partNumber || '',
              quantity: item.quantity,
              unitCost: item.unitPrice,
              totalCost: item.totalPrice,
              description: item.description,
              supplier: '',
              status: 'pending'
            })),
            laborItems: estimate.items.filter(item => item.type === 'labor' || item.type === 'service').map(item => ({
              id: `labor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              description: item.description,
              hours: item.quantity, // Assuming quantity matches hours for labor
              rate: item.unitPrice,
              total: item.totalPrice,
              mechanic: ''
            })),
            estimatedCost: estimate.totalAmount,
            notes: estimate.notes
          }
        } 
      })
    }
  }

  const handleConvertToInvoice = () => {
    if (window.confirm(t('estimateDetails.confirm.convertToInvoice'))) {
      const newInvoice = convertEstimateToInvoice(estimate.id)
      if (newInvoice) {
        navigate(`/invoices/${newInvoice.id}`)
      }
    }
  }

  const handlePrint = () => {
    exportEstimateToPDF(estimate)
  }

  const handleExportCSV = () => {
    exportEstimateToCSV(estimate)
  }

  const handleExportPDF = () => {
    exportEstimateToPDF(estimate)
  }

  const handleExportItemsCSV = () => {
    exportEstimateItemsToCSV(estimate)
  }

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return t('estimateDetails.statusLabels.accepted')
      case 'sent': return t('estimateDetails.statusLabels.sent')
      case 'rejected': return t('estimateDetails.statusLabels.rejected')
      case 'expired': return t('estimateDetails.status.expired')
      case 'draft': return t('estimateDetails.statusLabels.draft')
      default: return status
    }
  }

  const isExpired = new Date(estimate.expiryDate) < new Date() && estimate.status !== 'accepted'

  const handleStatusChange = (newStatus: 'draft' | 'sent' | 'accepted' | 'rejected') => {
    updateEstimate(estimate.id, { status: newStatus })
    setShowStatusDropdown(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/estimates')}
            className="text-gray-600 hover:text-gray-900 transition-colors p-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">
            {t('estimateDetails.titlePrefix')} {estimate.estimateNumber}
          </h1>
        </div>
        
        <div className="flex items-center space-x-3">

          {estimate.status === 'accepted' && !estimate.convertedToInvoice && (
            <>
              <button
                onClick={handleConvertToInvoice}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
              >
                <DollarSign className="w-4 h-4" />
                <span>{t('estimateDetails.actions.convertToInvoice')}</span>
              </button>
              <button
                onClick={handleConvertToJobOrder}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
              >
                <Wrench className="w-4 h-4" />
                <span>{t('estimateDetails.actions.convertToJobOrder')}</span>
              </button>
            </>
          )}
          <button
            onClick={handlePrint}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{t('estimateDetails.actions.print')}</span>
          </button>
          {/* Export Dropdown */}
          <div className="relative group">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center space-x-2 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              <span>{t('estimateDetails.actions.export')}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={handleExportPDF}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
              >
                {t('estimateDetails.actions.exportPdf')}
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                {t('estimateDetails.actions.exportCsv')}
              </button>
              <button
                onClick={handleExportItemsCSV}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
              >
                {t('estimateDetails.actions.exportItemsCsv')}
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate(`/estimates/edit/${estimate.id}`)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Edit className="w-4 h-4" />
            <span>{t('estimateDetails.actions.edit')}</span>
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('estimateDetails.actions.delete')}</span>
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(estimate.status)}`}>
              {getStatusIcon(estimate.status)}
              <span className="ml-1 capitalize">{getStatusText(estimate.status)}</span>
            </div>
            {isExpired && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <Clock className="w-4 h-4 mr-1" />
                {t('estimateDetails.status.expired')}
              </div>
            )}
            {estimate.convertedToInvoice && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <CheckCircle className="w-4 h-4 mr-1" />
                {t('estimateDetails.status.converted')}
              </div>
            )}
          </div>
          
          {!estimate.convertedToInvoice && (
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
              >
                <span>{t('estimateDetails.actions.updateStatus')}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  {(['draft', 'sent', 'accepted', 'rejected'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg capitalize"
                    >
                      {t(`estimateDetails.actions.setStatus.${status}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estimate Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            {t('estimateDetails.sections.customer')}
          </h2>
          <div className="space-y-2">
            <p><span className="font-medium">{t('estimateDetails.fields.name')}</span> {estimate.customerName}</p>
            <p><span className="font-medium">{t('estimateDetails.fields.customerId')}</span> {estimate.customerId}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            {t('estimateDetails.sections.vehicle')}
          </h2>
          <div className="space-y-2">
            <p><span className="font-medium">{t('estimateDetails.fields.makeModel')}</span> {estimate.vehicleInfo.make} {estimate.vehicleInfo.model}</p>
            <p><span className="font-medium">{t('estimateDetails.fields.year')}</span> {estimate.vehicleInfo.year}</p>
            <p><span className="font-medium">{t('estimateDetails.fields.vin')}</span> {estimate.vehicleInfo.vin}</p>
            <p><span className="font-medium">{t('estimateDetails.fields.registration')}</span> {estimate.vehicleInfo.registration}</p>
          </div>
        </div>
      </div>

      {/* Estimate Dates and Numbers */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">{t('estimateDetails.fields.estimateNumber')}</p>
            <p className="font-medium">{estimate.estimateNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('estimateDetails.fields.issueDate')}</p>
            <p className="font-medium">{formatDate(estimate.issueDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('estimateDetails.fields.expiryDate')}</p>
            <p className="font-medium">{formatDate(estimate.expiryDate)}</p>
          </div>
          {estimate.convertedToInvoice && (
            <div>
              <p className="text-sm text-gray-600">{t('estimateDetails.fields.convertedToInvoice')}</p>
              <p className="font-medium">{estimate.convertedToInvoice}</p>
            </div>
          )}
          {linkedJobOrder && (
            <div>
              <p className="text-sm text-gray-600">Ordre de réparation lié</p>
              <button
                onClick={() => navigate(`/job-orders/${linkedJobOrder.id}`)}
                className="font-medium text-blue-600 hover:text-blue-800 underline"
              >
                {linkedJobOrder.jobNumber}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('estimateDetails.sections.items')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">{t('estimateDetails.table.type')}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">{t('estimateDetails.table.description')}</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">{t('estimateDetails.table.quantity')}</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">{t('estimateDetails.table.unitPrice')}</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">{t('estimateDetails.table.total')}</th>
              </tr>
            </thead>
            <tbody>
              {estimate.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 capitalize">{item.type.replace('_', ' ')}</td>
                  <td className="py-3 px-4">{item.description}</td>
                  <td className="py-3 px-4 text-right">{item.quantity}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-end">
          <div className="w-full max-w-sm">
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">{t('estimateDetails.summary.subtotal')}</span>
                <span className="font-medium">{formatCurrency(estimate.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">{t('estimateDetails.summary.vat')}</span>
                <span className="font-medium">{formatCurrency(estimate.vatAmount)}</span>
              </div>
              <div className="flex justify-between py-2 text-lg">
                <span className="font-semibold text-gray-900">{t('estimateDetails.summary.total')}</span>
                <span className="font-bold text-gray-900">{formatCurrency(estimate.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      {(estimate.notes || estimate.termsAndConditions) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('estimateDetails.sections.additional')}</h2>
          {estimate.notes && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">{t('estimateDetails.fields.notes')}</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}
          {estimate.termsAndConditions && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">{t('estimateDetails.fields.terms')}</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{estimate.termsAndConditions}</p>
            </div>
          )}
        </div>
      )}

      {/* Print Styles */}
      <PrintStyles isVisible={showPrintView} />

      {/* Printable View (Hidden) */}
      {showPrintView && (
        <div className="print-only" style={{ display: 'none' }}>
          <PrintableEstimate estimate={estimate} />
        </div>
      )}
    </div>
  )
}
