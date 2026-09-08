import type { SupplierDeliveryNote } from '../types/inventory'

export interface DeliveryNoteCreateData {
  delivery_note_number?: string
  supplier_id: string
  purchase_order_id?: string
  delivery_date: string
  notes?: string
  items: {
    purchase_order_item_id?: string
    item_reference: string
    item_name: string
    quantity_delivered: number
    quantity_accepted: number
    unit_price_ht: number
    total_price_ht: number
    notes?: string
  }[]
}

export interface DeliveryNoteUpdateData {
  delivery_note_number?: string
  supplier_id?: string
  purchase_order_id?: string
  delivery_date?: string
  status?: 'draft' | 'validated' | 'invoiced' | 'cancelled'
  notes?: string
  items?: {
    purchase_order_item_id?: string
    item_reference: string
    item_name: string
    quantity_delivered: number
    quantity_accepted: number
    unit_price_ht: number
    total_price_ht: number
    notes?: string
  }[]
}

export interface DeliveryNoteFilters {
  supplier_id?: string
  purchase_order_id?: string
  status?: string
  delivery_date_from?: string
  delivery_date_to?: string
  search?: string
}

export const deliveryNoteApi = {
  // Get all delivery notes with optional filters
  async list(filters?: DeliveryNoteFilters): Promise<SupplierDeliveryNote[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id)
      if (filters?.purchase_order_id) params.append('purchase_order_id', filters.purchase_order_id)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.delivery_date_from) params.append('delivery_date_from', filters.delivery_date_from)
      if (filters?.delivery_date_to) params.append('delivery_date_to', filters.delivery_date_to)
      if (filters?.search) params.append('search', filters.search)

      const authStorage = localStorage.getItem('auth-storage')
      const sessionToken = authStorage ? JSON.parse(authStorage).state?.sessionToken : null

      const response = await fetch(`/api/delivery-notes?${params.toString()}`, {
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch delivery notes: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch delivery notes')
      }

      return result.data
    } catch (error) {
      console.error('Error fetching delivery notes:', error)
      throw error
    }
  },

  // Get delivery note by ID
  async getById(id: string): Promise<SupplierDeliveryNote> {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      const sessionToken = authStorage ? JSON.parse(authStorage).state?.sessionToken : null

      const response = await fetch(`/api/delivery-notes/${id}`, {
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch delivery note: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch delivery note')
      }

      return result.data
    } catch (error) {
      console.error('Error fetching delivery note:', error)
      throw error
    }
  },

  // Create new delivery note
  async create(data: DeliveryNoteCreateData): Promise<SupplierDeliveryNote> {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      const sessionToken = authStorage ? JSON.parse(authStorage).state?.sessionToken : null

      const response = await fetch('/api/delivery-notes', {
        method: 'POST',
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`Failed to create delivery note: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create delivery note')
      }

      return result.data
    } catch (error) {
      console.error('Error creating delivery note:', error)
      throw error
    }
  },

  // Update delivery note
  async update(id: string, data: DeliveryNoteUpdateData): Promise<SupplierDeliveryNote> {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      const sessionToken = authStorage ? JSON.parse(authStorage).state?.sessionToken : null

      const response = await fetch(`/api/delivery-notes/${id}`, {
        method: 'PUT',
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`Failed to update delivery note: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update delivery note')
      }

      return result.data
    } catch (error) {
      console.error('Error updating delivery note:', error)
      throw error
    }
  },

  // Delete delivery note
  async delete(id: string): Promise<void> {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      const sessionToken = authStorage ? JSON.parse(authStorage).state?.sessionToken : null

      const response = await fetch(`/api/delivery-notes/${id}`, {
        method: 'DELETE',
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete delivery note: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete delivery note')
      }
    } catch (error) {
      console.error('Error deleting delivery note:', error)
      throw error
    }
  },

  // Validate delivery note
  async validate(id: string): Promise<SupplierDeliveryNote> {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      const sessionToken = authStorage ? JSON.parse(authStorage).state?.sessionToken : null

      const response = await fetch(`/api/delivery-notes/${id}/validate`, {
        method: 'POST',
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to validate delivery note: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to validate delivery note')
      }

      return result.data
    } catch (error) {
      console.error('Error validating delivery note:', error)
      throw error
    }
  },

  // Cancel delivery note
  async cancel(id: string): Promise<SupplierDeliveryNote> {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      const sessionToken = authStorage ? JSON.parse(authStorage).state?.sessionToken : null

      const response = await fetch(`/api/delivery-notes/${id}/cancel`, {
        method: 'POST',
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to cancel delivery note: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel delivery note')
      }

      return result.data
    } catch (error) {
      console.error('Error cancelling delivery note:', error)
      throw error
    }
  },

  // Get invoicable delivery notes for a supplier
  async getInvoicableDeliveryNotes(supplierId: string): Promise<SupplierDeliveryNote[]> {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      const sessionToken = authStorage ? JSON.parse(authStorage).state?.sessionToken : null

      const response = await fetch(`/api/delivery-notes/suppliers/${supplierId}/invoicable`, {
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch invoicable delivery notes: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch invoicable delivery notes')
      }

      return result.data
    } catch (error) {
      console.error('Error fetching invoicable delivery notes:', error)
      throw error
    }
  },

  // Link delivery notes to invoice
  async linkToInvoice(deliveryNoteIds: string[], invoiceId: string): Promise<void> {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      const sessionToken = authStorage ? JSON.parse(authStorage).state?.sessionToken : null

      const response = await fetch('/api/delivery-notes/link-to-invoice', {
        method: 'POST',
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ delivery_note_ids: deliveryNoteIds, invoice_id: invoiceId })
      })

      if (!response.ok) {
        throw new Error(`Failed to link delivery notes to invoice: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to link delivery notes to invoice')
      }
    } catch (error) {
      console.error('Error linking delivery notes to invoice:', error)
      throw error
    }
  },

  // Generate delivery note number
  generateDeliveryNoteNumber(): string {
    const now = new Date()
    const year = now.getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `BL-${year}-${random}`
  }
}
