import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { 
  Estimate, 
  Invoice, 
  EstimateFormData, 
  InvoiceFormData, 
  PaymentRecord, 
  TaxCalculation,
  EstimateStats,
  InvoiceStats 
} from '../types/estimate'
import { Customer } from '../types/customer'
import { registerStore, getStore } from './storeRegistry'
import { useAuthStore } from './authStore'
import { createServerStateStorage } from '../services/api'

interface EstimateInvoiceStore {
  // Data
  estimates: Estimate[]
  invoices: Invoice[]
  paymentRecords: PaymentRecord[]
  invoiceDeliveryLinks: Record<string, string[]>
  invoicePdfUrls: Record<string, string[]>
  
  // UI State
  isCreatingEstimate: boolean
  isCreatingInvoice: boolean
  selectedEstimate: Estimate | null
  selectedInvoice: Invoice | null
  
  // Actions
  createEstimate: (formData: EstimateFormData, customer: Customer, vehicle: any, jobOrderId?: string) => Estimate
  getEstimateById: (id: string) => Estimate | undefined
  updateEstimate: (id: string, updates: Partial<Estimate>) => void
  linkEstimateToJobOrder: (estimateId: string, jobOrderId: string) => void
  unlinkEstimateFromJobOrder: (estimateId: string) => void
  deleteEstimate: (id: string) => void
  convertEstimateToInvoice: (estimateId: string) => Invoice
  
  createInvoice: (formData: InvoiceFormData, customer: Customer, vehicle: any) => Invoice
  createInvoiceFromDeliveryNotes: (deliveryNoteIds: string[]) => Invoice
  updateInvoice: (id: string, updates: Partial<Invoice>) => void
  deleteInvoice: (id: string) => Promise<void>
  saveInvoicePdfUrl: (invoiceId: string, url: string) => void
  
  recordPayment: (invoiceId: string, amount: number, method: string, reference: string) => void
  markInvoiceAsPaid: (invoiceId: string) => void
  markInvoiceAsUnpaid: (invoiceId: string) => void
  
  // Calculations
  calculateTax: (subtotal: number, vatRate: number) => TaxCalculation
  calculateInvoiceTotals: (items: any[]) => { subtotal: number; partsSubtotal: number; laborSubtotal: number; vatAmount: number; totalAmount: number }
  
  // Stats
  getEstimateStats: () => EstimateStats
  getInvoiceStats: () => InvoiceStats
  
  // UI Actions
  setIsCreatingEstimate: (value: boolean) => void
  setIsCreatingInvoice: (value: boolean) => void
  setSelectedEstimate: (estimate: Estimate | null) => void
  setSelectedInvoice: (invoice: Invoice | null) => void
  
  // Filters
  getEstimatesByCustomer: (customerId: string) => Estimate[]
  getInvoicesByCustomer: (customerId: string) => Invoice[]
  getInvoiceDeliveryNotes: (invoiceId: string) => any[]
  getOverdueInvoices: () => Invoice[]
  getUnpaidInvoices: () => Invoice[]
}

const VAT_RATE = 0.20 // 20% VAT
const normalizeTaxRate = (rate?: number) => {
  const normalized = typeof rate === 'number' ? rate : VAT_RATE
  return normalized > 1 ? normalized / 100 : normalized
}

export const useEstimateInvoiceStore = create<EstimateInvoiceStore>()(
  persist(
    (set, get) => ({
  // Initial state
  estimates: [],
  invoices: [],
  paymentRecords: [],
  invoiceDeliveryLinks: {},
  invoicePdfUrls: {},
  isCreatingEstimate: false,
  isCreatingInvoice: false,
  selectedEstimate: null,
  selectedInvoice: null,
  
  // Actions
  createEstimate: (formData, customer, vehicle, jobOrderId) => {
    const { estimates } = get()
    const estimateNumber = `DV-${new Date().getFullYear()}-${String(estimates.length + 1).padStart(3, '0')}`
    
    const subtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)
    // Calculate VAT based on each item's tax rate
    const vatAmount = formData.items.reduce((sum, item) => {
      const rate = normalizeTaxRate(item.taxRate)
      return sum + (item.totalPrice * rate)
    }, 0)
    const totalAmount = subtotal + vatAmount
    
    const newEstimate: Estimate = {
      id: `est_${Date.now()}`,
      estimateNumber,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      vehicleId: vehicle.id,
      vehicleInfo: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        registration: vehicle.registration
      },
      issueDate: formData.issueDate,
      expiryDate: formData.expiryDate,
      status: 'draft',
      items: formData.items,
      subtotal,
      vatAmount,
      totalAmount,
      notes: formData.notes,
      termsAndConditions: formData.termsAndConditions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current_user',
      jobOrderId
    }
    
    set(state => ({
      estimates: [...state.estimates, newEstimate]
    }))

    const authState = useAuthStore.getState()
    authState.logActivity(
      'DOCUMENT_CREATED',
      {
        documentType: 'estimate',
        documentNumber: newEstimate.estimateNumber,
        estimateId: newEstimate.id,
        customerName: newEstimate.customerName
      },
      'documents',
      newEstimate.id
    )
    
    return newEstimate
  },

  getEstimateById: (id) => {
    return get().estimates.find(e => e.id === id)
  },
  
  updateEstimate: (id, updates) => {
    const { estimates } = get()
    const currentEstimate = estimates.find(e => e.id === id)
    if (!currentEstimate) return

    let calculatedUpdates = { ...updates }
    
    // Recalculate totals if items changed
    if (updates.items) {
      const subtotal = updates.items.reduce((sum, item) => sum + item.totalPrice, 0)
      const vatAmount = updates.items.reduce((sum, item) => {
        const rate = normalizeTaxRate(item.taxRate)
        return sum + (item.totalPrice * rate)
      }, 0)
      const totalAmount = subtotal + vatAmount
      
      calculatedUpdates = {
        ...calculatedUpdates,
        subtotal,
        vatAmount,
        totalAmount
      }
    }

    set(state => ({
      estimates: state.estimates.map(estimate =>
        estimate.id === id
          ? { ...estimate, ...calculatedUpdates, updatedAt: new Date().toISOString() }
          : estimate
      )
    }))

    const authState = useAuthStore.getState()
    authState.logActivity(
      'DOCUMENT_UPDATED',
      {
        documentType: 'estimate',
        documentNumber: currentEstimate.estimateNumber,
        estimateId: id
      },
      'documents',
      id
    )
  },

  linkEstimateToJobOrder: (estimateId, jobOrderId) => set(state => ({
    estimates: state.estimates.map(estimate =>
      estimate.id === estimateId
        ? { ...estimate, jobOrderId, updatedAt: new Date().toISOString() }
        : estimate
    )
  })),

  unlinkEstimateFromJobOrder: (estimateId) => set(state => ({
    estimates: state.estimates.map(estimate =>
      estimate.id === estimateId
        ? { ...estimate, jobOrderId: undefined, updatedAt: new Date().toISOString() }
        : estimate
    )
  })),
  
  deleteEstimate: (id) => {
    const { estimates } = get()
    const currentEstimate = estimates.find(e => e.id === id)

    set(state => ({
      estimates: state.estimates.filter(estimate => estimate.id !== id)
    }))

    if (currentEstimate) {
      const authState = useAuthStore.getState()
      authState.logActivity(
        'DOCUMENT_DELETED',
        {
          documentType: 'estimate',
          documentNumber: currentEstimate.estimateNumber,
          estimateId: id
        },
        'documents',
        id
      )
    }
  },
  
  convertEstimateToInvoice: (estimateId) => {
    const { estimates, invoices } = get()
    const estimate = estimates.find(e => e.id === estimateId)
    
    if (!estimate) {
      throw new Error('Estimate not found')
    }
    
    const invoiceNumber = `FA-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30) // 30 days payment terms
    
    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      estimateId: estimate.id,
      customerId: estimate.customerId,
      customerName: estimate.customerName,
      vehicleId: estimate.vehicleId,
      vehicleInfo: estimate.vehicleInfo,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'draft',
      items: estimate.items.map(item => ({ ...item })), // Deep copy
      subtotal: estimate.subtotal,
      vatAmount: estimate.vatAmount,
      totalAmount: estimate.totalAmount,
      paidAmount: 0,
      remainingAmount: estimate.totalAmount,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      notes: estimate.notes,
      termsAndConditions: estimate.termsAndConditions || 'Payment due within 30 days.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current_user'
    }
    
    set(state => ({
      invoices: [...state.invoices, newInvoice],
      estimates: state.estimates.map(e =>
        e.id === estimateId
          ? { ...e, convertedToInvoice: newInvoice.id, convertedDate: newInvoice.createdAt }
          : e
      )
    }))

    const authState = useAuthStore.getState()
    authState.logActivity(
      'DOCUMENT_CREATED',
      {
        documentType: 'invoice',
        documentNumber: newInvoice.invoiceNumber,
        invoiceId: newInvoice.id,
        customerName: newInvoice.customerName,
        sourceEstimateId: estimate.id
      },
      'documents',
      newInvoice.id
    )
    
    return newInvoice
  },
  
  createInvoice: (formData, customer, vehicle) => {
    const { invoices } = get()
    const invoiceNumber = `FA-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`
    
    const subtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const vatAmount = formData.items.reduce((sum, item) => {
      const rate = normalizeTaxRate(item.taxRate)
      return sum + (item.totalPrice * rate)
    }, 0)
    const totalAmount = subtotal + vatAmount
    
    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      vehicleId: vehicle.id,
      vehicleInfo: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        registration: vehicle.registration
      },
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      status: 'draft',
      items: formData.items,
      subtotal,
      vatAmount,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      notes: formData.notes,
      termsAndConditions: formData.termsAndConditions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current_user'
    }
    
    set(state => ({
      invoices: [...state.invoices, newInvoice]
    }))

    const authState = useAuthStore.getState()
    authState.logActivity(
      'DOCUMENT_CREATED',
      {
        documentType: 'invoice',
        documentNumber: newInvoice.invoiceNumber,
        invoiceId: newInvoice.id,
        customerName: newInvoice.customerName
      },
      'documents',
      newInvoice.id
    )
    
    return newInvoice
  },

  // Create invoice from existing Delivery Notes
  createInvoiceFromDeliveryNotes: (deliveryNoteIds) => {
    const { invoices } = get()
    const dnStore = getStore('deliveryNoteStore')
    if (!dnStore) throw new Error('Delivery note store not initialized')
    const { getDeliveryNoteById, updateDeliveryNote } = dnStore.getState()
    if (!Array.isArray(deliveryNoteIds) || deliveryNoteIds.length === 0) {
      throw new Error('No delivery notes provided')
    }

    const notes = deliveryNoteIds.map(id => {
      const note = getDeliveryNoteById(id)
      if (!note) throw new Error(`Delivery note not found: ${id}`)
      if (note.status === 'invoiced' || note.relatedInvoiceId) throw new Error(`Delivery note already invoiced: ${note.blNumber}`)
      return note
    })

    // Use snapshot from first note
    const first = notes[0]
    const customerId = first.customerId || ''
    const customerName = first.customerName || ''
    const vehicleInfo = first.vehicleInfo

    // Flatten DN lines into invoice items
    const items = [
      ...notes.flatMap(n => (n.parts || []).map((p: any) => ({
        id: `inv_item_${n.id}_${p.id || Math.random()}`,
        type: 'part' as const,
        description: p.name || p.description || 'Part',
        quantity: p.quantity,
        unitPrice: p.unitPrice || p.unitCost || 0,
        totalPrice: p.totalPrice || (p.quantity * (p.unitPrice || p.unitCost || 0)),
        taxRate: 0.2
      })) ),
      ...notes.flatMap(n => (n.laborItems || []).map((l: any) => ({
        id: `inv_item_${n.id}_${l.id || Math.random()}`,
        type: 'labor' as const,
        description: l.description || 'Labor',
        quantity: l.hours || 1,
        unitPrice: l.hourlyRate || 0,
        totalPrice: l.totalAmount || ((l.hours || 1) * (l.hourlyRate || 0)),
        taxRate: 0.2
      })) )
    ]

    const { subtotal, vatAmount, totalAmount } = get().calculateInvoiceTotals(items)
    const invoiceNumber = `FA-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`
    const issueDate = new Date().toISOString().split('T')[0]
    const due = new Date(); due.setDate(due.getDate() + 30)

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      customerId,
      customerName,
      vehicleId: first.vehicleInfo?.vin || '',
      vehicleInfo,
      issueDate,
      dueDate: due.toISOString().split('T')[0],
      status: 'draft',
      items,
      subtotal,
      vatAmount,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      notes: '',
      termsAndConditions: 'Payment due within 30 days.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current_user'
    }

    // Persist invoice and link DN ids
    set(state => ({
      invoices: [...state.invoices, newInvoice],
      invoiceDeliveryLinks: { ...state.invoiceDeliveryLinks, [newInvoice.id]: deliveryNoteIds }
    }))

    const authState = useAuthStore.getState()
    authState.logActivity(
      'DOCUMENT_CREATED',
      {
        documentType: 'invoice',
        documentNumber: newInvoice.invoiceNumber,
        invoiceId: newInvoice.id,
        customerName: newInvoice.customerName,
        sourceDeliveryNotes: deliveryNoteIds.join('|')
      },
      'documents',
      newInvoice.id
    )

    // Mark each DN as invoiced and link invoice id
    notes.forEach(n => {
      updateDeliveryNote(n.id, { status: 'invoiced' as any, relatedInvoiceId: newInvoice.id })
    })

    return newInvoice
  },
  
  updateInvoice: (id, updates) => {
    const { invoices } = get()
    const currentInvoice = invoices.find(i => i.id === id)
    if (!currentInvoice) return

    let calculatedUpdates = { ...updates }

    // Recalculate totals if items changed
    if (updates.items) {
      const subtotal = updates.items.reduce((sum, item) => sum + item.totalPrice, 0)
      const vatAmount = updates.items.reduce((sum, item) => {
        const rate = normalizeTaxRate(item.taxRate)
        return sum + (item.totalPrice * rate)
      }, 0)
      const totalAmount = subtotal + vatAmount
      
      calculatedUpdates = {
        ...calculatedUpdates,
        subtotal,
        vatAmount,
        totalAmount,
        remainingAmount: totalAmount - (currentInvoice.paidAmount || 0)
      }
    }

    set(state => ({
      invoices: state.invoices.map(invoice =>
        invoice.id === id
          ? { ...invoice, ...calculatedUpdates, updatedAt: new Date().toISOString() }
          : invoice
      )
    }))

    const authState = useAuthStore.getState()
    authState.logActivity(
      'DOCUMENT_UPDATED',
      {
        documentType: 'invoice',
        documentNumber: currentInvoice.invoiceNumber,
        invoiceId: id
      },
      'documents',
      id
    )
  },
  
  deleteInvoice: async (id) => {
    const { invoices } = get()
    const currentInvoice = invoices.find(i => i.id === id)

    if (!currentInvoice) {
      throw new Error('Invoice not found')
    }

    set(state => {
      const { [id]: _links, ...remainingLinks } = state.invoiceDeliveryLinks
      const { [id]: _pdfUrls, ...remainingPdfUrls } = state.invoicePdfUrls

      return {
        invoices: state.invoices.filter(invoice => invoice.id !== id),
        invoiceDeliveryLinks: remainingLinks,
        invoicePdfUrls: remainingPdfUrls
      }
    })

    const authState = useAuthStore.getState()
    authState.logActivity(
      'DOCUMENT_DELETED',
      {
        documentType: 'invoice',
        documentNumber: currentInvoice.invoiceNumber,
        invoiceId: id
      },
      'documents',
      id
    )
  },

  saveInvoicePdfUrl: (invoiceId, url) => {
    set(state => ({
      invoicePdfUrls: {
        ...state.invoicePdfUrls,
        [invoiceId]: [...(state.invoicePdfUrls[invoiceId] || []), url]
      }
    }))
  },
  
  recordPayment: async (invoiceId, amount, method, reference) => {
    const { invoices, paymentRecords } = get()
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (!invoice) {
      throw new Error('Invoice not found')
    }
    const paymentDate = new Date().toISOString().split('T')[0]
    const newRecord: PaymentRecord = {
      id: `pay_${Date.now()}`,
      invoiceId,
      amount,
      paymentDate,
      paymentMethod: (method as PaymentRecord['paymentMethod']) || 'other',
      reference,
      createdBy: 'current_user',
      createdAt: new Date().toISOString()
    }
    const updatedAmountPaid = (invoice.amountPaid || 0) + amount
    const remaining = Math.max((invoice.totalAmount || 0) - updatedAmountPaid, 0)
    const newPaymentStatus = remaining <= 0 ? 'paid' : updatedAmountPaid > 0 ? 'partial' : 'unpaid'
    set(state => ({
      invoices: state.invoices.map(inv =>
        inv.id === invoiceId
          ? {
              ...inv,
              amountPaid: updatedAmountPaid,
              paidAmount: updatedAmountPaid,
              remainingAmount: remaining,
              paymentStatus: newPaymentStatus,
              status: newPaymentStatus === 'paid' ? 'paid' : inv.status,
              paymentMethod: newRecord.paymentMethod,
              paymentReference: newRecord.reference,
              paymentDate,
              paymentHistory: [...(inv.paymentHistory || []), newRecord],
              updatedAt: new Date().toISOString()
            }
          : inv
      ),
      paymentRecords: [...paymentRecords, newRecord]
    }))
  },
  
  markInvoiceAsPaid: (invoiceId) => {
    const { invoices } = get()
    const invoice = invoices.find(inv => inv.id === invoiceId)
    
    if (!invoice) {
      throw new Error('Invoice not found')
    }
    
    set(state => ({
      invoices: state.invoices.map(inv =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'paid',
              paymentStatus: 'paid',
              paidAmount: inv.totalAmount,
              amountPaid: inv.totalAmount,
              remainingAmount: 0,
              paymentDate: new Date().toISOString().split('T')[0],
              updatedAt: new Date().toISOString()
            }
          : inv
      )
    }))
  },
  
  markInvoiceAsUnpaid: (invoiceId) => {
    set(state => ({
      invoices: state.invoices.map(inv =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'sent',
              paymentStatus: 'unpaid',
              paidAmount: 0,
              amountPaid: 0,
              remainingAmount: inv.totalAmount,
              paymentDate: undefined,
              paymentMethod: undefined,
              paymentReference: undefined,
              updatedAt: new Date().toISOString()
            }
          : inv
      )
    }))
  },
  
  // Calculations
  calculateTax: (subtotal, vatRate) => {
    const vatAmount = subtotal * vatRate
    return {
      subtotal,
      vatRate,
      vatAmount,
      totalAmount: subtotal + vatAmount
    }
  },
  
  calculateInvoiceTotals: (items) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
    const partsSubtotal = items.filter(i => i.type === 'part').reduce((sum, i) => sum + i.totalPrice, 0)
    const laborSubtotal = items.filter(i => i.type === 'labor' || i.type === 'service').reduce((sum, i) => sum + i.totalPrice, 0)
    const vatAmount = subtotal * VAT_RATE
    return {
      subtotal,
      partsSubtotal,
      laborSubtotal,
      vatAmount,
      totalAmount: subtotal + vatAmount
    }
  },
  
  // Stats
  getEstimateStats: () => {
    const { estimates } = get()
    const totalEstimates = estimates.length
    const acceptedEstimates = estimates.filter(e => e.status === 'accepted').length
    const rejectedEstimates = estimates.filter(e => e.status === 'rejected').length
    const conversionRate = totalEstimates > 0 ? (acceptedEstimates / totalEstimates) * 100 : 0
    const totalValue = estimates.reduce((sum, e) => sum + e.totalAmount, 0)
    const averageValue = totalEstimates > 0 ? totalValue / totalEstimates : 0
    
    return {
      totalEstimates,
      acceptedEstimates,
      rejectedEstimates,
      conversionRate,
      totalValue,
      averageValue
    }
  },
  
  getInvoiceStats: () => {
    const { invoices } = get()
    const totalInvoices = invoices.length
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length
    const overdueInvoices = invoices.filter(inv => 
      inv.status !== 'paid' && inv.status !== 'cancelled' && new Date(inv.dueDate) < new Date()
    ).length
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0)
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
    const averageInvoiceValue = totalInvoices > 0 ? 
      invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / totalInvoices : 0
    
    return {
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      totalOutstanding,
      totalPaid,
      averageInvoiceValue
    }
  },
  
  // Filters
  getEstimatesByCustomer: (customerId) => {
    return get().estimates.filter(estimate => estimate.customerId === customerId)
  },
  
  getInvoicesByCustomer: (customerId) => {
    return get().invoices.filter(invoice => invoice.customerId === customerId)
  },

  getInvoiceDeliveryNotes: (invoiceId) => {
    const links = get().invoiceDeliveryLinks[invoiceId] || []
    const dnStore = getStore('deliveryNoteStore')
    if (!dnStore) return []
    const { getDeliveryNoteById } = dnStore.getState()
    return links.map(id => getDeliveryNoteById(id)).filter(Boolean)
  },
  
  getOverdueInvoices: () => {
    return get().invoices.filter(invoice => 
      invoice.status !== 'paid' && invoice.status !== 'cancelled' && new Date(invoice.dueDate) < new Date()
    )
  },
  
  getUnpaidInvoices: () => {
    return get().invoices.filter(invoice => invoice.status !== 'paid' && invoice.status !== 'cancelled')
  },
  
  // UI Actions
  setIsCreatingEstimate: (value) => set({ isCreatingEstimate: value }),
  setIsCreatingInvoice: (value) => set({ isCreatingInvoice: value }),
  setSelectedEstimate: (estimate) => set({ selectedEstimate: estimate }),
  setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice })
    }),
    {
      name: 'garage-estimates-invoices-storage',
      storage: createJSONStorage(() => createServerStateStorage()),
      partialize: (state) => ({
        // Persist only critical data, not UI state
        estimates: state.estimates,
        invoices: state.invoices,
        paymentRecords: state.paymentRecords,
        invoiceDeliveryLinks: state.invoiceDeliveryLinks,
        // Don't persist temporary UI state
        isCreatingEstimate: false,
        isCreatingInvoice: false,
        selectedEstimate: null,
        selectedInvoice: null
      }),
      onRehydrateStorage: () => (state) => {
        // Validate and migrate data when rehydrating
        if (state) {
          const validatedData = validateEstimateInvoiceData(state)
          Object.assign(state, validatedData)
        }
      },
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Handle migration from version 0 to 1
          const state = persistedState as any
          return {
            ...state,
            ...validateEstimateInvoiceData(state)
          }
        }
        return persistedState as EstimateInvoiceStore
      }
    }
  )
)

registerStore('estimateInvoiceStore', useEstimateInvoiceStore);

// Data validation helpers for estimate/invoice persistence
const normalizeItems = (items: any[] = []) => {
  return items.map(item => ({
    ...item,
    taxRate: normalizeTaxRate(item?.taxRate)
  }))
}

const computeTotalsFromItems = (items: any[] = []) => {
  const subtotal = items.reduce((sum, item) => sum + Number(item?.totalPrice || 0), 0)
  const vatAmount = items.reduce((sum, item) => {
    const rate = normalizeTaxRate(item?.taxRate)
    return sum + (Number(item?.totalPrice || 0) * rate)
  }, 0)
  const totalAmount = subtotal + vatAmount
  return { subtotal, vatAmount, totalAmount }
}

const normalizeEstimate = (estimate: any) => {
  const items = normalizeItems(Array.isArray(estimate?.items) ? estimate.items : [])
  const totals = computeTotalsFromItems(items)
  return {
    ...estimate,
    items,
    ...totals
  }
}

const normalizeInvoice = (invoice: any) => {
  const items = normalizeItems(Array.isArray(invoice?.items) ? invoice.items : [])
  const totals = computeTotalsFromItems(items)
  const paidAmount = typeof invoice?.paidAmount === 'number'
    ? invoice.paidAmount
    : (typeof invoice?.amountPaid === 'number' ? invoice.amountPaid : 0)
  return {
    ...invoice,
    items,
    ...totals,
    remainingAmount: totals.totalAmount - paidAmount
  }
}

const validateEstimateInvoiceData = (data: any): Partial<EstimateInvoiceStore> => {
  const validated: Partial<EstimateInvoiceStore> = {}
  
  if (Array.isArray(data.estimates)) {
    validated.estimates = data.estimates.filter((estimate: any) => {
      // Relaxed validation: just check if it has an ID
      return estimate && estimate.id
    }).map(normalizeEstimate)
  }
  
  if (Array.isArray(data.invoices)) {
    validated.invoices = data.invoices.filter((invoice: any) => {
      // Relaxed validation: just check if it has an ID
      return invoice && invoice.id
    }).map(normalizeInvoice)
  }
  
  if (Array.isArray(data.paymentRecords)) {
    validated.paymentRecords = data.paymentRecords.filter((payment: any) => {
      return payment && payment.id
    })
  }
  
  return validated
}
