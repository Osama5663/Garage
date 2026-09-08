import React from 'react';
import { DeliveryNote } from '../hooks/useDeliveryNotes';
import { useInventoryStore } from '../stores/inventoryStore';
import { DocumentTemplate } from './documents/DocumentTemplate';

interface PrintableSupplierDeliveryNoteProps {
  deliveryNote: DeliveryNote;
  supplierName?: string;
}

export const PrintableSupplierDeliveryNote: React.FC<PrintableSupplierDeliveryNoteProps> = ({
  deliveryNote,
  supplierName,
}) => {
  const { suppliers } = useInventoryStore();
  const supplier = suppliers.find(s => s.id === deliveryNote.supplier_id);

  const formatAddress = () => {
    if (!supplier) return undefined;
    const parts = [
      supplier.address,
      [supplier.postcode, supplier.city].filter(Boolean).join(' '),
      supplier.country,
    ].filter(Boolean);
    return parts.join('\n');
  };

  const resolvedName =
    supplierName ||
    deliveryNote.suppliers?.name ||
    supplier?.name ||
    'Fournisseur Inconnu';

  return (
    <DocumentTemplate
      title="Bon de Livraison Fournisseur"
      referenceNumber={deliveryNote.delivery_note_number}
      date={deliveryNote.delivery_date}
      recipientInfo={{
        name: resolvedName,
        address: formatAddress(),
        phone: supplier?.phone || deliveryNote.suppliers?.contact_person,
        email: supplier?.email || deliveryNote.suppliers?.email,
      }}
      items={(deliveryNote.supplier_delivery_note_items || []).map(item => ({
        description: item.item_name,
        code: item.item_reference,
        quantity: item.quantity_delivered,
        unitPrice: item.unit_price_ht,
        total: item.total_price_ht,
      }))}
      totals={{
        subtotal: deliveryNote.total_amount_ht,
        tax: deliveryNote.total_amount_ttc - deliveryNote.total_amount_ht,
        total: deliveryNote.total_amount_ttc,
      }}
      notes={deliveryNote.notes}
    />
  );
};
