import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { JobOrder, Mechanic, JobPart } from '../types/jobOrder'
import { useMechanicStore } from './mechanicStore'
import { useAuthStore } from './authStore'
import { useInventoryStore } from './inventoryStore'
import { createServerStateStorage } from '../services/api'

interface JobOrderStore {
  jobOrders: JobOrder[]
  mechanics: Mechanic[]
  searchTerm: string
  selectedJobOrder: JobOrder | null
  isLoading: boolean
  isPersisted: boolean
  deletionMeta: Record<string, { deletedAt?: string; deletedBy?: string }>
  
  // Actions
  setSearchTerm: (term: string) => void
  setSelectedJobOrder: (jobOrder: JobOrder | null) => void
  addJobOrder: (jobOrder: JobOrder) => Promise<void>
  updateJobOrder: (id: string, jobOrder: Partial<JobOrder>) => Promise<void>
  deleteJobOrder: (id: string) => void
  updateJobStatus: (id: string, status: JobOrder['status'], notes: string) => void
  approveJobOrder: (id: string, approvalNotes: string, userId: string) => void
  isJobOrderReadyForApproval: (jobOrder: JobOrder) => boolean
  markJobOrderAsTransferred: (id: string, deliveryNoteId: string) => void
  resetJobOrderTransfer: (id: string) => void
  addPartToJob: (jobId: string, part: JobOrder['partsUsed'][0]) => void
  updatePartInJob: (jobId: string, partId: string, part: Partial<JobOrder['partsUsed'][0]>) => void
  deletePartFromJob: (jobId: string, partId: string) => void
  addLaborToJob: (jobId: string, labor: JobOrder['laborItems'][0]) => void
  updateLaborInJob: (jobId: string, laborId: string, labor: Partial<JobOrder['laborItems'][0]>) => void
  deleteLaborFromJob: (jobId: string, laborId: string) => void
  addDiagnosticFile: (jobId: string, file: JobOrder['diagnosticFiles'][0]) => void
  deleteDiagnosticFile: (jobId: string, fileId: string) => void
  addImageToJob: (jobId: string, image: JobOrder['attachedImages'][0]) => void
  deleteImageFromJob: (jobId: string, imageId: string) => void
  addLinkedEstimate: (jobId: string, estimateId: string) => void
  removeLinkedEstimate: (jobId: string, estimateId: string) => void
  addEstimateAttachment: (jobId: string, file: JobOrder['diagnosticFiles'][0]) => void
  deleteEstimateAttachment: (jobId: string, fileId: string) => void
  getVisibleJobOrders: () => JobOrder[]
  getFilteredJobOrders: () => JobOrder[]
  getJobOrderById: (id: string) => JobOrder | undefined
  getMechanicById: (id: string) => Mechanic | undefined
  initializeStore: () => void
}



const _mockJobOrders: JobOrder[] = [
  {
    id: 'job_1',
    jobNumber: 'OR-2024-001',
    customerId: '1',
    vehicleId: 'v1',
    customerName: 'John Smith',
    vehicleInfo: {
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      vin: '1HGBH41JXMN109186',
      registration: 'ABC123'
    },
    description: 'Brake pad replacement and rotor resurfacing',
    jobDescriptions: [],
    priority: 'medium',
    status: 'completed',
    assignedMechanic: 'mech_1',
    estimatedHours: 3,
    actualHours: 2.5,
    startDate: '2024-11-15',
    deadline: '2024-11-17',
    completionDate: '2024-11-16T16:30:00Z',
    partsUsed: [
      {
        id: 'part_1',
        partNumber: 'BP-TOY-2020-F',
        name: 'Front Brake Pads',
        description: 'OEM Front Brake Pads for Toyota Camry 2020',
        quantity: 1,
        unitCost: 89.99,
        totalCost: 89.99,
        supplier: 'AutoParts Corp',
        status: 'installed',
        orderedDate: '2024-11-14',
        receivedDate: '2024-11-15'
      }
    ],
    laborItems: [
      {
        id: 'labor_1',
        description: 'Brake pad replacement',
        hours: 1.5,
        rate: 85,
        total: 127.50,
        mechanic: 'Mike Johnson',
        date: '2024-11-15'
      },
      {
        id: 'labor_2',
        description: 'Rotor resurfacing',
        hours: 1.0,
        rate: 85,
        total: 85.00,
        mechanic: 'Mike Johnson',
        date: '2024-11-15'
      }
    ],
    diagnosticFiles: [
      {
        id: 'diagfile_1',
        originalName: 'brake_inspection.pdf',
        storedName: 'job_1_1700000000000_brake_inspection.pdf',
        mimeType: 'application/pdf',
        size: 12345,
        uploadedAt: '2024-11-15T10:00:00Z',
        uploadedBy: 'Mike Johnson'
      }
    ],
    attachedImages: [
      {
        id: 'img_1',
        url: '/api/images/brake-wear.jpg',
        filename: 'brake-wear.jpg',
        description: 'Worn brake pads before replacement',
        uploadDate: '2024-11-15',
        category: 'before'
      }
    ],
    estimatedCost: 350,
    finalCost: 302.49,
    createdAt: '2024-11-15T08:00:00Z',
    updatedAt: '2024-11-15T14:30:00Z',
    createdBy: 'admin',
    notes: 'Customer requested OEM parts only',
    isApproved: false
  },
  {
    id: 'job_2',
    jobNumber: 'OR-2024-002',
    customerId: '2',
    vehicleId: 'v2',
    customerName: 'Jane Doe',
    vehicleInfo: {
      make: 'Honda',
      model: 'Civic',
      year: 2019,
      vin: '2HGBH41JXMN109187',
      registration: 'XYZ789'
    },
    description: 'Air conditioning system diagnosis and repair',
    jobDescriptions: [],
    priority: 'high',
    status: 'waiting-parts',
    assignedMechanic: 'mech_3',
    estimatedHours: 4,
    actualHours: 0,
    startDate: '2024-11-16',
    deadline: '2024-11-18',
    partsUsed: [
      {
        id: 'part_2',
        partNumber: 'AC-COMP-HON-2019',
        name: 'AC Compressor',
        description: 'AC Compressor for Honda Civic 2019',
        quantity: 1,
        unitCost: 299.99,
        totalCost: 299.99,
        supplier: 'Cooling Systems Inc',
        status: 'ordered',
        orderedDate: '2024-11-16'
      }
    ],
    laborItems: [],
    diagnosticFiles: [],
    attachedImages: [],
    estimatedCost: 650,
    finalCost: 0,
    createdAt: '2024-11-16T09:00:00Z',
    updatedAt: '2024-11-16T09:00:00Z',
    createdBy: 'admin',
    notes: 'Customer needs AC fixed before weekend trip',
    isApproved: false
  }
]

const getPartKey = (part: JobPart) => part.partNumber || part.name

const getInstalledPartQuantities = (parts: JobPart[] | undefined) => {
  const map: Record<string, { quantity: number; samplePart: JobPart }> = {}
  ;(parts || []).forEach((part) => {
    if (part.status !== 'installed') return
    const key = getPartKey(part)
    if (!key) return
    const existing = map[key]
    if (existing) {
      existing.quantity += part.quantity
    } else {
      map[key] = { quantity: part.quantity, samplePart: part }
    }
  })
  return map
}

const syncInstalledPartsWithInventory = async (
  jobId: string,
  beforeParts: JobPart[] | undefined,
  afterParts: JobPart[] | undefined
) => {
  const beforeMap = getInstalledPartQuantities(beforeParts)
  const afterMap = getInstalledPartQuantities(afterParts)

  const inventoryState = useInventoryStore.getState()
  const { issueStock, adjustStock, fetchInventoryItems } = inventoryState
  const authState = useAuthStore.getState()
  const requestedBy = authState.currentUser?.username || 'system'

  // Ensure we have latest inventory data
  await fetchInventoryItems()
  const updatedInventoryItems = useInventoryStore.getState().inventoryItems

  const findInventoryItemForPart = (part: JobPart) => {
    const key = part.partNumber
    if (key) {
      const bySku = updatedInventoryItems.find(
        (item) =>
          item.sku === key ||
          item.manufacturerPartNumber === key ||
          item.supplierPartNumber === key
      )
      if (bySku) return bySku
    }
    return updatedInventoryItems.find(
      (item) => item.name.toLowerCase() === part.name.toLowerCase()
    )
  }

  const allKeys = new Set([
    ...Object.keys(beforeMap),
    ...Object.keys(afterMap)
  ])

  for (const key of allKeys) {
    const beforeQuantity = beforeMap[key]?.quantity || 0
    const afterQuantity = afterMap[key]?.quantity || 0
    const diff = afterQuantity - beforeQuantity
    if (diff === 0) continue

    const samplePart = (afterMap[key] || beforeMap[key])?.samplePart
    if (!samplePart) continue

    const inventoryItem = findInventoryItemForPart(samplePart)
    if (!inventoryItem) {
      console.warn('No matching inventory item for job part', samplePart)
      continue
    }

    if (diff > 0) {
      await issueStock(
        inventoryItem.id,
        diff,
        `Job order ${jobId} part installed`,
        jobId,
        requestedBy
      )
    } else {
      const currentInventoryState = useInventoryStore.getState()
      const currentItem = currentInventoryState.inventoryItems.find(
        (item) => item.id === inventoryItem.id
      )
      if (!currentItem) continue
      const returnedQuantity = -diff
      const targetQuantity = currentItem.quantity + returnedQuantity
      await adjustStock(
        inventoryItem.id,
        targetQuantity,
        `Job order ${jobId} part removed`,
        jobId
      )
    }
  }
}

export const useJobOrderStore = create<JobOrderStore>()(
  persist(
    (set, get) => ({
  jobOrders: [], // Start empty, will be populated by initializeStore
  mechanics: [],
  searchTerm: '',
  selectedJobOrder: null,
  isLoading: false,
  isPersisted: false,
  deletionMeta: {},

  setSearchTerm: (term) => set({ searchTerm: term }),
  
  setSelectedJobOrder: (jobOrder) => set({ selectedJobOrder: jobOrder }),

  addJobOrder: async (jobOrder) => {
    set((state) => ({
      jobOrders: [...state.jobOrders, jobOrder]
    }))

    await syncInstalledPartsWithInventory(jobOrder.id, [], jobOrder.partsUsed)

    const authState = useAuthStore.getState()
    authState.logActivity(
      'DOCUMENT_CREATED',
      {
        documentType: 'job_order',
        documentNumber: jobOrder.jobNumber,
        jobOrderId: jobOrder.id,
        customerName: jobOrder.customerName
      },
      'documents',
      jobOrder.id
    )
  },

  updateJobOrder: async (id, updatedJobOrder) => {
    const { jobOrders } = get()
    const existing = jobOrders.find(j => j.id === id)

    if (existing) {
      const beforeParts = existing.partsUsed
      const afterParts = updatedJobOrder.partsUsed ?? existing.partsUsed

      set((state) => ({
        jobOrders: state.jobOrders.map(jobOrder =>
          jobOrder.id === id ? { ...jobOrder, ...updatedJobOrder } : jobOrder
        )
      }))

      await syncInstalledPartsWithInventory(id, beforeParts, afterParts)

      const authState = useAuthStore.getState()
      authState.logActivity(
        'DOCUMENT_UPDATED',
        {
          documentType: 'job_order',
          documentNumber: existing.jobNumber,
          jobOrderId: id
        },
        'documents',
        id
      )
    } else {
      set((state) => ({
        jobOrders: state.jobOrders.map(jobOrder =>
          jobOrder.id === id ? { ...jobOrder, ...updatedJobOrder } : jobOrder
        )
      }))
    }
  },

  deleteJobOrder: (id) => {
    const { jobOrders } = get()
    const existing = jobOrders.find(j => j.id === id)

    set((state) => ({
      deletionMeta: { ...state.deletionMeta, [id]: { deletedAt: new Date().toISOString(), deletedBy: 'current_user' } }
    }))

    if (existing) {
      const authState = useAuthStore.getState()
      authState.logActivity(
        'DOCUMENT_DELETED',
        {
          documentType: 'job_order',
          documentNumber: existing.jobNumber,
          jobOrderId: id
        },
        'documents',
        id
      )
    }
  },

  updateJobStatus: (id, status, notes) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === id 
        ? { 
            ...jobOrder, 
            status, 
            notes: jobOrder.notes ? `${jobOrder.notes}\n${notes}` : notes,
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  markJobOrderAsTransferred: (id, _deliveryNoteId) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === id
        ? {
            ...jobOrder,
            status: 'transferred' as const,
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  resetJobOrderTransfer: (id) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === id && jobOrder.status === 'transferred'
        ? {
            ...jobOrder,
            status: 'completed',
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  approveJobOrder: (id, approvalNotes, userId) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === id 
        ? { 
            ...jobOrder, 
            status: 'approved',
            isApproved: true,
            approvedAt: new Date().toISOString(),
            approvedBy: userId,
            approvalNotes: approvalNotes,
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  isJobOrderReadyForApproval: (jobOrder) => {
    // Check if job order meets criteria for approval
    return (
      jobOrder.status === 'completed' &&
      jobOrder.partsUsed && jobOrder.partsUsed.length > 0 &&
      !jobOrder.isApproved
    )
  },

  addPartToJob: (jobId, part) => {
    const { jobOrders } = get()
    const existing = jobOrders.find(jobOrder => jobOrder.id === jobId)
    const beforeParts = existing?.partsUsed || []
    const afterParts = [...beforeParts, part]

    set((state) => ({
      jobOrders: state.jobOrders.map(jobOrder =>
        jobOrder.id === jobId
          ? {
              ...jobOrder,
              partsUsed: afterParts,
              updatedAt: new Date().toISOString()
            }
          : jobOrder
      )
    }))

    syncInstalledPartsWithInventory(jobId, beforeParts, afterParts)
  },

  addLaborToJob: (jobId, labor) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            laborItems: [...jobOrder.laborItems, labor],
            actualHours: jobOrder.actualHours + labor.hours,
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  updateLaborInJob: (jobId, laborId, labor) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            laborItems: jobOrder.laborItems.map(item =>
              item.id === laborId
                ? { ...item, ...labor }
                : item
            ),
            actualHours: jobOrder.laborItems.reduce((total, item) => 
              item.id === laborId ? total + (labor.hours || item.hours) : total + item.hours, 0
            ),
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  deleteLaborFromJob: (jobId, laborId) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            laborItems: jobOrder.laborItems.filter(item => item.id !== laborId),
            actualHours: jobOrder.actualHours - (jobOrder.laborItems.find(item => item.id === laborId)?.hours || 0),
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  updatePartInJob: (jobId, partId, part) => {
    const { jobOrders } = get()
    const existing = jobOrders.find(jobOrder => jobOrder.id === jobId)
    const beforeParts = existing?.partsUsed || []
    const afterParts = beforeParts.map(item =>
      item.id === partId ? { ...item, ...part } : item
    )

    set((state) => ({
      jobOrders: state.jobOrders.map(jobOrder =>
        jobOrder.id === jobId
          ? {
              ...jobOrder,
              partsUsed: afterParts,
              updatedAt: new Date().toISOString()
            }
          : jobOrder
      )
    }))

    syncInstalledPartsWithInventory(jobId, beforeParts, afterParts)
  },

  deletePartFromJob: (jobId, partId) => {
    const { jobOrders } = get()
    const existing = jobOrders.find(jobOrder => jobOrder.id === jobId)
    const beforeParts = existing?.partsUsed || []
    const afterParts = beforeParts.filter(item => item.id !== partId)

    set((state) => ({
      jobOrders: state.jobOrders.map(jobOrder =>
        jobOrder.id === jobId
          ? {
              ...jobOrder,
              partsUsed: afterParts,
              updatedAt: new Date().toISOString()
            }
          : jobOrder
      )
    }))

    syncInstalledPartsWithInventory(jobId, beforeParts, afterParts)
  },

  addDiagnosticFile: (jobId, file) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            diagnosticFiles: [...(jobOrder.diagnosticFiles || []), file],
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  deleteDiagnosticFile: (jobId, fileId) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            diagnosticFiles: (jobOrder.diagnosticFiles || []).filter(f => f.id !== fileId),
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  addImageToJob: (jobId, image) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            attachedImages: [...jobOrder.attachedImages, image],
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  deleteImageFromJob: (jobId, imageId) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            attachedImages: jobOrder.attachedImages.filter(image => image.id !== imageId),
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  addLinkedEstimate: (jobId, estimateId) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            linkedEstimateIds: [...(jobOrder.linkedEstimateIds || []), estimateId],
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  removeLinkedEstimate: (jobId, estimateId) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            linkedEstimateIds: (jobOrder.linkedEstimateIds || []).filter(id => id !== estimateId),
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  addEstimateAttachment: (jobId, file) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            estimateAttachments: [...(jobOrder.estimateAttachments || []), file],
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  deleteEstimateAttachment: (jobId, fileId) => set((state) => ({
    jobOrders: state.jobOrders.map(jobOrder =>
      jobOrder.id === jobId
        ? {
            ...jobOrder,
            estimateAttachments: (jobOrder.estimateAttachments || []).filter(f => f.id !== fileId),
            updatedAt: new Date().toISOString()
          }
        : jobOrder
    )
  })),

  getVisibleJobOrders: () => {
    const { jobOrders, deletionMeta } = get()
    const active = jobOrders.filter(j => !deletionMeta[j.id]?.deletedAt)
    const currentUser = useAuthStore.getState().currentUser
    if (!currentUser) return active
    if (currentUser.role !== 'mechanic') return active
    if (!currentUser.mechanicId) return []
    return active.filter(j => j.assignedMechanic === currentUser.mechanicId)
  },

  getFilteredJobOrders: () => {
    const { searchTerm } = get()
    const active = get().getVisibleJobOrders()
    if (!searchTerm) return active

    const term = searchTerm.toLowerCase()
    return active.filter(jobOrder =>
      jobOrder.jobNumber.toLowerCase().includes(term) ||
      jobOrder.customerName.toLowerCase().includes(term) ||
      jobOrder.description.toLowerCase().includes(term) ||
      jobOrder.vehicleInfo.make.toLowerCase().includes(term) ||
      jobOrder.vehicleInfo.model.toLowerCase().includes(term) ||
      jobOrder.assignedMechanic.toLowerCase().includes(term) ||
      jobOrder.status.toLowerCase().includes(term)
    )
  },

  getJobOrderById: (id) => {
    const { jobOrders } = get()
    return jobOrders.find(jobOrder => jobOrder.id === id)
  },

  getMechanicById: (id) => {
    const { mechanics } = get()
    return mechanics.find(mechanic => mechanic.id === id)
  },
  
  // Initialize store with mock data if no persisted data exists
  initializeStore: () => {
    const mechanicStore = useMechanicStore.getState()
    if (mechanicStore && typeof mechanicStore.fetchMechanics === 'function') {
      mechanicStore.fetchMechanics()
    }

    const { jobOrders } = get()
    console.log('Initializing job order store, current job orders:', jobOrders.length)
    
    set({ isPersisted: true })
  }
}),
    {
      name: 'job-order-storage',
      storage: createJSONStorage(() => createServerStateStorage()),
      partialize: (state) => ({
        jobOrders: state.jobOrders.map(jobOrder => ({
          ...jobOrder,
          attachedImages: (jobOrder.attachedImages || []).filter(image => typeof image.url === 'string' && !image.url.startsWith('blob:'))
        })),
        searchTerm: state.searchTerm,
        selectedJobOrder: state.selectedJobOrder,
        deletionMeta: state.deletionMeta
      }),
      onRehydrateStorage: () => (state) => {
        if (!state || !Array.isArray((state as any).jobOrders)) return
        ;(state as any).jobOrders = (state as any).jobOrders.map((jobOrder: any) => ({
          ...jobOrder,
          attachedImages: (jobOrder.attachedImages || []).filter((image: any) => typeof image.url === 'string' && !image.url.startsWith('blob:'))
        }))
      }
    }
  )
)
