import {
  createPurchaseOrderMaria,
  deletePurchaseOrderMaria,
  getPurchaseOrderByIdMaria,
  listPurchaseOrdersMaria,
  updatePurchaseOrderMaria,
} from '../repositories/purchaseOrdersRepo.js'
import { v4 as uuidv4 } from 'uuid'

export interface PurchaseOrderCreateData {
  po_number: string
  supplier_id: string
  order_date?: string
  expected_delivery_date?: string
  status?: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled' | 'approved' | 'ordered' | 'pending'
  total_amount_ht?: number
  total_amount_ttc?: number
  tva_rate?: number
  notes?: string
  items: PurchaseOrderItemCreateData[]
}

export interface PurchaseOrderItemCreateData {
  item_reference: string
  item_name: string
  quantity_ordered: number
  unit_price_ht: number
  notes?: string
}

export interface PurchaseOrderUpdateData {
  po_number?: string
  supplier_id?: string
  order_date?: string
  expected_delivery_date?: string
  status?: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled' | 'approved' | 'ordered' | 'pending'
  notes?: string
  items?: PurchaseOrderItemCreateData[]
}

export interface PurchaseOrderFilters {
  supplier_id?: string
  status?: string
  order_date_from?: string
  order_date_to?: string
  search?: string
}

export class PurchaseOrderService {
  async create(data: PurchaseOrderCreateData, userId: string): Promise<any> {
    this.validateCreateData(data)
    const now = new Date()
    const orderDate = data.order_date ? new Date(data.order_date) : now
    const expected = data.expected_delivery_date ? new Date(data.expected_delivery_date) : undefined

    const items = data.items.map(it => ({
      id: uuidv4(),
      item_reference: it.item_reference,
      item_name: it.item_name,
      quantity_ordered: it.quantity_ordered,
      unit_price_ht: it.unit_price_ht,
      total_price_ht: it.quantity_ordered * it.unit_price_ht,
      notes: it.notes,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }))

    const total_ht = items.reduce((sum, it) => sum + (it.total_price_ht || 0), 0)
    const tva_rate = typeof data.tva_rate === 'number' ? data.tva_rate : 20
    const total_ttc = total_ht * (1 + tva_rate / 100)

    const doc = await createPurchaseOrderMaria({
      po_number: data.po_number,
      supplier_id: data.supplier_id,
      order_date: orderDate.toISOString(),
      expected_delivery_date: expected ? expected.toISOString() : undefined,
      status: data.status || 'draft',
      total_amount_ht: total_ht,
      total_amount_ttc: total_ttc,
      tva_rate,
      notes: data.notes,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      purchase_order_items: items,
      createdBy: userId,
    })
    return doc
  }

  async update(id: string, data: PurchaseOrderUpdateData, _userId: string): Promise<any> {
    const existing = await getPurchaseOrderByIdMaria(id)
    if (!existing) return null

    const now = new Date().toISOString()
    const updated: any = { ...existing }
    if (data.po_number) updated.po_number = data.po_number
    if (data.supplier_id) updated.supplier_id = data.supplier_id
    if (data.order_date) updated.order_date = new Date(data.order_date).toISOString()
    if (data.expected_delivery_date !== undefined) {
      updated.expected_delivery_date = data.expected_delivery_date ? new Date(data.expected_delivery_date).toISOString() : undefined
    }
    if (data.notes !== undefined) updated.notes = data.notes
    if (data.status) updated.status = data.status
    if (data.items) {
      const items = data.items.map(it => ({
        id: uuidv4(),
        purchase_order_id: id,
        item_reference: it.item_reference,
        item_name: it.item_name,
        quantity_ordered: it.quantity_ordered,
        unit_price_ht: it.unit_price_ht,
        total_price_ht: it.quantity_ordered * it.unit_price_ht,
        notes: it.notes,
        created_at: updated.created_at,
        updated_at: now,
      }))
      updated.purchase_order_items = items
      const total_ht = items.reduce((sum, it) => sum + (it.total_price_ht || 0), 0)
      const tva_rate = typeof updated.tva_rate === 'number' ? updated.tva_rate : 20
      updated.total_amount_ht = total_ht
      updated.total_amount_ttc = total_ht * (1 + tva_rate / 100)
    }
    updated.updated_at = now
    return await updatePurchaseOrderMaria(id, updated)
  }

  async delete(id: string, _userId: string): Promise<boolean> {
    const po = await getPurchaseOrderByIdMaria(id)
    if (!po) return false
    if (po.status === 'received' || po.status === 'partially_received') {
      throw new Error('Cannot delete purchase order with received items')
    }
    return await deletePurchaseOrderMaria(id)
  }

  async getById(id: string): Promise<any> {
    return await getPurchaseOrderByIdMaria(id)
  }

  async list(filters?: PurchaseOrderFilters): Promise<any[]> {
    return await listPurchaseOrdersMaria(filters as any)
  }

  async getBySupplierId(supplierId: string): Promise<any[]> {
    return await listPurchaseOrdersMaria({ supplier_id: supplierId })
  }

  validateCreateData(data: PurchaseOrderCreateData): void {
    if (!data.po_number || !data.supplier_id) {
      throw new Error('Missing required fields: po_number, supplier_id')
    }
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Purchase order must have at least one item')
    }
    
    for (const item of data.items) {
      if (!item.item_reference || !item.item_name || 
          item.quantity_ordered <= 0 || item.unit_price_ht < 0) {
        throw new Error('Invalid item data')
      }
    }
  }
}

export const purchaseOrderService = new PurchaseOrderService()
