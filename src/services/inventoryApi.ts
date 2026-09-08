import { api } from './api'
import { InventoryItem, InventoryFormData } from '../types/inventory'

const normalizeInventoryItem = (raw: any): InventoryItem => {
  const id = String(raw?.id ?? raw?._id ?? '')
  return {
    ...raw,
    id,
  } as InventoryItem
}

export const inventoryApi = {
  async list(filters?: any): Promise<InventoryItem[]> {
    const params = new URLSearchParams()
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key])
        }
      })
    }
    const response = await api.get(`/inventory?${params.toString()}`)
    const items = response.data.data
    return Array.isArray(items) ? items.map(normalizeInventoryItem) : []
  },

  async getById(id: string): Promise<InventoryItem> {
    const response = await api.get(`/inventory/${id}`)
    return normalizeInventoryItem(response.data.data)
  },

  async create(data: InventoryFormData): Promise<InventoryItem> {
    const response = await api.post('/inventory', data)
    return normalizeInventoryItem(response.data.data)
  },

  async update(id: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await api.put(`/inventory/${id}`, data)
    return normalizeInventoryItem(response.data.data)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/inventory/${id}`)
  },

  async getMovements(itemId?: string): Promise<any[]> {
    const url = itemId ? `/inventory/${itemId}/movements` : '/inventory/movements'
    const response = await api.get(url)
    return response.data.data
  }
}
