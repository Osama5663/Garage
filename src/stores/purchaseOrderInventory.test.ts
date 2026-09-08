import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useInventoryStore } from './inventoryStore'
import { InventoryFormData, PurchaseOrderFormData, SupplierFormData } from '../types/inventory'

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  }
}))

describe('Purchase order and inventory receipt integration', () => {
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
  })

  it('updates stock and movements when receiving a full purchase order', () => {
    const store = useInventoryStore.getState()

    const supplierData: SupplierFormData = {
      name: 'PO Supplier',
      contactPerson: 'Test Contact',
      email: 'supplier@example.com',
      phone: '0000000000',
      address: '123 Test Street',
      city: 'Test City',
      postcode: '00000',
      country: 'Test Country',
      paymentTerms: 'Net 30',
      currency: 'EUR',
      taxId: 'TAX-PO',
      minimumOrderValue: 0,
      website: 'https://example.com',
      deliveryTime: 5,
      minimumOrder: 1,
      status: 'active',
      notes: 'Test supplier'
    }

    store.addSupplier(supplierData)
    const supplierId = useInventoryStore.getState().suppliers[0].id

    const itemData: InventoryFormData = {
      sku: 'PO-ITEM-1',
      name: 'PO Test Item',
      description: 'Item received via purchase order',
      category: 'other',
      quantity: 0,
      unit: 'piece',
      minimumStock: 1,
      maximumStock: 100,
      reorderPoint: 2,
      supplierId: supplierId,
      unitCost: 10,
      sellingPrice: 15,
      taxRate: 0.2,
      location: 'R1',
      barcode: '999',
      manufacturer: 'SupplierCo',
      manufacturerWarrantyMonths: 0,
      leadTimeDays: 5,
      isTaxable: true,
      isTrackable: true
    }

    const inventoryItem = store.addInventoryItem(itemData)

    const poData: PurchaseOrderFormData = {
      supplierId: supplierId,
      items: [
        {
          inventoryItemId: inventoryItem.id,
          quantity: 5,
          unitCost: 10
        }
      ],
      expectedDeliveryDate: new Date().toISOString(),
      notes: 'Test PO'
    }

    store.createPurchaseOrder(poData)
    const createdPO = useInventoryStore
      .getState()
      .purchaseOrders[0]

    store.receivePurchaseOrder(createdPO.id, [
      {
        inventoryItemId: inventoryItem.id,
        quantity: 5
      }
    ])

    const updatedItem = useInventoryStore
      .getState()
      .inventoryItems.find(i => i.id === inventoryItem.id)

    expect(updatedItem?.quantity).toBe(5)

    const updatedPO = useInventoryStore
      .getState()
      .purchaseOrders.find(po => po.id === createdPO.id)

    expect(updatedPO?.items[0].quantityReceived).toBe(5)
    expect(updatedPO?.items[0].status).toBe('received')

    const movements = useInventoryStore.getState().stockMovements
    const poMovements = movements.filter(
      m => m.reference === createdPO.orderNumber && m.type === 'adjustment'
    )
    expect(poMovements.length).toBe(1)
    expect(poMovements[0].quantity).toBe(5)
  })

  it('handles partial receipts without over-receiving and logs movements correctly', () => {
    const store = useInventoryStore.getState()

    const supplierData: SupplierFormData = {
      name: 'PO Supplier Partial',
      contactPerson: 'Partial Contact',
      email: 'supplier-partial@example.com',
      phone: '1111111111',
      address: '456 Partial Street',
      city: 'Partial City',
      postcode: '11111',
      country: 'Partial Country',
      paymentTerms: 'Net 30',
      currency: 'EUR',
      taxId: 'TAX-PO-PART',
      minimumOrderValue: 0,
      website: 'https://example.com',
      deliveryTime: 5,
      minimumOrder: 1,
      status: 'active',
      notes: 'Test supplier partial'
    }

    store.addSupplier(supplierData)
    const supplierId = useInventoryStore.getState().suppliers[0].id

    const itemData: InventoryFormData = {
      sku: 'PO-ITEM-2',
      name: 'PO Partial Item',
      description: 'Item received partially via purchase order',
      category: 'other',
      quantity: 0,
      unit: 'piece',
      minimumStock: 1,
      maximumStock: 100,
      reorderPoint: 2,
      supplierId: supplierId,
      unitCost: 20,
      sellingPrice: 30,
      taxRate: 0.2,
      location: 'R2',
      barcode: '998',
      manufacturer: 'SupplierCo',
      manufacturerWarrantyMonths: 0,
      leadTimeDays: 5,
      isTaxable: true,
      isTrackable: true
    }

    const inventoryItem = store.addInventoryItem(itemData)

    const poData: PurchaseOrderFormData = {
      supplierId: supplierId,
      items: [
        {
          inventoryItemId: inventoryItem.id,
          quantity: 10,
          unitCost: 20
        }
      ],
      expectedDeliveryDate: new Date().toISOString(),
      notes: 'Test PO partial'
    }

    store.createPurchaseOrder(poData)
    const createdPO = useInventoryStore
      .getState()
      .purchaseOrders[0]

    store.receivePurchaseOrder(createdPO.id, [
      {
        inventoryItemId: inventoryItem.id,
        quantity: 4
      }
    ])

    let updatedItem = useInventoryStore
      .getState()
      .inventoryItems.find(i => i.id === inventoryItem.id)
    let updatedPO = useInventoryStore
      .getState()
      .purchaseOrders.find(po => po.id === createdPO.id)

    expect(updatedItem?.quantity).toBe(4)
    expect(updatedPO?.items[0].quantityReceived).toBe(4)
    expect(updatedPO?.items[0].status).toBe('partially_received')

    store.receivePurchaseOrder(createdPO.id, [
      {
        inventoryItemId: inventoryItem.id,
        quantity: 6
      }
    ])

    updatedItem = useInventoryStore
      .getState()
      .inventoryItems.find(i => i.id === inventoryItem.id)
    updatedPO = useInventoryStore
      .getState()
      .purchaseOrders.find(po => po.id === createdPO.id)

    expect(updatedItem?.quantity).toBe(10)
    expect(updatedPO?.items[0].quantityReceived).toBe(10)
    expect(updatedPO?.items[0].status).toBe('received')

    const movements = useInventoryStore.getState().stockMovements
    const poMovements = movements.filter(
      m => m.reference === createdPO.orderNumber
    )
    const totalReceived = poMovements.reduce(
      (sum, m) => sum + m.quantity,
      0
    )
    expect(totalReceived).toBe(10)
  })

  it('does not create stock movements when receiving unknown purchase order', () => {
    const before = useInventoryStore.getState().stockMovements.length

    useInventoryStore
      .getState()
      .receivePurchaseOrder('non-existent-po', [
        {
          inventoryItemId: 'inv_missing',
          quantity: 5
        }
      ])

    const after = useInventoryStore.getState().stockMovements.length
    expect(after).toBe(before)
  })

  it('prevents deleting supplier with open purchase orders and preserves data', () => {
    const store = useInventoryStore.getState()

    const supplierData: SupplierFormData = {
      name: 'Protected Supplier',
      contactPerson: 'Protected Contact',
      email: 'protected@example.com',
      phone: '2222222222',
      address: '789 Protected Street',
      city: 'Protected City',
      postcode: '22222',
      country: 'Protected Country',
      paymentTerms: 'Net 30',
      currency: 'EUR',
      taxId: 'TAX-PROT',
      minimumOrderValue: 0,
      website: 'https://example.com',
      deliveryTime: 5,
      minimumOrder: 1,
      status: 'active',
      notes: 'Protected supplier'
    }

    store.addSupplier(supplierData)
    const supplierId = useInventoryStore.getState().suppliers[0].id

    const itemData: InventoryFormData = {
      sku: 'PO-ITEM-3',
      name: 'Linked Item',
      description: 'Item linked to protected supplier',
      category: 'other',
      quantity: 0,
      unit: 'piece',
      minimumStock: 1,
      maximumStock: 100,
      reorderPoint: 2,
      supplierId,
      unitCost: 10,
      sellingPrice: 15,
      taxRate: 0.2,
      location: 'R3',
      barcode: '997',
      manufacturer: 'SupplierCo',
      manufacturerWarrantyMonths: 0,
      leadTimeDays: 5,
      isTaxable: true,
      isTrackable: true
    }

    const inventoryItem = store.addInventoryItem(itemData)

    const poData: PurchaseOrderFormData = {
      supplierId,
      items: [
        {
          inventoryItemId: inventoryItem.id,
          quantity: 3,
          unitCost: 10
        }
      ],
      expectedDeliveryDate: new Date().toISOString(),
      notes: 'Protected supplier PO'
    }

    store.createPurchaseOrder(poData)

    store.deleteSupplier(supplierId)

    const state = useInventoryStore.getState()
    expect(state.suppliers.find(s => s.id === supplierId)).toBeDefined()
    expect(state.error).toBe('Cannot delete supplier with open purchase orders.')
  })

  it('deletes supplier without related documents', () => {
    const store = useInventoryStore.getState()

    const supplierData: SupplierFormData = {
      name: 'Disposable Supplier',
      contactPerson: 'Disposable Contact',
      email: 'disposable@example.com',
      phone: '3333333333',
      address: '101 Disposable Street',
      city: 'Disposable City',
      postcode: '33333',
      country: 'Disposable Country',
      paymentTerms: 'Net 30',
      currency: 'EUR',
      taxId: 'TAX-DISP',
      minimumOrderValue: 0,
      website: 'https://example.com',
      deliveryTime: 5,
      minimumOrder: 1,
      status: 'active',
      notes: 'Disposable supplier'
    }

    store.addSupplier(supplierData)
    const supplierId = useInventoryStore.getState().suppliers[0].id

    store.deleteSupplier(supplierId)

    const state = useInventoryStore.getState()
    expect(state.suppliers.find(s => s.id === supplierId)).toBeUndefined()
  })
})
