export interface InvoiceItem {
  id?: string
  inventoryItemId: string
  itemName: string
  sku?: string
  quantity: number
  unitPrice: number
  total?: number
}

export interface SupplierInvoice {
  id: string
  supplierId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  items: InvoiceItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface SupplierInvoiceFormData {
  supplierId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  items: InvoiceItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  status: 'pending' | 'draft' | 'paid' | 'overdue' | 'cancelled'
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue'
  notes?: string
}

export type { InventoryItem } from './inventory'
