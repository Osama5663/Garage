import { getSupplierByIdMaria } from '../repositories/suppliersRepo.js'
import { getPurchaseOrderByIdMaria } from '../repositories/purchaseOrdersRepo.js'
import {
  createDeliveryNoteMaria,
  deleteDeliveryNoteMaria,
  getDeliveryNoteByIdMaria,
  listDeliveryNotesMariaFiltered,
  listDeliveryNotesMaria,
  setDeliveryNotesInvoiceMaria,
  updateDeliveryNoteMaria,
} from '../repositories/deliveryNotesRepo.js'
import { getSupplierInvoiceByIdMaria } from '../repositories/supplierInvoicesRepo.js'
import { v4 as uuidv4 } from 'uuid'

export interface DeliveryNoteCreateData {
  delivery_note_number?: string
  supplier_id: string
  purchase_order_id?: string
  delivery_date: string
  notes?: string
  items: DeliveryNoteItemCreateData[]
}

export interface DeliveryNoteItemCreateData {
  purchase_order_item_id?: string
  item_reference: string
  item_name: string
  quantity_delivered: number
  quantity_accepted: number
  unit_price_ht: number
  total_price_ht: number
  notes?: string
}

export interface DeliveryNoteUpdateData {
  delivery_note_number?: string
  supplier_id?: string
  purchase_order_id?: string
  delivery_date?: string
  status?: 'draft' | 'validated' | 'invoiced' | 'cancelled'
  notes?: string
  items?: DeliveryNoteItemCreateData[]
}

export interface DeliveryNoteFilters {
  supplier_id?: string
  purchase_order_id?: string
  status?: string
  delivery_date_from?: string
  delivery_date_to?: string
  search?: string
}

export class DeliveryNoteService {
  async create(data: DeliveryNoteCreateData, userId: string): Promise<any> {
    this.validateCreateData(data)
    const deliveryDate = new Date(data.delivery_date)
    const deliveryNoteNumber = await this.generateDeliveryNoteNumber(deliveryDate)
    const deliveryNoteId = uuidv4()
    const now = new Date()
    const items = data.items.map(it => ({
      id: uuidv4(),
      delivery_note_id: deliveryNoteId,
      purchase_order_item_id: it.purchase_order_item_id,
      item_reference: it.item_reference,
      item_name: it.item_name,
      quantity_delivered: it.quantity_delivered,
      quantity_accepted: it.quantity_accepted,
      unit_price_ht: it.unit_price_ht,
      total_price_ht: it.total_price_ht,
      notes: it.notes,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }))
    const total_ht = items.reduce((sum, it) => sum + (it.total_price_ht || 0), 0)
    const tvaRate = 20
    const total_ttc = total_ht * (1 + tvaRate / 100)

    const supplier = await getSupplierByIdMaria(String(data.supplier_id))
    const po = data.purchase_order_id ? await getPurchaseOrderByIdMaria(String(data.purchase_order_id)) : null

    const created = await createDeliveryNoteMaria({
      id: deliveryNoteId,
      delivery_note_number: deliveryNoteNumber,
      supplier_id: data.supplier_id,
      purchase_order_id: data.purchase_order_id,
      delivery_date: deliveryDate.toISOString(),
      status: 'draft',
      total_amount_ht: total_ht,
      total_amount_ttc: total_ttc,
      notes: data.notes,
      created_by: userId,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      suppliers: supplier ? { name: supplier.name } : undefined,
      purchase_orders: po ? { po_number: po.po_number } : undefined,
      supplier: supplier ? { name: supplier.name } : undefined,
      purchase_order: po ? { po_number: po.po_number } : undefined,
      supplier_name: supplier ? supplier.name : undefined,
      purchase_order_number: po ? po.po_number : undefined,
      delivery_note_invoices: [],
      items,
    })
    return created
  }

  async update(id: string, data: DeliveryNoteUpdateData, userId: string): Promise<any> {
    const dn = await getDeliveryNoteByIdMaria(id)
    if (!dn) return null

    if (data.status && data.status !== dn.status) {
      if (dn.status === 'invoiced') {
        throw new Error('Cannot modify invoiced delivery note')
      }
    }

    const updated: any = { ...dn }
    if (data.delivery_note_number) updated.delivery_note_number = data.delivery_note_number
    if (data.supplier_id) updated.supplier_id = data.supplier_id
    if (data.purchase_order_id !== undefined) updated.purchase_order_id = data.purchase_order_id
    if (data.delivery_date) updated.delivery_date = new Date(data.delivery_date).toISOString()
    if (data.notes !== undefined) updated.notes = data.notes
    if (data.status) {
      updated.status = data.status
      if (data.status === 'validated') {
        updated.validated_at = new Date().toISOString()
        updated.validated_by = userId
      }
    }

    if (data.items) {
      const now = new Date().toISOString()
      updated.items = data.items.map(it => ({
        id: uuidv4(),
        delivery_note_id: id,
        purchase_order_item_id: it.purchase_order_item_id,
        item_reference: it.item_reference,
        item_name: it.item_name,
        quantity_delivered: it.quantity_delivered,
        quantity_accepted: it.quantity_accepted,
        unit_price_ht: it.unit_price_ht,
        total_price_ht: it.total_price_ht,
        notes: it.notes,
        created_at: updated.created_at,
        updated_at: now,
      }))
      const total_ht = updated.items.reduce((sum: number, it: any) => sum + (it.total_price_ht || 0), 0)
      const tvaRate = 20
      updated.total_amount_ht = total_ht
      updated.total_amount_ttc = total_ht * (1 + tvaRate / 100)
    }

    if (updated.supplier_id) {
      const supplier = await getSupplierByIdMaria(String(updated.supplier_id))
      updated.suppliers = supplier ? { name: supplier.name } : undefined
      updated.supplier = supplier ? { name: supplier.name } : undefined
      updated.supplier_name = supplier ? supplier.name : undefined
    }
    if (updated.purchase_order_id) {
      const po = await getPurchaseOrderByIdMaria(String(updated.purchase_order_id))
      updated.purchase_orders = po ? { po_number: po.po_number } : undefined
      updated.purchase_order = po ? { po_number: po.po_number } : undefined
      updated.purchase_order_number = po ? po.po_number : undefined
    }

    if (updated.invoice_id) {
      const invoice = await getSupplierInvoiceByIdMaria(String(updated.invoice_id))
      updated.delivery_note_invoices = invoice
        ? [
            {
              invoice_id: String(updated.invoice_id),
              invoices: {
                invoice_number: invoice.invoiceNumber,
                status: invoice.status,
                invoice_date: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString() : undefined,
              },
            },
          ]
        : []
    } else {
      updated.delivery_note_invoices = []
    }

    updated.updated_at = new Date().toISOString()
    return await updateDeliveryNoteMaria(id, updated)
  }

  async delete(id: string, _userId: string): Promise<boolean> {
    const dn = await getDeliveryNoteByIdMaria(id)
    if (!dn) return false
    if (dn.status === 'invoiced') {
      throw new Error('Cannot delete invoiced delivery note')
    }
    return await deleteDeliveryNoteMaria(id)
  }

  async getById(id: string): Promise<any> {
    const dn = await getDeliveryNoteByIdMaria(id)
    if (!dn) return null
    if (dn.invoice_id) {
      const invoice = await getSupplierInvoiceByIdMaria(String(dn.invoice_id))
      dn.delivery_note_invoices = invoice
        ? [
            {
              invoice_id: String(dn.invoice_id),
              invoices: {
                invoice_number: invoice.invoiceNumber,
                status: invoice.status,
                invoice_date: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString() : undefined,
              },
            },
          ]
        : []
    }
    return dn
  }

  async list(filters?: DeliveryNoteFilters): Promise<any[]> {
    return await listDeliveryNotesMariaFiltered(filters as any)
  }

  async validateDeliveryNote(id: string, userId: string): Promise<any> {
    return this.update(id, { status: 'validated' }, userId)
  }

  async cancelDeliveryNote(id: string, userId: string): Promise<any> {
    const dn = await getDeliveryNoteByIdMaria(id)
    if (!dn) return null
    if (dn.status === 'invoiced') {
      if (dn.invoice_id) {
        const invoiceExists = await getSupplierInvoiceByIdMaria(String(dn.invoice_id))
        if (!invoiceExists) {
          const updated = { ...dn, status: 'validated', invoice_id: undefined, updated_at: new Date().toISOString() }
          await updateDeliveryNoteMaria(id, updated)
        } else {
          throw new Error('Cannot cancel invoiced delivery note')
        }
      } else {
        throw new Error('Cannot cancel invoiced delivery note')
      }
    }
    return this.update(id, { status: 'cancelled' }, userId)
  }

  async getInvoicableDeliveryNotes(supplierId: string): Promise<any[]> {
    const all = await listDeliveryNotesMaria()
    return all
      .filter(d => String(d.supplier_id || '') === String(supplierId) && d.status === 'validated')
      .sort((a, b) => new Date(a.delivery_date || 0).getTime() - new Date(b.delivery_date || 0).getTime())
  }

  async linkToInvoice(deliveryNoteIds: string[], invoiceId: string): Promise<void> {
    await setDeliveryNotesInvoiceMaria(deliveryNoteIds, invoiceId)
  }

  validateCreateData(data: DeliveryNoteCreateData): void {
    if (!data.supplier_id || !data.delivery_date) {
      throw new Error('Missing required fields: supplier_id, delivery_date')
    }
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Delivery note must have at least one item')
    }
    
    for (const item of data.items) {
      if (!item.item_reference || !item.item_name || 
          item.quantity_delivered <= 0 || item.quantity_accepted < 0 ||
          item.unit_price_ht < 0 || item.total_price_ht < 0) {
        throw new Error('Invalid item data')
      }
      
      if (item.quantity_accepted > item.quantity_delivered) {
        throw new Error('Accepted quantity cannot exceed delivered quantity')
      }
    }
  }

  private async generateDeliveryNoteNumber(deliveryDate: Date): Promise<string> {
    const year = deliveryDate.getFullYear()
    const month = String(deliveryDate.getMonth() + 1).padStart(2, '0')
    const day = String(deliveryDate.getDate()).padStart(2, '0')
    const datePart = `${year}${month}${day}`
    const prefix = `BL-${datePart}-`
    const all = await listDeliveryNotesMaria()
    const sameDay = all
      .map(d => String(d.delivery_note_number || ''))
      .filter(n => n.startsWith(prefix))
      .sort()
    const last = sameDay.length ? sameDay[sameDay.length - 1] : null

    let nextSeq = 1
    if (last) {
      const match = last.match(/BL-\d{8}-(\d{3})$/)
      if (match) nextSeq = parseInt(match[1], 10) + 1
    }
    if (nextSeq > 999) throw new Error('Daily BL sequence limit reached (max 999 per day)')
    const seq = String(nextSeq).padStart(3, '0')
    return `${prefix}${seq}`
  }
}

export const deliveryNoteService = new DeliveryNoteService()
