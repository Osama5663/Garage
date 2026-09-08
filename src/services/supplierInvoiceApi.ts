
import { api } from './api';
import { SupplierInvoice } from '../types/inventory';

const toIdString = (v: any): string => {
  if (!v) return ''
  return String(v.id ?? v._id ?? v)
}

const normalizeSupplierInvoice = (raw: any): SupplierInvoice => {
  const supplier = raw?.supplier
  const supplierId = toIdString(supplier)
  const purchaseOrders = Array.isArray(raw?.purchaseOrders) ? raw.purchaseOrders : []

  const items = Array.isArray(raw?.items) ? raw.items : []

  const mappedItems = items.map((it: any, idx: number) => {
    const inv = it?.inventoryItem
    const inventoryItemId = toIdString(inv) || ''
    return {
      id: toIdString(it) || `item_${idx}`,
      inventoryItemId,
      itemName: inv?.name ?? it?.description ?? 'Item',
      sku: inv?.sku ?? '',
      quantity: Number(it?.quantity ?? 0),
      unitPrice: Number(it?.unitPrice ?? 0),
      totalPrice: Number(it?.quantity ?? 0) * Number(it?.unitPrice ?? 0),
      taxRate: Number(it?.taxRate ?? 0.2),
      taxAmount: (Number(it?.quantity ?? 0) * Number(it?.unitPrice ?? 0)) * Number(it?.taxRate ?? 0.2),
      description: it?.description,
      matchedWithPO: true,
    }
  })

  const subtotal =
    typeof raw?.subtotal === 'number'
      ? raw.subtotal
      : mappedItems.reduce((sum: number, it: any) => sum + (it.totalPrice || 0), 0)
  const taxAmount =
    typeof raw?.taxAmount === 'number'
      ? raw.taxAmount
      : mappedItems.reduce((sum: number, it: any) => sum + (it.taxAmount || 0), 0)
  const totalAmount =
    typeof raw?.totalAmount === 'number'
      ? raw.totalAmount
      : subtotal + taxAmount

  const paidAmount = Number(raw?.paidAmount ?? 0)
  const remainingAmount = Number(raw?.totalAmount ?? totalAmount) - paidAmount

  return {
    id: toIdString(raw),
    invoiceNumber: String(raw?.invoiceNumber ?? ''),
    supplierId,
    supplierName: String(supplier?.name ?? raw?.supplierName ?? ''),
    supplierContact: supplier?.contact_person ?? raw?.supplierContact,
    supplierAddress: supplier?.address ?? raw?.supplierAddress,
    invoiceDate: raw?.invoiceDate ? new Date(raw.invoiceDate).toISOString() : new Date().toISOString(),
    dueDate: raw?.dueDate ? new Date(raw.dueDate).toISOString() : new Date().toISOString(),
    purchaseOrderIds: purchaseOrders.map((po: any) => toIdString(po)).filter(Boolean),
    purchaseOrderNumbers: purchaseOrders.map((po: any) => String(po?.poNumber ?? po?.orderNumber ?? '')).filter(Boolean),
    returnOrderIds: [],
    returnOrderNumbers: [],
    items: mappedItems,
    subtotal,
    taxAmount,
    shippingCost: Number(raw?.shippingCost ?? 0),
    totalAmount,
    currency: String(raw?.currency ?? 'MAD'),
    paymentStatus: (raw?.paymentStatus ?? 'unpaid') as any,
    paidAmount,
    remainingAmount: Math.max(remainingAmount, 0),
    paymentTerms: String(raw?.paymentTerms ?? ''),
    paymentMethod: raw?.paymentMethod,
    payments: Array.isArray(raw?.payments) ? raw.payments : [],
    status: (raw?.status ?? 'draft') as any,
    documents: Array.isArray(raw?.documents) ? raw.documents : [],
    notes: raw?.notes,
    supplierNotes: raw?.supplierNotes,
    internalNotes: raw?.internalNotes,
    approvedBy: raw?.approvedBy,
    approvedDate: raw?.approvedDate,
    isDisputed: raw?.isDisputed,
    disputeReason: raw?.disputeReason,
    disputeDate: raw?.disputeDate,
    disputeResolvedDate: raw?.disputeResolvedDate,
    createdAt: raw?.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw?.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    createdBy: raw?.createdBy ?? 'system',
  }
}

export const supplierInvoiceApi = {
  async list(): Promise<SupplierInvoice[]> {
    const response = await api.get('/supplier-invoices');
    return Array.isArray(response.data) ? response.data.map(normalizeSupplierInvoice) : [];
  },

  async getById(id: string): Promise<SupplierInvoice> {
    const response = await api.get(`/supplier-invoices/${id}`);
    return normalizeSupplierInvoice(response.data);
  },

  async create(data: any): Promise<SupplierInvoice> {
    const response = await api.post('/supplier-invoices', data);
    return normalizeSupplierInvoice(response.data);
  },

  async update(id: string, data: any): Promise<SupplierInvoice> {
    const response = await api.put(`/supplier-invoices/${id}`, data);
    return normalizeSupplierInvoice(response.data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/supplier-invoices/${id}`);
  },
};
