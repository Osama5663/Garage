import React from 'react';
import { SupplierInvoice } from '../types/inventory';
import { useInventoryStore } from '../stores/inventoryStore';
import { DocumentTemplate } from './documents/DocumentTemplate';

interface PrintableSupplierInvoiceProps {
  invoice: SupplierInvoice;
}

export const PrintableSupplierInvoice: React.FC<PrintableSupplierInvoiceProps> = ({ invoice }) => {
  const { suppliers } = useInventoryStore();

  const rawInvoice: any = invoice as any;
  const supplierFromInvoice = rawInvoice.supplier;
  const supplierIdFromInvoice =
    typeof supplierFromInvoice === 'string'
      ? supplierFromInvoice
      : supplierFromInvoice?._id || supplierFromInvoice?.id;
  const resolvedSupplierId =
    invoice.supplierId || supplierIdFromInvoice || rawInvoice.supplierId;

  const supplier =
    suppliers.find((s) => s.id === resolvedSupplierId || s._id === resolvedSupplierId) ||
    (supplierFromInvoice && typeof supplierFromInvoice === 'object'
      ? {
          id: supplierIdFromInvoice,
          name: supplierFromInvoice.name,
          address: supplierFromInvoice.address,
          postcode: supplierFromInvoice.postcode,
          city: supplierFromInvoice.city,
          country: supplierFromInvoice.country,
          phone: supplierFromInvoice.phone,
          email: supplierFromInvoice.email,
          taxId: supplierFromInvoice.taxId,
        }
      : undefined);

  // Format address
  const formatAddress = () => {
    if (!supplier) return invoice.supplierAddress;
    const parts = [
      supplier.address,
      [supplier.postcode, supplier.city].filter(Boolean).join(' '),
      supplier.country
    ].filter(Boolean);
    return parts.join('\n');
  };

  return (
    <DocumentTemplate
      title="Facture Fournisseur"
      referenceNumber={invoice.invoiceNumber}
      date={invoice.invoiceDate}
      recipientInfo={{
        name:
          invoice.supplierName ||
          supplier?.name ||
          supplierFromInvoice?.name ||
          'Fournisseur Inconnu',
        address: formatAddress(),
        phone: supplier?.phone,
        email: supplier?.email,
        taxId: supplier?.taxId
      }}
      items={invoice.items.map((item, index) => {
        const rawItem: any = item as any;
        const quantityRaw =
          rawItem.quantity !== undefined
            ? rawItem.quantity
            : item.quantity;
        const unitPriceRaw =
          rawItem.unitPrice !== undefined
            ? rawItem.unitPrice
            : item.unitPrice;
        const quantity = Number(
          typeof quantityRaw === 'string'
            ? quantityRaw.replace(',', '.')
            : quantityRaw ?? 0
        ) || 0;
        const unitPrice = Number(
          typeof unitPriceRaw === 'string'
            ? unitPriceRaw.replace(',', '.')
            : unitPriceRaw ?? 0
        ) || 0;
        const totalRaw =
          (item as any).totalPrice ?? rawItem.totalPrice;
        const total =
          typeof totalRaw === 'number'
            ? totalRaw
            : Number(totalRaw) || quantity * unitPrice;
        const description =
          item.itemName ||
          item.description ||
          rawItem.inventoryItem?.name ||
          'Article';
        const code =
          item.sku ||
          rawItem.sku ||
          rawItem.inventoryItem?.sku ||
          String(index + 1);

        return {
          description,
          code,
          quantity,
          unitPrice,
          total
        };
      })}
      totals={{
        subtotal: invoice.subtotal,
        tax: invoice.taxAmount,
        total: invoice.totalAmount
      }}
      paymentTerms={invoice.paymentTerms}
      notes={invoice.notes}
    />
  );
};
