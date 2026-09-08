import React, { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useWorkshopSettings } from '../stores/settingsStore'
import { renderDocument, convertWorkshopSettings } from '../utils/renderDocument'
import { printHtml } from '../utils/printHelpers'
import { Printer } from 'lucide-react'

export const InvoicePrintPage: React.FC = () => {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const { invoices, paymentRecords } = useEstimateInvoiceStore()
  const invoice = invoices.find(inv => inv.id === (id || ''))
  const workshop = useWorkshopSettings()
  
  useEffect(() => {
    if (sp.get('print') === '1' && invoice) {
      // Auto-click the print button after a short delay
      const timer = setTimeout(() => {
        const printBtn = document.getElementById('invoice-print-btn')
        if (printBtn) printBtn.click()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [sp, invoice])

  if (!invoice) {
    return <div className="p-6 text-center">Invoice introuvable</div>
  }

  const recordsForInvoice = (paymentRecords || []).filter(p => p.invoiceId === invoice.id)
  const paymentHistory = (invoice.paymentHistory && invoice.paymentHistory.length > 0) ? invoice.paymentHistory : recordsForInvoice

  const laborItems = (invoice.items || []).filter((i: any) => i.type === 'labor' || i.type === 'service')
  const partItems = (invoice.items || []).filter((i: any) => !(i.type === 'labor' || i.type === 'service'))
  const partsSubtotal = partItems.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0)
  const laborSubtotal = laborItems.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0)

  const docData = {
    number: invoice.invoiceNumber,
    date: invoice.issueDate,
    dueDate: invoice.dueDate,
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
    subtotal: invoice.subtotal,
    partsSubtotal,
    laborSubtotal,
    vatTotal: invoice.vatAmount,
    grandTotal: invoice.totalAmount,
    paid: invoice.amountPaid,
    balance: invoice.totalAmount - invoice.amountPaid,
    payments: (paymentHistory || []).map(p => ({
      date: p.paymentDate,
      amount: p.amount,
      method: p.paymentMethod,
      reference: p.reference
    })),
    // Explicitly remove modelHtml to ensure built-in template is used
    modelHtml: null 
  }

  const customer = {
    name: invoice.customerName,
    address: (invoice as any).customerAddress || '',
    postalCode: (invoice as any).customerPostalCode || '',
    city: (invoice as any).customerCity || '',
    phone: (invoice as any).customerPhone || '',
    email: (invoice as any).customerEmail || ''
  }

  const vehicle = {
    make: invoice.vehicleInfo.make,
    model: invoice.vehicleInfo.model,
    registration: invoice.vehicleInfo.registration,
    vin: invoice.vehicleInfo.vin,
    year: invoice.vehicleInfo.year
  }

  // Generate the HTML using the standard template
  const html = renderDocument('facture', convertWorkshopSettings(workshop), docData, customer, vehicle)

  return (
    <div id="invoice-print-root" className="relative min-h-screen bg-gray-100 p-8">
      <div className="fixed top-4 right-4 z-50 print:hidden flex gap-2">
        <button 
          id="invoice-print-btn"
          onClick={() => printHtml(html)}
          className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          title="Imprimer"
        >
          <Printer className="w-6 h-6" />
        </button>
      </div>
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg my-4">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}

export default InvoicePrintPage
