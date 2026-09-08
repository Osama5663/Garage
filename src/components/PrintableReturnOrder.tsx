import React from 'react'
import { ReturnOrder } from '../types/inventory'
import { DocumentTemplate, DocumentItem } from './documents/DocumentTemplate'

export const PrintableReturnOrder: React.FC<{ returnOrder: ReturnOrder }> = ({ returnOrder }) => {
  const items: DocumentItem[] = returnOrder.items.map(item => ({
    code: item.sku,
    description: item.itemName,
    quantity: item.quantityReturned,
    unitPrice: item.unitCost,
    total: item.totalCost
  }))

  return (
    <DocumentTemplate
      title="Bon de Retour"
      referenceNumber={returnOrder.returnNumber}
      date={returnOrder.returnDate}
      recipientInfo={{
        name: returnOrder.supplierName,
        phone: returnOrder.supplierContact
      }}
      items={items}
      totals={{
        subtotal: returnOrder.subtotal,
        tax: returnOrder.taxAmount,
        taxLabel: 'Taxe',
        total: returnOrder.totalAmount
      }}
      notes={`Raison: ${returnOrder.returnReason}\nDétails: ${returnOrder.returnReasonDetails || ''}`}
      paymentTerms="Remboursement demandé."
    />
  )
}

export default PrintableReturnOrder
