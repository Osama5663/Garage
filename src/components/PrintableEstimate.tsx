import React from 'react'
import { Estimate } from '../types/estimate'
import { DocumentTemplate, DocumentItem } from './documents/DocumentTemplate'

export const PrintableEstimate: React.FC<{ estimate: Estimate }> = ({ estimate }) => {
  const items: DocumentItem[] = estimate.items.map(item => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.totalPrice
  }))

  return (
    <DocumentTemplate
      title="Devis"
      referenceNumber={estimate.estimateNumber}
      date={estimate.issueDate}
      recipientInfo={{
        name: estimate.customerName,
        address: (estimate as any).customerAddress,
        phone: (estimate as any).customerPhone,
        email: (estimate as any).customerEmail
      }}
      items={items}
      totals={{
        subtotal: estimate.subtotal,
        tax: estimate.vatAmount,
        taxLabel: 'TVA (20%)',
        total: estimate.totalAmount
      }}
      notes={`Véhicule: ${estimate.vehicleInfo.make} ${estimate.vehicleInfo.model} (${estimate.vehicleInfo.year})\nImmatriculation: ${estimate.vehicleInfo.registration}\nDate d'expiration: ${estimate.expiryDate}`}
      paymentTerms={estimate.termsAndConditions}
    />
  )
}

export default PrintableEstimate
