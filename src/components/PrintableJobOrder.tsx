import React from 'react'
import { JobOrder } from '../types/jobOrder'
import { useCustomerStore } from '../stores/customerStore'
import { useSettingsStore } from '../stores/settingsStore'
import { DocumentTemplate, DocumentItem } from './documents/DocumentTemplate'

export const PrintableJobOrder: React.FC<{ jobOrder: JobOrder }> = ({ jobOrder }) => {
  const { customers } = useCustomerStore()
  const customer = customers.find(c => c.id === jobOrder.customerId)
  const getActiveTaxes = useSettingsStore(s => s.getActiveTaxes)

  // Taxes
  const taxes = getActiveTaxes()
  const partsTaxRate = taxes.filter(t => t.isActive && t.appliesTo.includes('parts')).reduce((s, t) => s + (t.rate || 0), 0)
  const laborTaxRate = taxes.filter(t => t.isActive && (t.appliesTo.includes('labor') || t.appliesTo.includes('services'))).reduce((s, t) => s + (t.rate || 0), 0)

  const partsItems: DocumentItem[] = (jobOrder.partsUsed || []).map(part => ({
    code: part.partNumber,
    description: part.name,
    quantity: part.quantity || 0,
    unitPrice: part.unitCost || 0,
    total: (part.quantity || 0) * (part.unitCost || 0)
  }))

  const laborItems: DocumentItem[] = (jobOrder.laborItems || []).map(labor => ({
    description: labor.description,
    quantity: labor.hours || 0,
    unitPrice: labor.rate || 0,
    total: (labor.hours || 0) * (labor.rate || 0)
  }))

  const items = [...partsItems, ...laborItems]

  const partsSubtotal = partsItems.reduce((sum, item) => sum + item.total, 0)
  const laborSubtotal = laborItems.reduce((sum, item) => sum + item.total, 0)
  
  const partsTax = partsSubtotal * (partsTaxRate / 100)
  const laborTax = laborSubtotal * (laborTaxRate / 100)
  
  const subtotal = partsSubtotal + laborSubtotal
  const taxTotal = partsTax + laborTax
  const total = subtotal + taxTotal

  return (
    <DocumentTemplate
      title="Ordre de Réparation"
      referenceNumber={jobOrder.jobNumber}
      date={jobOrder.createdAt}
      recipientInfo={{
        name: jobOrder.customerName,
        address: customer?.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.state} ${customer.address.zipCode}` : undefined,
        phone: customer?.phone,
        email: customer?.email
      }}
      items={items}
      totals={{
        subtotal,
        tax: taxTotal,
        taxLabel: 'TVA',
        total
      }}
      notes={`Véhicule: ${jobOrder.vehicleInfo.make} ${jobOrder.vehicleInfo.model} (${jobOrder.vehicleInfo.year})\nImmatriculation: ${jobOrder.vehicleInfo.registration}\nDescription: ${jobOrder.description}`}
      paymentTerms="Paiement à la livraison."
    />
  )
}

export default PrintableJobOrder
