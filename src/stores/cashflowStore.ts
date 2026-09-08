import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useEstimateInvoiceStore } from './estimateInvoiceStore'
import { useInventoryStore } from './inventoryStore'
import { createServerStateStorage } from '../services/api'

export type CashflowType = 'inflow' | 'outflow'
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'other'

export interface CashflowMovement {
  id: string
  type: CashflowType
  date: string
  partyName: string
  partyId?: string
  linkedInvoiceId?: string
  linkedInvoiceNumber?: string
  paymentMethod?: PaymentMethod
  amount: number
  currency: string
  remainingBalance?: number
  reconciled: boolean
  source: 'sales' | 'supplier' | 'expense' | 'manual'
  reference?: string
  category?: string
  vehicleId?: string
  vehicleLabel?: string
}

interface CashflowState {
  movements: CashflowMovement[]
  addMovement: (m: CashflowMovement) => void
  updateMovement: (id: string, m: Partial<CashflowMovement>) => void
  deleteMovement: (id: string) => void
  setReconciled: (id: string, reconciled: boolean) => void
  aggregateFromStores: () => void
}

export const useCashflowStore = create<CashflowState>()(
  persist(
    (set) => ({
      movements: [],
      addMovement: (m) => set((s) => ({ movements: [m, ...s.movements] })),
      updateMovement: (id, m) => set((s) => ({
        movements: s.movements.map(mov => mov.id === id ? { ...mov, ...m } : mov)
      })),
      deleteMovement: (id) => set((s) => ({
        movements: s.movements.filter(m => m.id !== id)
      })),
      setReconciled: (id, reconciled) => set((s) => ({ movements: s.movements.map(m => m.id === id ? { ...m, reconciled } : m) })),
      aggregateFromStores: () => {
        const sales = useEstimateInvoiceStore.getState()
        const inv = useInventoryStore.getState()
        const next: CashflowMovement[] = []
        // Inflows from invoice payments (paymentHistory)
        for (const invoice of sales.invoices) {
          const currency = (invoice as any).currency || 'MAD'
          const ph = invoice.paymentHistory || []
          for (const p of ph) {
            next.push({
              id: `in_${invoice.id}_${p.id}`,
              type: 'inflow',
              date: p.paymentDate,
              partyName: invoice.customerName,
              partyId: invoice.customerId,
              linkedInvoiceId: invoice.id,
              linkedInvoiceNumber: invoice.invoiceNumber,
              paymentMethod: p.paymentMethod as PaymentMethod,
              amount: p.amount,
              currency,
              remainingBalance: (invoice.totalAmount - invoice.amountPaid) || 0,
              reconciled: false,
              source: 'sales',
              reference: p.reference
            })
          }
        }
        for (const sinv of inv.supplierInvoices || []) {
          const currency = (sinv as any).currency || 'MAD'
          if (sinv.paymentStatus === 'cancelled') continue
          const payments = Array.isArray(sinv.payments) ? sinv.payments : []
          for (const p of payments) {
            if (p?.status && p.status !== 'completed') continue
            next.push({
              id: `out_${sinv.id}_${p.id}`,
              type: 'outflow',
              date: p.paymentDate || sinv.invoiceDate,
              partyName: sinv.supplierName,
              partyId: sinv.supplierId,
              linkedInvoiceId: sinv.id,
              linkedInvoiceNumber: sinv.invoiceNumber,
              paymentMethod: (p.paymentMethod as PaymentMethod) || (sinv as any).paymentMethod || 'other',
              amount: p.amount || 0,
              currency,
              remainingBalance: (sinv.remainingAmount ?? (sinv.totalAmount - (sinv.paidAmount || 0))) || 0,
              reconciled: false,
              source: 'supplier',
              reference: p.referenceNumber || (sinv as any).reference || undefined
            })
          }
        }
        // Merge with existing manual/expense movements
        // We must preserve the reconciled status of system generated movements if possible
        // But currently we are regenerating them.
        // A better approach would be to upsert, but for now let's just keep manual ones
        // AND try to preserve reconciled status of system ones if they exist in current state
        
        set((s) => {
            const existingReconciled = new Map(s.movements.map(m => [m.id, m.reconciled]))
            
            const nextWithState = next.map(n => ({
                ...n,
                reconciled: existingReconciled.get(n.id) || false
            }))

            return {
                movements: [
                    ...s.movements.filter(m => m.source === 'expense' || m.source === 'manual'),
                    ...nextWithState
                ]
            }
        })
      }
    }),
    { name: 'cashflow-storage', storage: createJSONStorage(() => createServerStateStorage()) }
  )
)
