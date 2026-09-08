import { describe, it, expect } from 'vitest'
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore'

describe('Pre-invoice vs BL separation', () => {
  it('creates delivery note without address/contact and validates document', async () => {
    // Arrange: clear store state for deterministic test
    const initial = useDeliveryNoteStore.getState()
    useDeliveryNoteStore.setState({ deliveryNotes: [] })

    const data = {
      jobOrderId: 'job_test_1',
      customerId: 'cust_1',
      documentNumber: '',
      notes: 'Test delivery note',
      technicians: []
    }

    const jobOrderData = {
      customerName: 'John Smith',
      vehicleInfo: { make: 'Toyota', model: 'Camry', year: 2020, vin: 'VINTEST123', registration: 'ABC123' },
      partsUsed: [{ id: 'p1', partNumber: 'BT-7890', name: 'Battery', description: 'Battery', quantity: 1, unitPrice: 129.99 }],
      laborItems: []
    }

    // Act
    const note = await useDeliveryNoteStore.getState().createDeliveryNote(data as any, jobOrderData)
    expect(note).toBeTruthy()
    if (!note) return

    // Assert: address/contact are optional and absent
    expect(note.deliveryAddress).toBeUndefined()
    expect(note.deliveryContact).toBeUndefined()

    await useDeliveryNoteStore.getState().validateDeliveryNote(note.id)
    const after = useDeliveryNoteStore.getState().getDeliveryNoteById(note.id)
    expect(after?.status).toBe('validated')

    // Store-level validity is sufficient for pre-invoice stage

    // Cleanup: restore original delivery notes
    useDeliveryNoteStore.setState({ deliveryNotes: initial.deliveryNotes })
  })
})
