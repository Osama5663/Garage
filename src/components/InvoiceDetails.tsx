import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useHasRole } from '../stores/authStore'
// Payment features removed
// PrintableInvoice and PrintStyles no longer used for jsPDF generation
import { formatCurrency, formatDate } from '../utils/formatters'
import { t } from '../i18n'
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2,
  Mail,
  FileText,
  User
} from 'lucide-react'
import { PaymentManager } from './PaymentManager'
import { toast } from 'sonner'
// import { exportInvoiceToCSV, exportInvoiceItemsToCSV } from '../utils/exportUtils'

interface InvoiceDetailsProps {
  invoiceId: string
}

export const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoiceId }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { invoices, deleteInvoice } = useEstimateInvoiceStore()
  // deprecated print preview state removed
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState<{ to: string; subject: string; message: string }>({ to: '', subject: '', message: '' })
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({})
  const [showPaymentManager, setShowPaymentManager] = useState(false)

  const invoice = invoices.find(inv => inv.id === invoiceId)
  const showTVA = useHasRole(['admin','cashier'])

  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Facture introuvable</h2>
          <p className="text-gray-600 mb-4">La facture que vous cherchez n'existe pas.</p>
          <button
            onClick={() => navigate('/invoices')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retour aux factures
          </button>
        </div>
      </div>
    )
  }

  const remainingAmount = invoice.totalAmount - invoice.amountPaid
  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.paymentStatus !== 'paid'

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('payment') === 'true') {
      setShowPaymentManager(true)
    }
  }, [location.search])
  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.')) {
      try {
        await deleteInvoice(invoice.id);
        toast.success('Facture supprimée avec succès');
        navigate('/invoices');
      } catch (error) {
        toast.error('Échec de la suppression de la facture');
      }
    }
  };

  

  const handlePrint = () => {
    // Open the print preview in a new tab, consistent with Job Order print
    const url = `/print/invoice/${invoice.id}`
    window.open(url, '_blank')
  }

  const openEmailModal = () => {
    setEmailForm({
      to: '',
      subject: `Facture ${invoice.invoiceNumber}`,
      message: `Bonjour,\n\nVeuillez trouver les détails de la facture ${invoice.invoiceNumber}.\nMontant total: ${formatCurrency(invoice.totalAmount)}\nÉchéance: ${formatDate(invoice.dueDate)}\n\nMerci.`
    })
    setEmailErrors({})
    setShowEmailModal(true)
  }

  const validateEmail = (): boolean => {
    const errs: Record<string, string> = {}
    if (!emailForm.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.to)) errs.to = 'Adresse e‑mail invalide'
    if (!emailForm.subject) errs.subject = 'Sujet requis'
    setEmailErrors(errs)
    return Object.keys(errs).length === 0
  }

  const sendEmail = () => {
    if (!validateEmail()) return
    const body = encodeURIComponent(emailForm.message)
    const subject = encodeURIComponent(emailForm.subject)
    const mailto = `mailto:${emailForm.to}?subject=${subject}&body=${body}`
    window.location.href = mailto
    setShowEmailModal(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />
      case 'partial': return <Clock className="w-4 h-4" />
      default: return <XCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/invoices')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('invoiceDetails.header')}</h1>
            <p className="text-gray-600">{invoice.invoiceNumber}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              aria-label={t('invoiceDetails.actions.print')}
            >
              <Printer className="w-4 h-4" />
              <span>{t('invoiceDetails.actions.print')}</span>
            </button>
          <button
            onClick={openEmailModal}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            aria-label={t('invoiceDetails.actions.email')}
          >
            <Mail className="w-4 h-4" />
            <span>{t('invoiceDetails.actions.email')}</span>
          </button>
          <button
            onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            aria-label={t('invoiceDetails.actions.edit')}
          >
            <Edit className="w-4 h-4" />
            <span>{t('invoiceDetails.actions.edit')}</span>
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            aria-label={t('invoiceDetails.actions.delete')}
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('invoiceDetails.actions.delete')}</span>
          </button>
        </div>
      </div>

      {/* Status Banner (payments removed) */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.paymentStatus)}`}>
              {getPaymentStatusIcon(invoice.paymentStatus)}
              <span className="ml-1 capitalize">
                {invoice.paymentStatus === 'partial' ? t('invoicesList.paymentStatusText.partial') : t(`invoicesList.paymentStatusText.${invoice.paymentStatus}`)}
              </span>
            </div>
            {isOverdue && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <Clock className="w-4 h-4 mr-1" />
                {t('invoicesList.badge.overdue')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Informations client
          </h2>
          <div className="space-y-2">
            <p><span className="font-medium">Nom:</span> {invoice.customerName}</p>
            <p><span className="font-medium">ID client:</span> {invoice.customerId}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Informations véhicule
          </h2>
          <div className="space-y-2">
            <p><span className="font-medium">Marque/Modèle:</span> {invoice.vehicleInfo.make} {invoice.vehicleInfo.model}</p>
            <p><span className="font-medium">Année:</span> {invoice.vehicleInfo.year}</p>
            <p><span className="font-medium">NIV:</span> {invoice.vehicleInfo.vin}</p>
            <p><span className="font-medium">Immatriculation:</span> {invoice.vehicleInfo.registration}</p>
          </div>
        </div>
      </div>

      {/* Invoice Dates and Numbers */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Numéro de facture</p>
            <p className="font-medium">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date d'émission</p>
            <p className="font-medium">{formatDate(invoice.issueDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date d'échéance</p>
            <p className="font-medium">{formatDate(invoice.dueDate)}</p>
          </div>
          {invoice.estimateId && (
            <div>
              <p className="text-sm text-gray-600">Depuis devis</p>
              <p className="font-medium">{invoice.estimateId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Articles de facture</h2>
        <div className="overflow-x-auto" id="invoice-items">
          <table className="w-full" aria-label="Articles de facture">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Quantité</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Prix unitaire (HT)</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Total (HT)</th>
                {showTVA && (
                  <th className="text-right py-3 px-4 font-medium text-gray-700">TVA (20%)</th>
                )}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 capitalize">{item.type.replace('_', ' ')}</td>
                  <td className="py-3 px-4">{item.description}</td>
                  <td className="py-3 px-4 text-right">{item.quantity}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                  {showTVA && (
                    <td className="py-3 px-4 text-right">{formatCurrency((item.totalPrice || 0) * (item.taxRate ?? 0.2))}</td>
                  )}
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
                <span className="text-gray-600">Sous-total:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">TVA (20%):</span>
                <span className="font-medium">{formatCurrency(invoice.vatAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="font-medium text-gray-900">Total:</span>
                <span className="font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Montant payé:</span>
                <span className="font-medium text-green-600">{formatCurrency(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold text-gray-900">Solde restant:</span>
                <span className={`font-bold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      {(invoice.notes || invoice.termsAndConditions) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations supplémentaires</h2>
          {invoice.notes && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
          {invoice.termsAndConditions && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Conditions générales</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{invoice.termsAndConditions}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Historique des paiements</h2>
          <div className="space-y-3">
            {invoice.paymentHistory.map((payment) => (
              <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-lg">{formatCurrency(payment.amount)}</span>
                  <span className="text-sm text-gray-600">{formatDate(payment.paymentDate)}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                  {payment.reference && (
                    <span className="ml-2">• Référence: {payment.reference}</span>
                  )}
                </div>
                {payment.notes && (
                  <div className="text-sm text-gray-500">{payment.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showPaymentManager && (
        <PaymentManager
          invoice={invoice}
          onClose={() => setShowPaymentManager(false)}
          onPaymentRecorded={() => {}}
        />
      )}

      {/* PDF generation uses jsPDF; print-only DOM removed */}

      {/* Payment Manager removed */}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="email-title">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 id="email-title" className="text-lg font-semibold text-gray-900">Envoyer la facture par e‑mail</h2>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">À *</label>
                <input
                  type="email"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailErrors.to ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="client@example.com"
                />
                {emailErrors.to && <p className="text-red-500 text-xs mt-1">{emailErrors.to}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sujet *</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailErrors.subject ? 'border-red-500' : 'border-gray-300'}`}
                />
                {emailErrors.subject && <p className="text-red-500 text-xs mt-1">{emailErrors.subject}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={sendEmail} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Envoyer</button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
}

 
