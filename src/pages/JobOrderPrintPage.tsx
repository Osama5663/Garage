import React, { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useCustomerStore } from '../stores/customerStore'
import { useWorkshopSettings } from '../stores/settingsStore'
import { useHasRole } from '../stores/authStore'
import { renderDocument, convertWorkshopSettings } from '../utils/renderDocument'
import { printHtml } from '../utils/printHelpers'
import { Printer } from 'lucide-react'

export const JobOrderPrintPage: React.FC = () => {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const { jobOrders } = useJobOrderStore()
  const { customers } = useCustomerStore()
  const workshop = useWorkshopSettings()
  const canViewPrices = useHasRole(['admin','supervisor','cashier'])
  
  const jobOrder = jobOrders.find(j => j.id === (id || ''))
  
  // Auto-print if requested via query param
  useEffect(() => {
    if (sp.get('print') === '1' && jobOrder) {
      // Small delay to ensure rendering
      const timer = setTimeout(() => {
        const printBtn = document.getElementById('print-trigger-btn')
        if (printBtn) printBtn.click()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [sp, jobOrder])

  if (!jobOrder) {
    return <div className="p-6 text-center">Ordre de réparation introuvable</div>
  }

  const customer = customers.find(c => c.id === jobOrder.customerId)

  // Calculate totals
  const partsTotal = (jobOrder.partsUsed || []).reduce((acc, part) => acc + (part.totalCost || 0), 0)
  const laborTotal = (jobOrder.laborItems || []).reduce((acc, labor) => acc + (labor.total || 0), 0)
  const subtotal = partsTotal + laborTotal
  const vatTotal = subtotal * 0.20 // Assuming 20% VAT default
  const grandTotal = subtotal + vatTotal

  const docData = {
    number: jobOrder.jobNumber,
    date: jobOrder.createdAt,
    description: jobOrder.description,
    lines: (jobOrder.partsUsed || []).map((part, index) => ({
      ref: part.partNumber || `P${String(index + 1).padStart(3, '0')}`,
      description: part.name,
      shortDescription: part.description,
      quantity: part.quantity ?? 0,
      unitPrice: part.unitCost ?? 0,
      discount: 0,
      lineTotal: part.totalCost ?? 0,
      tvaRate: 20
    })),
    labor: (jobOrder.laborItems || []).map((labor) => ({
      description: labor.description,
      hours: labor.hours ?? 0,
      hourlyRate: labor.rate ?? 0,
      totalAmount: labor.total ?? 0
    })),
    partsSubtotal: partsTotal,
    laborSubtotal: laborTotal,
    subtotal: subtotal,
    vatTotal: vatTotal,
    grandTotal: grandTotal,
    paid: 0,
    balance: grandTotal,
    // Explicitly tell renderDocument to show prices
    showPrices: canViewPrices && sp.get('showPrices') !== '0'
  }

  const customerData = {
    name: customer ? `${customer.firstName} ${customer.lastName}` : jobOrder.customerName,
    address: customer?.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.state} ${customer.address.zipCode}` : '',
    postalCode: customer?.address?.zipCode || '',
    city: customer?.address?.city || '',
    phone: customer?.phone || '',
    email: customer?.email || ''
  }

  const vehicle = {
    make: jobOrder.vehicleInfo.make,
    model: jobOrder.vehicleInfo.model,
    registration: jobOrder.vehicleInfo.registration,
    vin: jobOrder.vehicleInfo.vin,
    year: jobOrder.vehicleInfo.year
  }

  const html = renderDocument(
    'ordre-reparation',
    convertWorkshopSettings(workshop || {}),
    docData,
    customerData,
    vehicle
  )

  return (
    <div id="job-order-print-root" className="relative min-h-screen bg-gray-100 p-8">
      <div className="fixed top-4 right-4 z-50 print:hidden flex gap-2">
        <button 
          id="print-trigger-btn"
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

export default JobOrderPrintPage
