import { describe, it, expect } from 'vitest'
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore'
import '../stores/estimateInvoiceStore'

describe('BL conversion gating', () => {
  it('requires status validated before convertToInvoice', async () => {
    const store = useDeliveryNoteStore.getState()

    const dn = await store.createDeliveryNote(
      {
        jobOrderId: 'job_x',
        customerId: 'cust_x',
        documentNumber: '',
        notes: 'test',
        technicians: []
      } as any,
      {
        customerName: 'Test User',
        vehicleInfo: { make: 'X', model: 'Y', year: 2024, vin: 'VINX', registration: 'REGX' },
        partsUsed: [
          { id: 'p1', partNumber: 'A-1', name: 'Item A', description: 'desc', quantity: 1, unitPrice: 10 }
        ],
        laborItems: []
      }
    )
    expect(dn).toBeTruthy()
    if (!dn) return

    const conversionOptions = {
      convertToInvoice: true,
      invoiceSettings: {
        paymentTerms: '30j',
        dueDate: '2025-01-01',
        taxRate: 20,
        includeLabor: false,
        notes: ''
      }
    }

    await expect(store.convertToInvoice(dn.id, conversionOptions)).rejects.toThrow(
      'Delivery note must be validated before converting to invoice.'
    )

    await store.updateDeliveryNoteStatus(dn.id, 'validated')
    const invId = await store.convertToInvoice(dn.id, conversionOptions)
    expect(typeof invId).toBe('string')
    const after = useDeliveryNoteStore.getState().getDeliveryNoteById(dn.id)
    expect(after?.status).toBe('invoiced')
  })
})
