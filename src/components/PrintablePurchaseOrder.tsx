import React from 'react';
import { PurchaseOrder } from '../types/inventory';
import { useInventoryStore } from '../stores/inventoryStore';
import { DocumentTemplate } from './documents/DocumentTemplate';

interface PrintablePurchaseOrderProps {
  order: PurchaseOrder;
}

export const PrintablePurchaseOrder: React.FC<PrintablePurchaseOrderProps> = ({ order }) => {
  const { suppliers } = useInventoryStore();

  if (!order) {
    return (
      <div className="print-container p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Erreur d'impression</h1>
        <p>Les données du bon de commande sont introuvables.</p>
      </div>
    );
  }

  const supplier = suppliers.find(s => s.id === order.supplierId);

  // Fallback for supplier info if not found in store (though it should be)
  const supplierName = order.supplierName || supplier?.name || 'Fournisseur Inconnu';
  
  // Format address
  const formatAddress = () => {
    if (!supplier) return undefined;
    const parts = [
      supplier.address,
      [supplier.postcode, supplier.city].filter(Boolean).join(' '),
      supplier.country
    ].filter(Boolean);
    return parts.join('\n');
  };

  // Ensure items is an array
  const orderItems = Array.isArray(order.items) ? order.items : [];

  return (
    <DocumentTemplate
      title="Bon de Commande"
      referenceNumber={order.orderNumber || 'N/A'}
      date={order.orderDate || new Date().toISOString()}
      recipientInfo={{
        name: supplierName,
        address: formatAddress(),
        phone: supplier?.phone,
        email: supplier?.email,
        taxId: supplier?.taxId
      }}
      items={orderItems.map(item => ({
        description: item.itemName || 'Article inconnu',
        code: item.sku,
        quantity: item.quantityOrdered || 0,
        unitPrice: item.unitCost || 0,
        total: item.totalCost || 0
      }))}
      totals={{
        subtotal: order.subtotal || 0,
        tax: order.taxAmount || 0,
        total: order.totalAmount || 0
      }}
      paymentTerms={order.paymentTerms || supplier?.paymentTerms}
      notes={order.notes}
    />
  );
};
