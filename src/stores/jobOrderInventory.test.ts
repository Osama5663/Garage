import { describe, it, expect, beforeEach } from 'vitest'
import { useInventoryStore } from './inventoryStore'
import { useJobOrderStore } from './jobOrderStore'
import { InventoryFormData } from '../types/inventory'
import { JobOrder, JobPart } from '../types/jobOrder'

describe('Job order and inventory integration', () => {
  beforeEach(() => {
    const inventoryInitial = {
      inventoryItems: [],
      suppliers: [],
      purchaseOrders: [],
      stockMovements: [],
      stockAlerts: [],
      locations: [],
      stockTransfers: [],
      audits: [],
      returnOrders: [],
      supplierInvoices: [],
      filters: {
        searchTerm: '',
        stockLevel: 'all',
        status: ['active', 'low_stock', 'out_of_stock'],
        category: [],
        supplier: [],
        location: []
      },
      sort: {
        field: 'name',
        direction: 'asc'
      },
      searchTerm: '',
      isLoading: false,
      error: null,
      hydrated: false
    }

    useInventoryStore.setState(inventoryInitial as any)

    const jobOrderInitial = {
      jobOrders: [],
      mechanics: [],
      searchTerm: '',
      selectedJobOrder: null,
      isLoading: false,
      isPersisted: false,
      deletionMeta: {}
    }

    useJobOrderStore.setState(jobOrderInitial as any)
  })

  it('syncs installed job parts with inventory on add, update, and delete', async () => {
    const inventoryStore = useInventoryStore.getState()

    const inventoryItemData: InventoryFormData = {
      sku: 'BRK-001',
      name: 'Brake Pads - Front',
      description: 'Premium brake pads',
      category: 'brakes',
      quantity: 10,
      unit: 'set',
      minimumStock: 1,
      maximumStock: 100,
      reorderPoint: 2,
      supplierId: 'sup_1',
      unitCost: 20,
      sellingPrice: 40,
      taxRate: 0.2,
      location: 'A1',
      barcode: '123',
      manufacturer: 'BrakeCo',
      manufacturerWarrantyMonths: 12,
      leadTimeDays: 7,
      isTaxable: true,
      isTrackable: true
    }

    const inventoryItem = await inventoryStore.addInventoryItem(inventoryItemData)
    const initialQuantity = inventoryItem.quantity

    const jobStore = useJobOrderStore.getState()

    const part: JobPart = {
      id: 'part_1',
      partNumber: 'BRK-001',
      name: 'Brake Pads - Front',
      description: 'Premium brake pads',
      quantity: 2,
      unitCost: 20,
      totalCost: 40,
      supplier: 'sup_1',
      status: 'installed',
      orderedDate: new Date().toISOString(),
      receivedDate: new Date().toISOString()
    }

    const job: JobOrder = {
      id: 'job_test_1',
      jobNumber: 'OR-TEST-001',
      customerId: 'cust_1',
      vehicleId: 'veh_1',
      customerName: 'Test Customer',
      vehicleInfo: {
        make: 'Test',
        model: 'Car',
        year: 2024,
        vin: 'VINTEST',
        registration: 'TEST-001'
      },
      description: 'Test job',
      jobDescriptions: [],
      priority: 'medium',
      status: 'pending',
      assignedMechanic: 'mech_1',
      estimatedHours: 1,
      actualHours: 0,
      startDate: new Date().toISOString().split('T')[0],
      deadline: new Date().toISOString().split('T')[0],
      completionDate: undefined,
      partsUsed: [part],
      laborItems: [],
      diagnosticFiles: [],
      attachedImages: [],
      estimatedCost: 40,
      finalCost: 0,
      invoiceId: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'tester',
      notes: '',
      approvedAt: undefined,
      approvedBy: undefined,
      approvalNotes: undefined,
      isApproved: false
    }

    jobStore.addJobOrder(job)

    let updatedInventoryItem = useInventoryStore
      .getState()
      .inventoryItems.find((i) => i.id === inventoryItem.id)

    expect(updatedInventoryItem?.quantity).toBe(initialQuantity - 2)

    jobStore.updateJobOrder(job.id, {
      partsUsed: [
        {
          ...part,
          quantity: 4
        }
      ]
    })

    updatedInventoryItem = useInventoryStore
      .getState()
      .inventoryItems.find((i) => i.id === inventoryItem.id)

    expect(updatedInventoryItem?.quantity).toBe(initialQuantity - 4)
    jobStore.deletePartFromJob(job.id, part.id)

    updatedInventoryItem = useInventoryStore
      .getState()
      .inventoryItems.find((i) => i.id === inventoryItem.id)

    expect(updatedInventoryItem?.quantity).toBe(initialQuantity)

    const movements = useInventoryStore.getState().stockMovements
    const jobMovements = movements.filter(
      (m) => m.referenceType === 'job_order' && m.referenceId === job.id
    )
    expect(jobMovements.length).toBeGreaterThan(0)
  })
})
