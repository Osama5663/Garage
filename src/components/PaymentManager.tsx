import React, { useState } from 'react'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { Invoice } from '../types/estimate'
import { formatCurrency, formatDate } from '../utils/formatters'

interface PaymentManagerProps {
  invoice: Invoice
  onClose: () => void
  onPaymentRecorded: () => void
}

export const PaymentManager: React.FC<PaymentManagerProps> = ({
  invoice,
  onClose,
  onPaymentRecorded
}) => {
  const { recordPayment, markInvoiceAsPaid, markInvoiceAsUnpaid } = useEstimateInvoiceStore()
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'check'>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const remainingAmount = invoice.totalAmount - invoice.amountPaid
  const canMarkAsPaid = remainingAmount > 0 && remainingAmount <= 0.01 // Allow for small rounding differences

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid payment amount')
      setIsSubmitting(false)
      return
    }

    if (amount > remainingAmount) {
      setError(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`)
      setIsSubmitting(false)
      return
    }

    try {
      await recordPayment(invoice.id, amount, paymentMethod, paymentReference.trim() || '')
      onPaymentRecorded()
      
      // Reset form if not fully paid
      if (amount < remainingAmount) {
        setPaymentAmount('')
        setPaymentReference('')
        setNotes('')
      } else {
        // Close if fully paid
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (window.confirm('Mark this invoice as fully paid? This will record a payment for the remaining balance.')) {
      try {
        await markInvoiceAsPaid(invoice.id)
        onPaymentRecorded()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark as paid')
      }
    }
  }

  const handleMarkAsUnpaid = async () => {
    if (window.confirm('Mark this invoice as unpaid? This will reset the payment status.')) {
      try {
        await markInvoiceAsUnpaid(invoice.id)
        onPaymentRecorded()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark as unpaid')
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Payment Management
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Invoice Total:</span>
            <span className="font-semibold">{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Amount Paid:</span>
            <span className="font-semibold text-green-600">{formatCurrency(invoice.amountPaid)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Remaining:</span>
            <span className={`font-semibold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(remainingAmount)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              invoice.paymentStatus === 'paid' 
                ? 'bg-green-100 text-green-800'
                : invoice.paymentStatus === 'partial'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {invoice.paymentStatus === 'paid' ? 'Paid' : 
               invoice.paymentStatus === 'partial' ? 'Partially Paid' : 'Unpaid'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {invoice.paymentStatus !== 'paid' && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Max: ${formatCurrency(remainingAmount)}`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="card">Credit/Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference (Optional)
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Transaction ID, check number, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional payment notes..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </button>
              {canMarkAsPaid && (
                <button
                  type="button"
                  onClick={handleMarkAsPaid}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark as Paid
                </button>
              )}
            </div>
          </form>
        )}

        {invoice.paymentStatus === 'paid' && (
          <div className="space-y-3">
            <button
              onClick={handleMarkAsUnpaid}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Mark as Unpaid
            </button>
          </div>
        )}

        {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Payment History</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {invoice.paymentHistory.map((payment) => (
                <div key={payment.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                    <span className="text-sm text-gray-600">{formatDate(payment.paymentDate)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                    {payment.reference && (
                    <span> • Ref: {payment.reference}</span>
                  )}
                  </div>
                  {payment.notes && (
                    <div className="text-sm text-gray-500 mt-1">{payment.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}