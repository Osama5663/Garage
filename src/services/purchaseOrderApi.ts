import { api } from './api'

export interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  order_date: string
  expected_delivery_date?: string
  status: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled'
  total_amount_ht: number
  total_amount_ttc: number
  tva_rate: number
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  suppliers?: {
    name: string
    email?: string
  }
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  item_reference: string
  item_name: string
  quantity_ordered: number
  unit_price_ht: number
  total_price_ht: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface PurchaseOrderFilters {
  supplier_id?: string
  status?: string
  order_date_from?: string
  order_date_to?: string
  search?: string
}

export interface PurchaseOrderCreateData {
  po_number: string
  supplier_id: string
  order_date: string
  expected_delivery_date?: string
  status?: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled'
  total_amount_ht: number
  total_amount_ttc: number
  tva_rate: number
  notes?: string
  items: PurchaseOrderItemCreateData[]
}

export interface PurchaseOrderItemCreateData {
  item_reference: string
  item_name: string
  quantity_ordered: number
  unit_price_ht: number
  total_price_ht: number
  notes?: string
}

export const purchaseOrderApi = {
  async list(filters?: PurchaseOrderFilters): Promise<PurchaseOrder[]> {
    const params = new URLSearchParams()
    if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.order_date_from) params.append('order_date_from', filters.order_date_from)
    if (filters?.order_date_to) params.append('order_date_to', filters.order_date_to)
    if (filters?.search) params.append('search', filters.search)

    const response = await api.get(`/purchase-orders?${params}`)
    return response.data.data
  },

  async getById(id: string): Promise<PurchaseOrder> {
    const response = await api.get(`/purchase-orders/${id}`)
    return response.data.data
  },

  async create(data: PurchaseOrderCreateData): Promise<PurchaseOrder> {
    const response = await api.post('/purchase-orders', data)
    return response.data.data
  },

  async update(id: string, data: Partial<PurchaseOrderCreateData>): Promise<PurchaseOrder> {
    const response = await api.put(`/purchase-orders/${id}`, data)
    return response.data.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/purchase-orders/${id}`)
  },

  async getBySupplierId(supplierId: string): Promise<PurchaseOrder[]> {
    const response = await api.get(`/purchase-orders/suppliers/${supplierId}`)
    return response.data.data
  }
}