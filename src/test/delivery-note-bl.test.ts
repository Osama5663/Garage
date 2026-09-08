import { useDeliveryNoteStore } from '../stores/deliveryNoteStore'
import { useAuthStore } from '../stores/authStore'

const auth = useAuthStore.getState()
if (!auth.currentUser) useAuthStore.setState({ currentUser: { id: 'admin', role: 'admin' } as any })

const store = useDeliveryNoteStore.getState()

const dn = store.deliveryNotes[0]
console.assert(!!dn, 'seed delivery note exists')

const resUpdate = store.updateDeliveryNoteValidated(dn.id, { deliveryContact: dn.deliveryContact })
console.assert(resUpdate.success, 'validated update succeeds')

const resSoft = store.softDeleteDeliveryNotes([dn.id])
console.assert(resSoft.success && resSoft.deleted.includes(dn.id), 'soft delete applied')

const resRestore = store.restoreDeliveryNote(dn.id)
console.assert(resRestore.success, 'restore applied')

store.updateDeliveryNote(dn.id, { status: 'approved', signatures: { customer: {}, technician: {}, authorizedBy: {} } as any, isSigned: true })
const invId = store.convertToInvoice(dn.id, { currency: 'EUR', paymentTerms: 'Net 30' } as any)
console.assert(typeof invId === 'string' && invId.startsWith('INV-'), 'invoice id generated')

console.assert(store.auditLogs.length > 0, 'audit logs recorded')
console.assert(!!store.versionHistory[dn.id], 'version history recorded')

console.log('delivery note BL tests passed')
