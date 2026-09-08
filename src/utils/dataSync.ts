import { useInventoryStore } from '../stores/inventoryStore'
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useJobOrderStore } from '../stores/jobOrderStore'

export type GarageDataDump = {
  inventory: any
  deliveryNotes: any
  invoices: any
  jobOrders: any
}

export const exportData = (): string => {
  const inv = useInventoryStore.getState()
  const dn = useDeliveryNoteStore.getState()
  const ei = useEstimateInvoiceStore.getState()
  const jo = useJobOrderStore.getState()
  const payload: GarageDataDump = {
    inventory: {
      inventoryItems: inv.inventoryItems,
      suppliers: inv.suppliers,
      purchaseOrders: inv.purchaseOrders,
      supplierInvoices: inv.supplierInvoices,
    },
    deliveryNotes: dn.deliveryNotes,
    invoices: ei.invoices,
    jobOrders: jo.jobOrders,
  }
  return JSON.stringify(payload, null, 2)
}

export const importData = (json: string): { ok: boolean; error?: string } => {
  try {
    const data = JSON.parse(json) as GarageDataDump
    if (data.inventory) {
      useInventoryStore.setState((prev) => ({
        ...prev,
        inventoryItems: data.inventory.inventoryItems ?? prev.inventoryItems,
        suppliers: data.inventory.suppliers ?? prev.suppliers,
        purchaseOrders: data.inventory.purchaseOrders ?? prev.purchaseOrders,
        supplierInvoices: data.inventory.supplierInvoices ?? prev.supplierInvoices,
      }))
    }
    if (Array.isArray(data.deliveryNotes)) {
      useDeliveryNoteStore.setState((prev) => ({ ...prev, deliveryNotes: data.deliveryNotes }))
    }
    if (Array.isArray(data.invoices)) {
      useEstimateInvoiceStore.setState((prev) => ({ ...prev, invoices: data.invoices }))
    }
    if (Array.isArray(data.jobOrders)) {
      useJobOrderStore.setState((prev) => ({ ...prev, jobOrders: data.jobOrders }))
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Invalid JSON' }
  }
}

