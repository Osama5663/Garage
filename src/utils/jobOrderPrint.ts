import { JobOrder } from '../types/jobOrder'
import { Customer } from '../types/customer'
import { WorkshopSettings } from '../types/settings'
import { renderDocument, convertWorkshopSettings } from './renderDocument'
import { printHtml } from './printHelpers'

export const printJobOrder = async (
  jobOrder: JobOrder,
  customer: Customer | null | undefined,
  workshop: WorkshopSettings | null,
  showPrices: boolean = true
) => {
  // Calculate totals
  const partsTotal = (jobOrder.partsUsed || []).reduce((acc, part) => acc + (part.totalCost || 0), 0)
  const laborTotal = (jobOrder.laborItems || []).reduce((acc, labor) => acc + (labor.total || 0), 0)
  const subtotal = partsTotal + laborTotal
  const vatTotal = subtotal * 0.20 // Assuming 20% VAT default
  const grandTotal = subtotal + vatTotal

  const document = {
    number: jobOrder.jobNumber,
    date: jobOrder.createdAt,
    description: jobOrder.description,
    lines: (jobOrder.partsUsed || []).map((part, index) => ({
      ref: part.partNumber || `P${String(index + 1).padStart(3, '0')}`,
      description: part.name,
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
    showPrices: showPrices
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
    document,
    customerData,
    vehicle
  )

  await printHtml(html)
}
