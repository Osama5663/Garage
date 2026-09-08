import { api } from './api'
import { Supplier, SupplierFormData } from '../types/inventory'

export const supplierApi = {
  async list(): Promise<Supplier[]> {
    const response = await api.get('/suppliers')
    return response.data.data || response.data
  },

  async create(data: SupplierFormData): Promise<Supplier> {
    const response = await api.post('/suppliers', data)
    return response.data.data || response.data
  },

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const response = await api.put(`/suppliers/${id}`, data)
    return response.data.data || response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/suppliers/${id}`)
  }
}
