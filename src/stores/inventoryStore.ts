import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { inventoryApi } from '../services/inventoryApi';
import { supplierApi } from '../services/supplierApi';
import { supplierInvoiceApi } from '../services/supplierInvoiceApi';
import { deliveryNoteApi } from '../services/deliveryNoteApi'
import { 
  InventoryItem, 
  Supplier, 
  PurchaseOrder, 
  StockMovement, 
  StockAlert, 
  InventoryFormData, 
  SupplierFormData, 
  PurchaseOrderFormData,
  BarcodeScanData,
  InventoryReport,
  InventoryLocation,
  StockOperationFormData,
  StockTransferFormData,
  StockTransfer,
  InventoryAudit,
  InventoryStats,
  InventoryFilter,
  PurchaseOrderItem,
  InventorySort,
  ReturnOrder,
  ReturnOrderFormData,
  SupplierInvoice,
  SupplierInvoiceFormData,
  ReturnOrderItem,
  InvoicePayment
} from '../types/inventory'
import { useAuthStore } from './authStore'
 
const TAX_RATE = 0.20

const mapApiSupplierToStore = (apiSupplier: any): Supplier => {
  const nowIso = new Date().toISOString()
  const id = apiSupplier.id || apiSupplier._id || `sup_${Date.now()}`

  return {
    id,
    name: apiSupplier.name || '',
    contactPerson: apiSupplier.contactPerson || apiSupplier.contact_person || '',
    email: apiSupplier.email || '',
    phone: apiSupplier.phone || '',
    address: apiSupplier.address || '',
    city: apiSupplier.city || '',
    postcode: apiSupplier.postcode || apiSupplier.zipCode || '',
    country: apiSupplier.country || '',
    paymentTerms: apiSupplier.paymentTerms || apiSupplier.payment_terms || '',
    currency: apiSupplier.currency,
    taxId: apiSupplier.taxId,
    rating: typeof apiSupplier.rating === 'number' ? apiSupplier.rating : 0,
    reliability: typeof apiSupplier.reliability === 'number' ? apiSupplier.reliability : 0,
    averageLeadTime:
      typeof apiSupplier.averageLeadTime === 'number'
        ? apiSupplier.averageLeadTime
        : apiSupplier.deliveryTime ?? 0,
    minimumOrderValue:
      typeof apiSupplier.minimumOrderValue === 'number'
        ? apiSupplier.minimumOrderValue
        : apiSupplier.minimumOrderValue ?? 0,
    status: apiSupplier.status,
    isActive: apiSupplier.isActive ?? true,
    isPreferred: apiSupplier.isPreferred ?? false,
    website: apiSupplier.website,
    deliveryTime: apiSupplier.deliveryTime ?? 0,
    minimumOrder: apiSupplier.minimumOrder ?? 0,
    notes: apiSupplier.notes,
    createdAt: apiSupplier.createdAt || apiSupplier.created_at || nowIso,
    updatedAt: apiSupplier.updatedAt || apiSupplier.updated_at || nowIso,
    createdBy: apiSupplier.createdBy || apiSupplier.created_by || 'system'
  }
}

interface InventoryState {
  // Core data
  inventoryItems: InventoryItem[]
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  stockMovements: StockMovement[]
  stockAlerts: StockAlert[]
  locations: InventoryLocation[]
  stockTransfers: StockTransfer[]
  audits: InventoryAudit[]
  returnOrders: ReturnOrder[]
  supplierInvoices: SupplierInvoice[]
  
  // UI State
  filters: InventoryFilter
  sort: InventorySort
  searchTerm: string
  isLoading: boolean
  error: string | null
  hydrated: boolean
  
  // Configuration types
  config: {
    autoCreateDefaults: {
      category: string
      unit: string
      markupPercentage: number
      taxRate: number
      minimumStock: number
      maximumStock: number
      reorderPoint: number
      location: string
    }
  }
  
  // Actions
  updateConfig: (updates: Partial<InventoryState['config']>) => void
  addInventoryItem: (itemData: InventoryFormData) => Promise<InventoryItem>
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>
  deleteInventoryItem: (id: string) => Promise<boolean>
  adjustStock: (itemId: string, quantity: number, reason?: string, referenceId?: string) => Promise<void>
  receiveStock: (itemId: string, quantity: number, cost: number, referenceId: string, batchNumber?: string, expiryDate?: string) => Promise<void>
  issueStock: (itemId: string, quantity: number, reason: string, referenceId: string, requestedBy: string) => Promise<void>
  transferStock: (transferData: StockTransferFormData) => Promise<void>
  
  // Supplier management
  addSupplier: (supplierData: SupplierFormData) => Promise<Supplier>
  updateSupplier: (id: string, updates: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
  
  // Purchase order management
  createPurchaseOrder: (orderData: PurchaseOrderFormData) => void
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void
  deletePurchaseOrder: (id: string) => void
  receivePurchaseOrder: (orderId: string, receivedItems: { inventoryItemId: string; quantity: number; batchNumber?: string; expiryDate?: string }[]) => void
  
  // Return order management
  createReturnOrder: (returnData: ReturnOrderFormData) => ReturnOrder
  updateReturnOrder: (id: string, updates: Partial<ReturnOrder>) => void
  deleteReturnOrder: (id: string) => void
  processReturnOrder: (id: string, processedBy: string) => void
  
  // Supplier invoice management
  fetchSupplierInvoices: () => Promise<void>;
  createSupplierInvoice: (invoiceData: SupplierInvoiceFormData) => Promise<SupplierInvoice>;
  updateSupplierInvoice: (id: string, updates: Partial<SupplierInvoice>) => Promise<void>;
  deleteSupplierInvoice: (id: string) => Promise<void>;
  recordInvoicePayment: (invoiceId: string, payment: { amount: number; paymentDate: string; paymentMethod: string; reference?: string }) => void
  
  // Stock transfer management
  addStockTransfer: (transferData: StockTransferFormData) => StockTransfer
  updateStockTransfer: (id: string, updates: Partial<StockTransfer>) => void
  deleteStockTransfer: (id: string) => void
  
  // Audit management
  createAudit: (auditData: { title: string; type: 'full' | 'cycle' | 'spot' | 'category' | 'location'; scope?: { categories?: string[]; locations?: string[]; items?: string[] } }) => void
  updateAudit: (id: string, updates: Partial<InventoryAudit>) => void
  deleteAudit: (id: string) => void
  
  // Utility functions
  setFilters: (filters: Partial<InventoryFilter>) => void
  clearFilters: () => void
  fetchSuppliers: () => Promise<void>
  fetchInventoryItems: () => Promise<void>
  setSort: (sort: InventorySort) => void
  setSearchTerm: (term: string) => void
  clearSearch: () => void
  
  // Getters and queries
  getFilteredItems: () => InventoryItem[]
  getInventoryStats: () => InventoryStats
  getInventoryReport: (startDate: string, endDate: string) => InventoryReport
  getStockHistory: (itemId: string, startDate?: string, endDate?: string) => StockMovement[]
  getLowStockItems: () => InventoryItem[]
  getOutOfStockItems: () => InventoryItem[]
  getOverstockItems: () => InventoryItem[]
  getItemsByCategory: (category: string) => InventoryItem[]
  getItemsBySupplier: (supplierId: string) => InventoryItem[]
  getItemsByLocation: (location: string) => InventoryItem[]
  getSupplierById: (id: string) => Supplier | undefined
  getPurchaseOrderById: (id: string) => PurchaseOrder | undefined
  getLocationById: (id: string) => InventoryLocation | undefined
  getReturnOrderById: (id: string) => ReturnOrder | undefined
  getSupplierInvoiceById: (id: string) => SupplierInvoice | undefined
  getFilteredReturnOrders: (filters?: { supplierId?: string; status?: string; dateRange?: { start: string; end: string } }) => ReturnOrder[]
  getFilteredSupplierInvoices: (filters?: { supplierId?: string; status?: string; paymentStatus?: string; dateRange?: { start: string; end: string } }) => SupplierInvoice[]
  
  // Barcode and scanning
  lookupBarcode: (barcode: string) => InventoryItem | undefined
  recordBarcodeScan: (scanData: BarcodeScanData) => void
  
  // Stock alerts
  checkStockAlerts: (itemId?: string) => void
  dismissStockAlert: (alertId: string) => void
  removeSupplier: (id: string) => void
  
  // Stock operations
  performStockOperation: (operationData: StockOperationFormData) => Promise<void>
  logStockMovement: (inventoryItemId: string, quantityChange: number, oldQuantity: number, type: string, reason: string, referenceId?: string, batchNumber?: string, expiryDate?: string, requestedBy?: string) => void
  
  // Audit functions
  getAuditHistory: (itemId: string) => InventoryAudit[]
  updateAuditStatus: (id: string, status: 'planned' | 'in_progress' | 'completed' | 'cancelled') => void
  
  // Utility functions
  getItemHistory: (itemId: string) => StockMovement[]
  getFilteredAndSortedItems: () => InventoryItem[]
  getWhereUsed: (itemId: string) => StockMovement[]
  lookupByBarcode: (barcode: string) => InventoryItem | undefined
  dismissAlert: (alertId: string) => void
  resolveAlert: (alertId: string) => void
}

// Data validation helpers for inventory persistence
const validateInventoryData = (data: any): Partial<InventoryState> => {
  const validated: Partial<InventoryState> = {}
  
  if (Array.isArray(data.inventoryItems)) {
    validated.inventoryItems = data.inventoryItems
      .map((item: any) => {
        if (!item) return null
        const id = item.id ?? item._id
        return id ? { ...item, id } : item
      })
      .filter((item: any) => {
        return item && item.id && item.name && typeof item.quantity === 'number'
      })
  }
  
  if (Array.isArray(data.suppliers)) {
    validated.suppliers = data.suppliers.filter((supplier: any) => {
      return supplier && supplier.id && supplier.name
    })
  }
  
  if (Array.isArray(data.purchaseOrders)) {
    validated.purchaseOrders = data.purchaseOrders.filter((order: any) => {
      return order && order.id && order.supplierId
    })
  }
  
  if (Array.isArray(data.stockMovements)) {
    validated.stockMovements = data.stockMovements.filter((movement: any) => {
      return movement && movement.id && movement.inventoryItemId
    })
  }
  
  if (Array.isArray(data.stockAlerts)) {
    validated.stockAlerts = data.stockAlerts.filter((alert: any) => {
      return alert && alert.id && alert.inventoryItemId
    })
  }
  
  if (Array.isArray(data.locations)) {
    validated.locations = data.locations.filter((location: any) => {
      return location && location.id && location.name
    })
  }
  
  if (Array.isArray(data.stockTransfers)) {
    validated.stockTransfers = data.stockTransfers.filter((transfer: any) => {
      return transfer && transfer.id && transfer.fromLocationId && transfer.toLocationId
    })
  }
  
  if (Array.isArray(data.audits)) {
    validated.audits = data.audits.filter((audit: any) => {
      return audit && audit.id && audit.auditDate
    })
  }
  
  if (Array.isArray(data.returnOrders)) {
    validated.returnOrders = data.returnOrders.filter((returnOrder: any) => {
      return returnOrder && returnOrder.id && returnOrder.supplierId
    })
  }
  
  if (Array.isArray(data.supplierInvoices)) {
    validated.supplierInvoices = data.supplierInvoices.filter((invoice: any) => {
      return invoice && invoice.id && invoice.supplierId
    })
  }
  
  return validated
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      // Initial state
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
      
      // UI State
      filters: {
        searchTerm: '',
        stockLevel: 'all',
        status: ['active', 'low_stock', 'out_of_stock'], // Show all items by default
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
      hydrated: false,

      // Default configuration
      config: {
        autoCreateDefaults: {
          category: 'other',
          unit: 'piece',
          markupPercentage: 30,
          taxRate: 20,
          minimumStock: 0,
          maximumStock: 100,
          reorderPoint: 0,
          location: 'main-warehouse'
        }
      },

      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates }
        }))
      },

      fetchSuppliers: async () => {
        try {
          const apiSuppliers = await supplierApi.list()
          const suppliers = Array.isArray(apiSuppliers)
            ? apiSuppliers.map((s) => mapApiSupplierToStore(s))
            : []
          set({ suppliers })
        } catch (error: any) {
          const message =
            error?.response?.data?.error ||
            error?.message ||
            'Failed to fetch suppliers'
          console.error(`Failed to fetch suppliers: ${message}`)
        }
      },

      fetchInventoryItems: async () => {
        set({ isLoading: true, error: null })
        try {
          const items = await inventoryApi.list()
          set({ inventoryItems: items, isLoading: false })
        } catch (error: any) {
          const message =
            error?.response?.data?.error ||
            error?.message ||
            'Failed to fetch inventory items'
          set({ error: message, isLoading: false })
          console.error(`Failed to fetch inventory items: ${message}`)
        }
      },

      // Inventory Item CRUD Operations
      addInventoryItem: async (itemData) => {
        console.log('=== ADD INVENTORY ITEM DEBUG START ===')
        console.log('Input itemData:', itemData)
        
        set({ isLoading: true, error: null })
        try {
          // Call API to create item in database
          const newItem = await inventoryApi.create(itemData)
          
          const { inventoryItems: currentItems } = get()
          set({ 
            inventoryItems: [...currentItems, newItem],
            isLoading: false 
          })
          
          console.log('Successfully added item:', newItem)
          return newItem
        } catch (error: any) {
          const message =
            error?.response?.data?.error ||
            error?.message ||
            'Failed to add inventory item'
          set({ error: message, isLoading: false })
          console.error('Failed to add inventory item:', message, error)
          throw error
        }
      },

      updateInventoryItem: async (id, updates) => {
        set({ isLoading: true, error: null })
        try {
          const updatedItem = await inventoryApi.update(id, updates)
          
          set((state) => ({
            inventoryItems: state.inventoryItems.map((item) =>
              item.id === id ? updatedItem : item
            ),
            isLoading: false
          }))

          // Log stock movement if quantity changed
          const oldItem = get().inventoryItems.find(item => item.id === id)
          if (oldItem && updates.quantity !== undefined && updates.quantity !== oldItem.quantity) {
            const diff = updates.quantity - oldItem.quantity
            get().logStockMovement(
              id,
              diff,
              oldItem.quantity,
              diff > 0 ? 'adjustment-in' : 'adjustment-out',
              'Manual stock adjustment'
            )
          }

          // Check for stock alerts
          get().checkStockAlerts(id)
        } catch (error: any) {
          set({ error: error.message || 'Failed to update inventory item', isLoading: false })
          console.error('Failed to update inventory item:', error)
          throw error
        }
      },

      deleteInventoryItem: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const { inventoryItems } = get()
          const item = inventoryItems.find(i => i.id === id)
          
          if (item && item.quantity > 0) {
            set({ error: 'Cannot delete item with existing stock. Please adjust stock to zero first.', isLoading: false })
            return false
          }

          await inventoryApi.delete(id)
          set((state) => ({
            inventoryItems: state.inventoryItems.filter((i) => i.id !== id),
            stockAlerts: state.stockAlerts.filter(alert => alert.inventoryItemId !== id),
            isLoading: false
          }))
          return true
        } catch (error: any) {
          set({ error: error.message || 'Failed to delete inventory item', isLoading: false })
          console.error('Failed to delete inventory item:', error)
          return false
        }
      },

      adjustStock: async (itemId, quantity, reason = 'Manual adjustment', referenceId) => {
        const { inventoryItems } = get()
        const item = inventoryItems.find(item => item.id === itemId)
        
        if (!item) {
          console.error('Inventory item not found:', itemId)
          return
        }

        const newQuantity = Math.max(0, quantity)
        const oldQuantity = item.quantity
        
        if (newQuantity === oldQuantity) {
          return
        }

        const updatedItemData: Partial<InventoryItem> = {
          quantity: newQuantity,
          status: newQuantity === 0 ? 'out_of_stock' : 
                      newQuantity <= item.minimumStock ? 'low_stock' : 'active',
          updatedAt: new Date().toISOString()
        }

        try {
          const updatedItem = await inventoryApi.update(itemId, updatedItemData)
          
          set((state) => ({
            inventoryItems: state.inventoryItems.map(item =>
              item.id === itemId ? updatedItem : item
            )
          }))

          // Log the stock movement
          get().logStockMovement(itemId, newQuantity - oldQuantity, oldQuantity, 'adjustment', reason, referenceId)
          
          // Check for stock alerts
          get().checkStockAlerts(itemId)
        } catch (error) {
          console.error('Failed to adjust stock:', error)
          throw error
        }
      },

      receiveStock: async (itemId, quantity, cost, referenceId, batchNumber, expiryDate) => {
        const { inventoryItems } = get()
        const item = inventoryItems.find(item => item.id === itemId)
        
        if (!item) {
          console.error('Inventory item not found:', itemId)
          return
        }

        const oldQuantity = item.quantity
        const newQuantity = oldQuantity + quantity
        const newUnitCost = cost || item.unitCost

        const updatedItemData: Partial<InventoryItem> = {
          quantity: newQuantity,
          unitCost: newUnitCost,
          status: newQuantity === 0 ? 'out_of_stock' : 
                      newQuantity <= item.minimumStock ? 'low_stock' : 'active',
          lastRestocked: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        try {
          const updatedItem = await inventoryApi.update(itemId, updatedItemData)

          set((state) => ({
            inventoryItems: state.inventoryItems.map(item =>
              item.id === itemId ? updatedItem : item
            )
          }))

          // Log the stock movement
          get().logStockMovement(itemId, quantity, oldQuantity, 'receive', `Stock received - Reference: ${referenceId}`, referenceId, batchNumber, expiryDate)
          
          // Check for stock alerts
          get().checkStockAlerts(itemId)
        } catch (error) {
          console.error('Failed to receive stock:', error)
          throw error
        }
      },

      issueStock: async (itemId, quantity, reason, referenceId, requestedBy) => {
        const { inventoryItems } = get()
        const item = inventoryItems.find(item => item.id === itemId)
        
        if (!item) {
          console.error('Inventory item not found:', itemId)
          set({ error: `Inventory item not found: ${itemId}` })
          return
        }

        if (item.quantity < quantity) {
          console.error('Insufficient stock:', itemId)
          set({ error: `Insufficient stock for item ${item.sku}` })
          return
        }

        const oldQuantity = item.quantity
        const newQuantity = oldQuantity - quantity

        const updatedItemData: Partial<InventoryItem> = {
          quantity: newQuantity,
          status: newQuantity === 0 ? 'out_of_stock' : 
                      newQuantity <= item.minimumStock ? 'low_stock' : 'active',
          updatedAt: new Date().toISOString()
        }

        try {
          const updatedItem = await inventoryApi.update(itemId, updatedItemData)

          set((state) => ({
            inventoryItems: state.inventoryItems.map(item =>
              item.id === itemId ? updatedItem : item
            )
          }))

          // Log the stock movement
          get().logStockMovement(itemId, -quantity, oldQuantity, 'issue', reason, referenceId, undefined, undefined, requestedBy)
          
          // Check for stock alerts
          get().checkStockAlerts(itemId)
        } catch (error) {
          console.error('Failed to issue stock:', error)
          throw error
        }
      },

      transferStock: async (transferData) => {
        const { inventoryItems, locations, adjustStock, logStockMovement, checkStockAlerts } = get()
        
        if (!transferData.items || transferData.items.length === 0) {
          console.error('No items specified for transfer')
          return
        }

        const fromLocation = locations.find(loc => loc.id === transferData.fromLocation)
        const toLocation = locations.find(loc => loc.id === transferData.toLocation)
        
        if (!fromLocation || !toLocation) {
          console.error('Invalid source or destination location')
          set({ error: 'Invalid source or destination location' })
          return
        }

        for (const transferItem of transferData.items) {
          const item = inventoryItems.find(inv => inv.id === transferItem.inventoryItemId)
          
          if (!item) {
            console.error('Inventory item not found:', transferItem.inventoryItemId)
            continue
          }

          if (item.quantity < transferItem.quantity) {
            console.error('Insufficient stock for transfer:', transferItem.inventoryItemId)
            set({ error: `Insufficient stock for item ${item.sku} at source location` })
            continue
          }

          try {
            // 1. Decrease stock at source
            const sourceOldQuantity = item.quantity
            const sourceNewQuantity = sourceOldQuantity - transferItem.quantity
            
            const updatedSourceItem = await inventoryApi.update(item.id, {
              quantity: sourceNewQuantity,
              status: sourceNewQuantity === 0 ? 'out_of_stock' : 
                      sourceNewQuantity <= item.minimumStock ? 'low_stock' : 'active',
              updatedAt: new Date().toISOString()
            })

            set((state) => ({
              inventoryItems: state.inventoryItems.map(inv =>
                inv.id === item.id ? updatedSourceItem : inv
              )
            }))

            // 2. Increase stock at destination
            // Check if item exists at destination (matching by SKU or Name)
            const destinationItem = inventoryItems.find(inv => 
              (inv.sku === item.sku || inv.name === item.name) && inv.location === transferData.toLocation
            )
            
            if (destinationItem) {
              await adjustStock(
                destinationItem.id, 
                destinationItem.quantity + transferItem.quantity, 
                `Transferred from ${fromLocation.name}`,
                transferData.referenceNumber
              )
            } else {
              // Create new item for destination location
              const newDestinationItemData: InventoryFormData = {
                sku: `${item.sku}-${transferData.toLocation}`,
                name: item.name,
                description: item.description,
                category: item.category,
                quantity: transferItem.quantity,
                unit: item.unit,
                minimumStock: item.minimumStock,
                maximumStock: item.maximumStock,
                reorderPoint: item.reorderPoint,
                location: transferData.toLocation,
                supplierId: item.supplierId,
                unitCost: item.unitCost,
                sellingPrice: item.sellingPrice,
                taxRate: item.taxRate,
                isTaxable: item.isTaxable,
                isTrackable: item.isTrackable
              }
              
              const newItem = await inventoryApi.create(newDestinationItemData)
              
              set((state) => ({
                inventoryItems: [...state.inventoryItems, newItem]
              }))
              
              logStockMovement(
                newItem.id, 
                transferItem.quantity, 
                0, 
                'transfer', 
                `Initial stock from transfer from ${fromLocation.name}`,
                transferData.referenceNumber
              )
            }

            // Log the stock movement for the source item
            logStockMovement(
              item.id, 
              -transferItem.quantity, 
              sourceOldQuantity, 
              'transfer', 
              transferData.reason || `Transfer to ${toLocation.name}`, 
              transferData.referenceNumber
            )
            
            // Check for stock alerts
            checkStockAlerts(item.id)
            if (destinationItem) checkStockAlerts(destinationItem.id)
            
          } catch (error) {
            console.error('Failed to transfer item:', item.sku, error)
            set({ error: `Failed to transfer item ${item.sku}` })
          }
        }
        
        // Refresh inventory to ensure everything is in sync
        await get().fetchInventoryItems()
      },

      logStockMovement: (inventoryItemId, quantityChange, oldQuantity, type, reason, referenceId, batchNumber) => {
        const { inventoryItems } = get()
        const item = inventoryItems.find(item => item.id === inventoryItemId)
        const receiveReferenceType =
          referenceId && referenceId.toString().startsWith('PO-')
            ? 'purchase_order'
            : 'adjustment'
        const referenceType =
          type === 'receive'
            ? receiveReferenceType
            : type === 'issue'
            ? 'job_order'
            : 'adjustment'
        
        const movement: StockMovement = {
          id: `mov_${Date.now()}`,
          inventoryItemId,
          itemName: item?.name || 'Unknown Item',
          sku: item?.sku || 'Unknown SKU',
          type: type as any,
          quantity: quantityChange,
          previousQuantity: oldQuantity,
          newQuantity: oldQuantity + quantityChange,
          referenceId,
          reference: referenceId,
          referenceType,
          jobOrderId: referenceType === 'job_order' ? referenceId : undefined,
          reason,
          movementDate: new Date().toISOString(),
          batchNumber,
          // expiryDate removed - not in StockMovement interface
          // requestedBy removed - not in StockMovement interface
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          status: 'completed',
          isApproved: true
        }

        set((state) => ({
          stockMovements: [...state.stockMovements, movement]
        }))
      },

      // Supplier management
      addSupplier: async (supplierData) => {
        const authState = useAuthStore.getState()
        const userId = authState.currentUser?.id || 'current-user'
        const tempId = `sup_${Date.now()}`

        const newSupplier: Supplier = {
          id: tempId,
          ...supplierData,
          isActive: true,
          rating: 0,
          reliability: 0,
          averageLeadTime: supplierData.deliveryTime || 0,
          minimumOrderValue: supplierData.minimumOrderValue || 0,
          isPreferred: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: userId
        }

        set((state) => ({
          suppliers: [...state.suppliers, newSupplier],
          error: null
        }))

        try {
          const created = await supplierApi.create(supplierData)

          if (!created) {
            const message = 'Failed to persist supplier'
            set((state) => ({
              suppliers: state.suppliers.filter((s) => s.id !== tempId),
              error: message
            }))
            throw new Error(message)
          }

          const mapped = mapApiSupplierToStore(created)

          set((state) => ({
            suppliers: state.suppliers.map((s) =>
              s.id === tempId ? mapped : s
            )
          }))

          return mapped
        } catch (error: any) {
          const message =
            error?.response?.data?.error ||
            error?.message ||
            'Failed to persist supplier'

          console.error('Failed to persist supplier:', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data
          })

          set((state) => ({
            suppliers: state.suppliers.filter((s) => s.id !== tempId),
            error: message
          }))

          throw new Error(message)
        }
      },

      updateSupplier: (id, updates) => {
        set((state) => ({
          suppliers: state.suppliers.map(supplier =>
            supplier.id === id 
              ? { ...supplier, ...updates, updatedAt: new Date().toISOString() }
              : supplier
          )
        }))

        ;(async () => {
          try {
            await supplierApi.update(id, updates)
          } catch (error) {
            console.error('Failed to update supplier:', error)
          }
        })()
      },

      deleteSupplier: (id) => {
        const { suppliers, inventoryItems, purchaseOrders, supplierInvoices, returnOrders } = get()
        const supplier = suppliers.find(s => s.id === id)
        
        if (!supplier) {
          console.error('Supplier not found:', id)
          return
        }

        // Check if supplier has any items
        const hasItems = inventoryItems.some(item => item.supplierId === id)
        if (hasItems) {
          set({ error: 'Cannot delete supplier with associated inventory items.' })
          return
        }

        // Check if supplier has any open purchase orders
        const hasOpenOrders = purchaseOrders.some(order => order.supplierId === id && order.status !== 'received' && order.status !== 'cancelled')
        if (hasOpenOrders) {
          set({ error: 'Cannot delete supplier with open purchase orders.' })
          return
        }

        // Check if supplier has any unpaid invoices
        const hasUnpaidInvoices = supplierInvoices.some(invoice => invoice.supplierId === id && (invoice.paymentStatus === 'unpaid' || invoice.paymentStatus === 'partially_paid'))
        if (hasUnpaidInvoices) {
          set({ error: 'Cannot delete supplier with unpaid invoices.' })
          return
        }

        // Check if supplier has any pending returns
        const hasPendingReturns = returnOrders.some(returnOrder => returnOrder.supplierId === id && (returnOrder.status === 'requested' || returnOrder.status === 'approved'))
        if (hasPendingReturns) {
          set({ error: 'Cannot delete supplier with pending returns.' })
          return
        }

        set((state) => ({
          suppliers: state.suppliers.filter(supplier => supplier.id !== id)
        }))

        ;(async () => {
          try {
            await supplierApi.delete(id)
          } catch (error) {
            console.error('Failed to delete supplier:', error)
          }
        })()
      },

      removeSupplier: (id) => {
        // Alias for deleteSupplier to match component expectations
        const { deleteSupplier } = get()
        deleteSupplier(id)
      },

      // Purchase order management
      createPurchaseOrder: (orderData) => {
        const { suppliers, inventoryItems } = get()
        const supplier = suppliers.find(s => s.id === orderData.supplierId)
        
        if (!supplier) {
          console.error('Supplier not found:', orderData.supplierId)
          throw new Error('Supplier not found')
        }

        // Transform items to match PurchaseOrderItem interface
        const orderItems: PurchaseOrderItem[] = orderData.items.map((item, idx) => {
          const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId)
          const manualId = `manual_${Date.now()}_${idx}`
          return {
            id: `po_item_${Date.now()}_${item.inventoryItemId || manualId}`,
            itemId: item.inventoryItemId || manualId, // For compatibility
            inventoryItemId: item.inventoryItemId || manualId,
            itemName: item.itemName || inventoryItem?.name || 'Manual Item',
            sku: item.sku || inventoryItem?.sku || 'MANUAL',
            name: item.itemName || inventoryItem?.name || 'Manual Item', // For search functionality
            quantityOrdered: item.quantity,
            quantityReceived: 0,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
            receivedBatches: [],
            status: 'pending'
          }
        })

        const newOrder: PurchaseOrder = {
          id: `po_${Date.now()}`,
          ...orderData,
          items: orderItems,
          orderNumber: `PO-${Date.now()}`,
          supplierName: supplier.name,
          status: 'pending',
          subtotal: orderItems.reduce((sum, item) => sum + item.totalCost, 0),
          taxAmount: orderItems.reduce((sum, item) => sum + (item.totalCost * TAX_RATE), 0),
          shippingCost: 0,
          totalAmount: orderItems.reduce((sum, item) => sum + item.totalCost, 0) +
            orderItems.reduce((sum, item) => sum + (item.totalCost * TAX_RATE), 0),
          orderDate: new Date().toISOString(),
          expectedDate: orderData.expectedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
          paymentStatus: 'pending',
          paymentTerms: supplier.paymentTerms,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'current-user', // This should come from auth context
          notes: orderData.notes || ''
        }

        set((state) => ({
          purchaseOrders: [...state.purchaseOrders, newOrder]
        }))

        const authState = useAuthStore.getState()
        const creator = authState.currentUser?.username || 'system'

        authState.logActivity(
          'DOCUMENT_CREATED',
          {
            documentType: 'purchase_order',
            documentNumber: newOrder.orderNumber,
            purchaseOrderId: newOrder.id,
            supplierName: supplier.name,
            createdBy: creator
          },
          'documents',
          newOrder.id
        )
      },

      updatePurchaseOrder: (id, updates) => {
        const { purchaseOrders } = get()
        const existing = purchaseOrders.find(po => po.id === id)

        set((state) => ({
          purchaseOrders: state.purchaseOrders.map(order => {
            if (order.id !== id) return order

            let next = { ...order, ...updates } as PurchaseOrder

            if (updates.status === 'received') {
              const allReceived = (next.items || order.items).every(it => (it.quantityReceived || 0) >= it.quantityOrdered)
              const hasLinkedInvoice = state.supplierInvoices.some(inv => inv.purchaseOrderIds.includes(order.id))
              if (!(allReceived && hasLinkedInvoice)) {
                next.status = 'partially_received'
              }
            }

            if (updates.items) {
              const subtotal = updates.items.reduce((sum, item) => sum + item.totalCost, 0)
              const taxAmount = updates.items.reduce((sum, item) => sum + (item.totalCost * TAX_RATE), 0)
              const shipping = next.shippingCost || 0
              next = { ...next, subtotal, taxAmount, totalAmount: subtotal + taxAmount + shipping }
            }

            return { ...next, updatedAt: new Date().toISOString() }
          })
        }))

        if (existing) {
          const authState = useAuthStore.getState()
          authState.logActivity(
            'DOCUMENT_UPDATED',
            {
              documentType: 'purchase_order',
              documentNumber: existing.orderNumber,
              purchaseOrderId: id
            },
            'documents',
            id
          )
        }
      },

      deletePurchaseOrder: (id) => {
        const { purchaseOrders } = get()
        const order = purchaseOrders.find(po => po.id === id)
        
        if (!order) {
          console.error('Purchase order not found:', id)
          return
        }

        if (order.status !== 'pending') {
          set({ error: 'Cannot delete purchase order that is not in pending status.' })
          return
        }

        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter(order => order.id !== id)
        }))

        const authState = useAuthStore.getState()
        authState.logActivity(
          'DOCUMENT_DELETED',
          {
            documentType: 'purchase_order',
            documentNumber: order.orderNumber,
            purchaseOrderId: id
          },
          'documents',
          id
        )
      },

      receivePurchaseOrder: async (orderId, receivedItems) => {
        const { purchaseOrders, supplierInvoices, inventoryItems } = get()
        const order = purchaseOrders.find(po => po.id === orderId)
        
        if (!order) {
          console.error('Purchase order not found:', orderId)
          return
        }

        // Update order items with received quantities
        const updatedItems = order.items.map(item => {
          const receivedItem = receivedItems.find(ri => ri.inventoryItemId === item.inventoryItemId)
          if (receivedItem) {
            const newQuantityReceived = (item.quantityReceived || 0) + receivedItem.quantity
            return {
              ...item,
              quantityReceived: newQuantityReceived,
              status: (newQuantityReceived >= item.quantityOrdered ? 'received' : 'partially_received') as 'received' | 'partially_received'
            }
          }
          return item
        })

        const allItemsReceived = updatedItems.every(item => item.status === 'received')
        const hasLinkedInvoice = supplierInvoices.some(inv => inv.purchaseOrderIds.includes(orderId))
        
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map(po =>
            po.id === orderId 
              ? { 
                  ...po, 
                  items: updatedItems,
                  status: allItemsReceived ? (hasLinkedInvoice ? 'received' : 'partially_received') : 'partially_received',
                  updatedAt: new Date().toISOString()
                }
              : po
          )
        }))

        for (const item of receivedItems) {
          const orderItem = order.items.find(oi => oi.inventoryItemId === item.inventoryItemId)
          if (!orderItem) continue

          const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId)
          if (!inventoryItem) continue

          await get().receiveStock(
            item.inventoryItemId, 
            item.quantity, 
            orderItem.unitCost, 
            order.orderNumber, 
            item.batchNumber, 
            item.expiryDate
          )
        }
      },

      // Return order management
      createReturnOrder: (returnData) => {
        const { suppliers, purchaseOrders, supplierInvoices, inventoryItems } = get()
        const supplier = suppliers.find(s => s.id === returnData.supplierId)
        
        if (!supplier) {
          console.error('Supplier not found:', returnData.supplierId)
          throw new Error('Supplier not found')
        }

        // Validate all items exist
        for (const item of returnData.items) {
          const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId)
          if (!inventoryItem) {
            console.error(`Inventory item ${item.inventoryItemId} not found`)
            throw new Error(`Inventory item ${item.inventoryItemId} not found`)
          }
          
          // Check if we have enough stock to return
          if (inventoryItem.quantity < item.quantityReturned) {
            console.error(`Insufficient stock for return: ${item.inventoryItemId}`)
            throw new Error(`Insufficient stock for return: ${inventoryItem.name}`)
          }
        }

        // Get related purchase order and supplier invoice if provided
        const purchaseOrder = returnData.purchaseOrderId ? purchaseOrders.find(po => po.id === returnData.purchaseOrderId) : undefined
        const supplierInvoice = returnData.supplierInvoiceId ? supplierInvoices.find(inv => inv.id === returnData.supplierInvoiceId) : undefined

        // Transform items to match ReturnOrderItem interface
        const returnItems: ReturnOrderItem[] = returnData.items.map(item => {
          const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId)
          return {
            id: `ret_item_${Date.now()}_${item.inventoryItemId}`,
            inventoryItemId: item.inventoryItemId,
            itemName: inventoryItem?.name || 'Unknown Item',
            sku: inventoryItem?.sku || 'Unknown SKU',
            quantityReturned: item.quantityReturned,
            unitCost: inventoryItem?.unitCost || 0,
            totalCost: (inventoryItem?.unitCost || 0) * item.quantityReturned,
            condition: item.condition || 'new',
            conditionNotes: item.conditionNotes || '',
            status: 'pending'
          }
        })

        const newReturnOrder: ReturnOrder = {
          id: `ret_${Date.now()}`,
          returnNumber: `RET-${new Date().getFullYear()}-${String(get().returnOrders.length + 1).padStart(3, '0')}`,
          returnDate: new Date().toISOString(),
          supplierId: returnData.supplierId,
          supplierName: supplier.name,
          supplierContact: supplier.contactPerson,
          purchaseOrderId: returnData.purchaseOrderId,
          purchaseOrderNumber: purchaseOrder?.orderNumber,
          supplierInvoiceId: returnData.supplierInvoiceId,
          supplierInvoiceNumber: supplierInvoice?.invoiceNumber,
          deliveryNoteId: returnData.deliveryNoteId,
          deliveryNoteNumber: returnData.deliveryNoteNumber,
          items: returnItems,
          subtotal: returnItems.reduce((sum, item) => sum + item.totalCost, 0),
          taxAmount: 0, // Default tax amount
          totalAmount: returnItems.reduce((sum, item) => sum + item.totalCost, 0),
          returnReason: returnData.returnReason,
          returnReasonDetails: returnData.returnReasonDetails,
          returnMethod: returnData.returnMethod,
          status: 'requested',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'current-user', // This should come from auth context
          notes: returnData.notes || ''
        }

        set((state) => ({
          returnOrders: [...state.returnOrders, newReturnOrder]
        }))
        
        return newReturnOrder
      },

      updateReturnOrder: (id, updates) => {
        set((state) => ({
          returnOrders: state.returnOrders.map(returnOrder =>
            returnOrder.id === id 
              ? { ...returnOrder, ...updates, updatedAt: new Date().toISOString() }
              : returnOrder
          )
        }))
      },

      deleteReturnOrder: (id) => {
        const { returnOrders } = get()
        const returnOrder = returnOrders.find(ro => ro.id === id)
        
        if (!returnOrder) {
          console.error('Return order not found:', id)
          return
        }

        if (returnOrder.status === 'processed' || returnOrder.status === 'completed') {
          set({ error: 'Cannot delete return order that has been processed or completed.' })
          return
        }

        set((state) => ({
          returnOrders: state.returnOrders.filter(returnOrder => returnOrder.id !== id)
        }))
      },

      processReturnOrder: async (id, processedBy) => {
        const { returnOrders, adjustStock, inventoryItems } = get()
        const returnOrder = returnOrders.find(ro => ro.id === id)
        
        if (!returnOrder) {
          console.error('Return order not found:', id)
          return
        }

        if (returnOrder.status !== 'approved') {
          set({ error: 'Return order must be approved before processing.' })
          return
        }

        // Validate that we have sufficient stock for all items being returned
        for (const item of returnOrder.items) {
          const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId)
          if (!inventoryItem) {
            console.error(`Inventory item not found: ${item.inventoryItemId}`)
            set({ error: `Inventory item not found: ${item.itemName}` })
            return
          }
          
          if (inventoryItem.quantity < item.quantityReturned) {
            console.error(`Insufficient stock for return: ${item.inventoryItemId}`)
            set({ error: `Insufficient stock for return: ${item.itemName}. Available: ${inventoryItem.quantity}, Requested: ${item.quantityReturned}` })
            return
          }
        }

        // Update return order status
        set((state) => ({
          returnOrders: state.returnOrders.map(returnOrder =>
            returnOrder.id === id 
              ? { 
                  ...returnOrder, 
                  status: 'processed',
                  processedBy,
                  processedDate: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              : returnOrder
          )
        }))

        // Decrement inventory for all returned items and log the movement
        for (const item of returnOrder.items) {
          const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId)
          if (!inventoryItem) continue

          const targetQuantity = inventoryItem.quantity - item.quantityReturned
          await adjustStock(
            item.inventoryItemId, 
            targetQuantity, 
            `Return processed - Return #${returnOrder.returnNumber}`, 
            returnOrder.id
          )
          
          console.log(`Return processed: ${item.itemName} (SKU: ${item.sku}) - Quantity returned: ${item.quantityReturned}`)
        }
        
        console.log(`Return order ${returnOrder.returnNumber} processed successfully by ${processedBy}`)
      },

      // Supplier invoice management
      fetchSupplierInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          const invoices = await supplierInvoiceApi.list();
          set({ supplierInvoices: invoices, isLoading: false });
        } catch (error) {
          console.error('Error fetching supplier invoices:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to fetch supplier invoices', isLoading: false });
        }
      },

      createSupplierInvoice: async (invoiceData) => {
        try {
          set({ isLoading: true, error: null });
          const deliveryNoteIds = Array.from(
            new Set(
              (invoiceData.items || [])
                .map((it: any) => it?.deliveryNoteId)
                .filter((v: any) => typeof v === 'string' && v.length > 0)
            )
          )
          const coreItems = invoiceData.items.map(({ deliveryNoteId: _deliveryNoteId, deliveryNoteNumber: _deliveryNoteNumber, ...rest }) => rest);
          const objectIdRegex = /^[0-9a-fA-F]{24}$/;
          const apiPurchaseOrders = (invoiceData.purchaseOrderIds || []).filter((poId: any) =>
            typeof poId === 'string' && objectIdRegex.test(poId)
          )
          const apiItems = coreItems.map(item => ({
            inventoryItem: item.inventoryItemId && objectIdRegex.test(item.inventoryItemId)
              ? item.inventoryItemId
              : undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            description: item.description,
          }));
          const computedSubtotal = apiItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
          const baseSubtotal = invoiceData.subtotal ?? computedSubtotal;
          const baseTaxAmount = invoiceData.taxAmount ?? baseSubtotal * (apiItems[0]?.taxRate ?? 0.2);
          const baseTotalAmount = invoiceData.totalAmount ?? baseSubtotal + baseTaxAmount;

          const payload = {
            invoiceNumber: invoiceData.invoiceNumber,
            supplier: invoiceData.supplierId,
            purchaseOrders: apiPurchaseOrders,
            invoiceDate: invoiceData.invoiceDate,
            dueDate: invoiceData.dueDate,
            items: apiItems,
            subtotal: baseSubtotal,
            taxAmount: baseTaxAmount,
            totalAmount: baseTotalAmount,
            paidAmount: 0,
            status: 'draft',
            paymentStatus: 'unpaid',
            notes: invoiceData.notes,
          };

          const newInvoice = await supplierInvoiceApi.create(payload);

          if (deliveryNoteIds.length > 0 && newInvoice?.id) {
            try {
              await deliveryNoteApi.linkToInvoice(deliveryNoteIds, newInvoice.id)
            } catch {}
          }
          set((state) => ({
            supplierInvoices: [...state.supplierInvoices, newInvoice],
            isLoading: false
          }));
          return newInvoice;
        } catch (error: any) {
          console.error(
            'Error creating supplier invoice:',
            error?.response?.data || error?.message || error
          );
          set({
            error:
              (error && (error.response?.data?.message || error.message)) ||
              'Failed to create supplier invoice',
            isLoading: false
          });
          throw error;
        }
      },

      updateSupplierInvoice: async (id, updates) => {
        try {
          set({ isLoading: true, error: null });
          const updatedInvoice = await supplierInvoiceApi.update(id, updates);
          set((state) => ({
            supplierInvoices: state.supplierInvoices.map(invoice =>
              invoice.id === id ? updatedInvoice : invoice
            ),
            isLoading: false
          }));
        } catch (error) {
          console.error('Error updating supplier invoice:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to update supplier invoice', isLoading: false });
          throw error;
        }
      },

      deleteSupplierInvoice: async (id) => {
        try {
          set({ isLoading: true, error: null });
          const objectIdRegex = /^[0-9a-fA-F]{24}$/;
          if (objectIdRegex.test(id)) {
            await supplierInvoiceApi.delete(id);
          }
          set((state) => ({
            supplierInvoices: state.supplierInvoices.filter(invoice => invoice.id !== id),
            isLoading: false
          }));
        } catch (error) {
          console.error('Error deleting supplier invoice:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete supplier invoice', isLoading: false });
          throw error;
        }
      },

      recordInvoicePayment: (invoiceId, payment) => {
        const { supplierInvoices } = get()
        const invoice = supplierInvoices.find(inv => inv.id === invoiceId)
        
        if (!invoice) {
          console.error('Supplier invoice not found:', invoiceId)
          return
        }

        const newPayment: InvoicePayment = {
          id: `pay_${Date.now()}`,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod as InvoicePayment['paymentMethod'],
          status: 'completed',
          referenceNumber: payment.reference || '',
          createdBy: 'current-user', // This should come from auth context
          createdAt: new Date().toISOString()
        }

        const updatedPayments = [...invoice.payments, newPayment]
        const totalPaid = updatedPayments.reduce((sum, pay) => sum + pay.amount, 0)
        const newBalanceDue = Math.max(invoice.totalAmount - totalPaid, 0)
        const newPaymentStatus = newBalanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid'

        set((state) => ({
          supplierInvoices: state.supplierInvoices.map(invoice =>
            invoice.id === invoiceId 
              ? { 
                  ...invoice, 
                  payments: updatedPayments,
                  paidAmount: totalPaid,
                  remainingAmount: newBalanceDue,
                  paymentStatus: newPaymentStatus,
                  status: newPaymentStatus === 'paid' ? 'paid' : invoice.status,
                  updatedAt: new Date().toISOString()
                }
              : invoice
          )
        }))
      },

      // Stock transfer management
      addStockTransfer: (transferData) => {
        const { locations } = get()
        const fromLocation = locations.find(loc => loc.id === transferData.fromLocation)
        const toLocation = locations.find(loc => loc.id === transferData.toLocation)
        
        if (!fromLocation || !toLocation) {
          console.error('Invalid source or destination location')
          throw new Error('Invalid source or destination location')
        }

        const newTransfer: StockTransfer = {
          id: `st_${Date.now()}`,
          items: transferData.items.map(item => ({
            ...item,
            sku: '', // Will be populated from inventory item
            itemName: '', // Will be populated from inventory item
            fromLocation: transferData.fromLocation,
            toLocation: transferData.toLocation
          })),
          fromLocation: transferData.fromLocation,
          toLocation: transferData.toLocation,
          transferNumber: `ST-${Date.now()}`,
          status: 'pending',
          requestedDate: transferData.requestedDate || new Date().toISOString(),
          requestedBy: 'current-user',
          reason: transferData.reason,
          notes: transferData.notes || '',
          referenceNumber: transferData.referenceNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        set((state) => ({
          stockTransfers: [...state.stockTransfers, newTransfer]
        }))
        
        return newTransfer
      },

      updateStockTransfer: (id, updates) => {
        set((state) => ({
          stockTransfers: state.stockTransfers.map(transfer =>
            transfer.id === id 
              ? { ...transfer, ...updates, updatedAt: new Date().toISOString() }
              : transfer
          )
        }))
      },

      deleteStockTransfer: (id) => {
        const { stockTransfers } = get()
        const transfer = stockTransfers.find(st => st.id === id)
        
        if (!transfer) {
          console.error('Stock transfer not found:', id)
          return
        }

        if (transfer.status !== 'pending') {
          set({ error: 'Cannot delete stock transfer that is not in pending status.' })
          return
        }

        set((state) => ({
          stockTransfers: state.stockTransfers.filter(transfer => transfer.id !== id)
        }))
      },

      // Audit management
      createAudit: (auditData: { title: string; type: 'full' | 'cycle' | 'spot' | 'category' | 'location'; scope?: { categories?: string[]; locations?: string[]; items?: string[] } }) => {
        const newAudit: InventoryAudit = {
          id: `audit_${Date.now()}`,
          auditNumber: `AUD-${Date.now()}`,
          title: auditData.title,
          type: auditData.type,
          scope: auditData.scope,
          status: 'planned',
          startDate: new Date().toISOString(),
          assignedTo: [],
          createdBy: 'current-user',
          itemsCounted: 0,
          itemsDiscrepancy: 0,
          totalVariance: 0,
          accuracyPercentage: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        set((state) => ({
          audits: [...state.audits, newAudit]
        }))
      },

      updateAudit: (id: string, updates: Partial<InventoryAudit>) => {
        set((state) => ({
          audits: state.audits.map(audit =>
            audit.id === id 
              ? { ...audit, ...updates, updatedAt: new Date().toISOString() }
              : audit
          )
        }))
      },

      deleteAudit: (id) => {
        set((state) => ({
          audits: state.audits.filter(audit => audit.id !== id)
        }))
      },

      updateAuditStatus: (id: string, status: 'planned' | 'in_progress' | 'completed' | 'cancelled') => {
        set((state) => ({
          audits: state.audits.map(audit =>
            audit.id === id 
              ? { ...audit, status, updatedAt: new Date().toISOString() }
              : audit
          )
        }))
      },

      // Location management
      addLocation: (locationData: InventoryLocation) => {
        const newLocation: InventoryLocation = {
          ...locationData,
          id: `loc_${Date.now()}`,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        set((state) => ({
          locations: [...state.locations, newLocation]
        }))
      },

      updateLocation: (id: string, updates: Partial<InventoryLocation>) => {
        set((state) => ({
          locations: state.locations.map(location =>
            location.id === id 
              ? { ...location, ...updates, updatedAt: new Date().toISOString() }
              : location
          )
        }))
      },

      deleteLocation: (id: string) => {
        const { locations, inventoryItems } = get()
        const location = locations.find(loc => loc.id === id)
        
        if (!location) {
          console.error('Location not found:', id)
          return
        }

        // Check if location has any items
        const hasItems = inventoryItems.some(item => item.location === id)
        if (hasItems) {
          set({ error: 'Cannot delete location with associated inventory items.' })
          return
        }

        set((state) => ({
          locations: state.locations.filter(location => location.id !== id)
        }))
      },

      // Utility functions
      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters }
        }))
      },

      clearFilters: () => {
        set({
          filters: {
            searchTerm: '',
            stockLevel: 'all',
            status: ['active'],
            category: [],
            supplier: [],
            location: []
          }
        })
      },

      setSort: (sort) => {
        set({ sort })
      },

      setSearchTerm: (term) => {
        set({ searchTerm: term })
      },

      clearSearch: () => {
        set({ searchTerm: '' })
      },

      // Getters and queries
      getFilteredItems: () => {
        const { inventoryItems, filters, searchTerm, sort } = get()
        
        const filtered = inventoryItems.filter(item => {
          // Status filter
          if (filters.status && filters.status.length > 0 && !filters.status.includes(item.status)) {
            return false
          }
          
          // Stock level filter
          if (filters.stockLevel && filters.stockLevel !== 'all') {
            switch (filters.stockLevel) {
              case 'low_stock':
                return item.quantity <= item.minimumStock && item.quantity > 0
              case 'out_of_stock':
                return item.quantity === 0
              case 'overstock':
                return item.quantity > item.maximumStock
              case 'in_stock':
                return item.quantity > 0
              default:
                return true
            }
          }
          
          // Category filter
          if (filters.category && filters.category.length > 0 && !filters.category.includes(item.category)) {
            return false
          }
          
          // Supplier filter
          if (filters.supplier && filters.supplier.length > 0 && !filters.supplier.includes(item.supplierId)) {
            return false
          }
          
          // Location filter
          if (filters.location && filters.location.length > 0 && !filters.location.includes(item.location)) {
            return false
          }
          
          // Search term filter
          if (searchTerm) {
            const term = searchTerm.toLowerCase()
            return (
              item.name.toLowerCase().includes(term) ||
              item.description.toLowerCase().includes(term) ||
              item.sku.toLowerCase().includes(term) ||
              item.barcode?.toLowerCase().includes(term) ||
              item.category.toLowerCase().includes(term)
            )
          }
          
          return true
        })
        
        // Sort items
        filtered.sort((a, b) => {
          let aValue: any = a[sort.field as keyof InventoryItem]
          let bValue: any = b[sort.field as keyof InventoryItem]
          
          // Handle nested fields
          if (sort.field.includes('.')) {
            const [parent, child] = sort.field.split('.')
            aValue = (a as any)[parent]?.[child]
            bValue = (b as any)[parent]?.[child]
          }
          
          // Handle date fields
          if (sort.field === 'lastUpdated') {
            aValue = new Date(aValue)
            bValue = new Date(bValue)
          }
          
          // Handle string comparison
          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase()
            bValue = (bValue as string).toLowerCase()
          }
          
          if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1
          if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1
          return 0
        })
        
        return filtered
      },

      getInventoryStats: () => {
        const { inventoryItems, purchaseOrders, returnOrders, supplierInvoices } = get()
        
        const totalItems = inventoryItems.length
        const totalValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
        const lowStockItems = inventoryItems.filter(item => item.quantity <= item.minimumStock && item.quantity > 0).length
        const outOfStockItems = inventoryItems.filter(item => item.quantity === 0).length
        const overstockItems = inventoryItems.filter(item => item.quantity > item.maximumStock).length
        
        const pendingOrders = purchaseOrders.filter(order => order.status === 'pending').length
        const overdueOrders = purchaseOrders.filter(order => {
          if (!order.expectedDeliveryDate) return false
          const expectedDate = new Date(order.expectedDeliveryDate)
          const today = new Date()
          return expectedDate < today && order.status !== 'received'
        }).length
        
        const pendingReturns = returnOrders.filter(ret => ret.status === 'requested' || ret.status === 'approved').length
        const overdueInvoices = supplierInvoices.filter(inv => {
          if (!inv.dueDate) return false
          const dueDate = new Date(inv.dueDate)
          const today = new Date()
          return dueDate < today && inv.paymentStatus !== 'paid'
        }).length
        
        return {
          totalItems,
          totalValue,
          lowStockItems,
          outOfStockItems,
          overstockItems,
          expiringItems: inventoryItems.filter(item => {
            if (!item.expiryDate) return false
            const expiryDate = new Date(item.expiryDate)
            const today = new Date()
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            return daysUntilExpiry <= 30 && daysUntilExpiry > 0
          }).length,
          activeSuppliers: new Set(inventoryItems.map(item => item.supplierId)).size,
          pendingOrders,
          overdueOrders,
          pendingReturns,
          overdueInvoices,
          totalOpenReturns: returnOrders.filter(ret => ret.status !== 'completed' && ret.status !== 'cancelled').length,
          totalUnpaidInvoices: supplierInvoices.filter(inv => inv.paymentStatus !== 'paid').length,
          totalOutstandingInvoiceAmount: supplierInvoices
            .filter(inv => inv.paymentStatus !== 'paid')
            .reduce((sum, inv) => sum + inv.remainingAmount, 0)
        }
      },

      getInventoryReport: (startDate, endDate) => {
        const { inventoryItems, stockMovements, purchaseOrders } = get()
        
        const start = new Date(startDate)
        const end = new Date(endDate)
        
        const movements = stockMovements.filter(movement => {
          const movementDate = new Date(movement.movementDate)
          return movementDate >= start && movementDate <= end
        })
        
        const orders = purchaseOrders.filter(order => {
          const orderDate = new Date(order.orderDate)
          return orderDate >= start && orderDate <= end
        })
        
        return {
          date: new Date().toISOString(),
          totalItems: inventoryItems.length,
          totalValue: inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
          itemsAdded: movements.filter(m => m.type === 'in').length,
          itemsRemoved: movements.filter(m => m.type === 'out').length,
          stockMovements: movements.length,
          purchaseOrders: orders.length,
          receivedShipments: movements.filter(m => m.type === 'purchase').length
        }
      },

      calculateSupplierInvoiceAmount: (supplierId: string, startDate: string, endDate: string) => {
        const { purchaseOrders, returnOrders, audits } = get()
        const start = new Date(startDate)
        const end = new Date(endDate)

        const includedPOs = purchaseOrders.filter(po => {
          if (po.supplierId !== supplierId) return false
          const d = new Date(po.orderDate)
          const inRange = d >= start && d <= end
          const isComplete = po.status === 'received' || po.status === 'approved'
          const itemsComplete = po.items.every(it => (it.quantityReceived || 0) >= it.quantityOrdered)
          const hasAcceptedReceipts = po.items.some(it => (it.receivedBatches || []).some(b => b.qualityStatus === 'accepted'))
          return inRange && isComplete && itemsComplete && hasAcceptedReceipts
        })

        const poTotal = includedPOs.reduce((sum, po) => sum + po.items.reduce((s, it) => s + (it.quantityReceived * it.unitCost), 0), 0)

        const includedReturns = returnOrders.filter(ro => {
          if (ro.supplierId !== supplierId) return false
          const d = new Date(ro.returnDate)
          const inRange = d >= start && d <= end
          const authorized = ro.status === 'approved' || ro.status === 'completed'
          return inRange && authorized
        })

        const returnTotal = includedReturns.reduce((sum, ro) => sum + ro.items.reduce((s, it) => s + (it.totalCost || (it.quantityReturned * it.unitCost)), 0), 0)

        const invoiceAmount = poTotal - returnTotal

        const deliveryReceiptsVerified = includedPOs.every(po => po.items.some(it => (it.receivedBatches || []).length > 0))
        const qualityChecksAccepted = includedPOs.every(po => po.items.every(it => (it.receivedBatches || []).every(b => b.qualityStatus === 'accepted')))
        const allPOsComplete = includedPOs.every(po => po.items.every(it => (it.quantityReceived || 0) >= it.quantityOrdered))
        const allReturnsAuthorized = includedReturns.every(ro => ro.status === 'approved' || ro.status === 'completed')

        const auditId = `audit_${Date.now()}`
        const auditNumber = `REC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`
        const findings = includedPOs.flatMap(po => po.items.map(it => ({
          itemId: it.inventoryItemId,
          sku: it.sku,
          itemName: it.itemName,
          systemQuantity: it.quantityOrdered,
          actualQuantity: it.quantityReceived,
          variance: (it.quantityReceived || 0) - it.quantityOrdered,
          unitCost: it.unitCost,
          varianceValue: ((it.quantityReceived || 0) - it.quantityOrdered) * it.unitCost
        })))

        const auditEntry: InventoryAudit = {
          id: auditId,
          auditNumber,
          title: 'Supplier Invoice Reconciliation',
          type: 'spot',
          scope: { items: findings.map(f => f.itemId) },
          status: 'completed',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          assignedTo: [],
          createdBy: 'system',
          itemsCounted: findings.length,
          itemsDiscrepancy: findings.filter(f => f.variance !== 0).length,
          totalVariance: findings.reduce((s, f) => s + f.varianceValue, 0),
          accuracyPercentage: findings.length === 0 ? 100 : Math.max(0, Math.min(100, ((findings.length - findings.filter(f => f.variance !== 0).length) / findings.length) * 100)),
          findings,
          notes: `Supplier ${supplierId} reconciliation from ${startDate} to ${endDate}. PO total ${poTotal.toFixed(2)}, returns total ${returnTotal.toFixed(2)}, invoice amount ${invoiceAmount.toFixed(2)}.`,
          attachments: [] ,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        set({ audits: [...audits, auditEntry] })

        return {
          supplierId,
          period: { startDate, endDate },
          includedPOs,
          includedReturns,
          totals: { purchaseOrders: poTotal, returns: returnTotal, invoiceAmount },
          validations: { allPOsComplete, allReturnsAuthorized, deliveryReceiptsVerified, qualityChecksAccepted },
          auditId
        }
      },

      getLowStockItems: () => {
        const { inventoryItems } = get()
        return inventoryItems.filter(item => item.quantity <= item.minimumStock && item.quantity > 0 && item.isActive)
      },

      getOutOfStockItems: () => {
        const { inventoryItems } = get()
        return inventoryItems.filter(item => item.quantity === 0 && item.isActive)
      },

      getOverstockItems: () => {
        const { inventoryItems } = get()
        return inventoryItems.filter(item => item.quantity > item.maximumStock && item.isActive)
      },

      getItemsByCategory: (category) => {
        const { inventoryItems } = get()
        return inventoryItems.filter(item => item.category === category && item.isActive)
      },

      getItemsBySupplier: (supplierId) => {
        const { inventoryItems } = get()
        return inventoryItems.filter(item => item.supplierId === supplierId && item.isActive)
      },

      getItemsByLocation: (location) => {
        const { inventoryItems } = get()
        return inventoryItems.filter(item => item.location === location && item.isActive)
      },

      getSupplierById: (id) => {
        const { suppliers } = get()
        return suppliers.find(supplier => supplier.id === id)
      },

      getPurchaseOrderById: (id) => {
        const { purchaseOrders } = get()
        return purchaseOrders.find(order => order.id === id)
      },

      getLocationById: (id) => {
        const { locations } = get()
        return locations.find(location => location.id === id)
      },

      getReturnOrderById: (id) => {
        const { returnOrders } = get()
        return returnOrders.find(returnOrder => returnOrder.id === id)
      },

      getSupplierInvoiceById: (id) => {
        const { supplierInvoices } = get()
        return supplierInvoices.find(invoice => invoice.id === id)
      },

      getFilteredReturnOrders: (filters) => {
        const { returnOrders } = get()
        
        return returnOrders.filter(returnOrder => {
          // Supplier filter
          if (filters?.supplierId && returnOrder.supplierId !== filters.supplierId) {
            return false
          }
          
          // Status filter
          if (filters?.status && returnOrder.status !== filters.status) {
            return false
          }
          
          // Date range filter
          if (filters?.dateRange) {
            const returnDate = new Date(returnOrder.returnDate)
            const startDate = new Date(filters.dateRange.start)
            const endDate = new Date(filters.dateRange.end)
            
            if (returnDate < startDate || returnDate > endDate) {
              return false
            }
          }
          
          return true
        }).sort((a, b) => 
          new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime()
        )
      },

      getFilteredSupplierInvoices: (filters) => {
        const { supplierInvoices } = get()
        
        return supplierInvoices.filter(invoice => {
          // Supplier filter
          if (filters?.supplierId && invoice.supplierId !== filters.supplierId) {
            return false
          }
          
          // Status filter
          if (filters?.status && invoice.status !== filters.status) {
            return false
          }
          
          // Payment status filter
          if (filters?.paymentStatus && invoice.paymentStatus !== filters.paymentStatus) {
            return false
          }
          
          // Date range filter
          if (filters?.dateRange) {
            const invoiceDate = new Date(invoice.invoiceDate)
            const startDate = new Date(filters.dateRange.start)
            const endDate = new Date(filters.dateRange.end)
            
            if (invoiceDate < startDate || invoiceDate > endDate) {
              return false
            }
          }
          
          return true
        }).sort((a, b) => 
          new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
        )
      },

      getStockHistory: (itemId) => {
        const { stockMovements } = get()
        return stockMovements.filter(movement => movement.inventoryItemId === itemId)
      },

      getItemHistory: (itemId: string) => {
        return get().stockMovements.filter(movement => movement.inventoryItemId === itemId)
      },

      // Barcode and scanning
      lookupBarcode: (barcode) => {
        const { inventoryItems } = get()
        return inventoryItems.find(item => item.barcode === barcode && item.isActive)
      },

      recordBarcodeScan: (scanData) => {
        console.log('Barcode scan recorded:', scanData)
        // This would typically integrate with a barcode scanning system
      },

      // Stock alerts
      checkStockAlerts: (itemId) => {
        const { inventoryItems, stockAlerts } = get()
        
        if (itemId) {
          // Check specific item
          const item = inventoryItems.find(item => item.id === itemId && item.isActive)
          if (!item) return
          
          const existingAlerts = stockAlerts.filter(alert => 
            alert.inventoryItemId === itemId && !alert.isResolved
          )
          
          // Remove existing alerts for this item
          if (existingAlerts.length > 0) {
            set((state) => ({
              stockAlerts: state.stockAlerts.filter(alert => 
                !(alert.inventoryItemId === itemId && !alert.isResolved)
              )
            }))
          }
          
          // Check for low stock
          if (item.quantity <= item.minimumStock && item.quantity > 0) {
            const alert: StockAlert = {
              id: `alert_${Date.now()}`,
              inventoryItemId: itemId,
              itemName: item.name,
              sku: item.sku,
              type: 'low_stock',
              message: `Low stock alert: ${item.name} has ${item.quantity} units remaining (minimum: ${item.minimumStock})`,
              severity: item.quantity === 0 ? 'high' : 'medium',
              currentStock: item.quantity,
              threshold: item.minimumStock,
              isRead: false,
              isResolved: false,
              createdAt: new Date().toISOString(),
              createdBy: 'system'
            }
            
            set((state) => ({
              stockAlerts: [...state.stockAlerts, alert]
            }))
          }
          
          // Check for out of stock
          if (item.quantity === 0) {
            const alert: StockAlert = {
              id: `alert_${Date.now()}_oos`,
              inventoryItemId: itemId,
              itemName: item.name,
              sku: item.sku,
              type: 'out_of_stock',
              message: `Out of stock: ${item.name} has no units remaining`,
              severity: 'high',
              currentStock: item.quantity,
              threshold: item.minimumStock,
              isRead: false,
              isResolved: false,
              createdAt: new Date().toISOString(),
              createdBy: 'system'
            }
            
            set((state) => ({
              stockAlerts: [...state.stockAlerts, alert]
            }))
          }
          
          // Check for expiry dates
          if (item.expiryDate) {
            const expiryDate = new Date(item.expiryDate)
            const today = new Date()
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            
            if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
              const alert: StockAlert = {
                id: `alert_${Date.now()}_exp`,
                inventoryItemId: itemId,
                itemName: item.name,
                sku: item.sku,
                type: 'expiring',
                message: `Expiry alert: ${item.name} expires in ${daysUntilExpiry} days`,
                severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
                currentStock: item.quantity,
                threshold: 0,
                isRead: false,
                isResolved: false,
                createdAt: new Date().toISOString(),
                createdBy: 'system'
              }
              
              set((state) => ({
                stockAlerts: [...state.stockAlerts, alert]
              }))
            }
          }
        } else {
          // Check all items
          inventoryItems.forEach(item => {
            if (item.isActive) {
              get().checkStockAlerts(item.id)
            }
          })
        }
      },

      dismissAlert: (alertId: string) => {
        set((state) => ({
          stockAlerts: state.stockAlerts.map(alert =>
            alert.id === alertId 
              ? { ...alert, status: 'dismissed', dismissedAt: new Date().toISOString() }
              : alert
          )
        }))
      },

      dismissStockAlert: (alertId) => {
        set((state) => ({
          stockAlerts: state.stockAlerts.map(alert =>
            alert.id === alertId
              ? { ...alert, isResolved: true, resolvedAt: new Date().toISOString() }
              : alert
          )
        }))
      },

      // Stock operations
      performStockOperation: async (operationData) => {
        for (const item of operationData.items) {
          const { inventoryItems } = get()
          const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId)
          if (!inventoryItem) {
            console.error(`Inventory item not found: ${item.inventoryItemId}`)
            continue
          }
          
          switch (operationData.operationType) {
            case 'stock_in':
              await get().receiveStock(item.inventoryItemId, item.quantity, item.unitCost || 0, operationData.referenceId || '', item.batchNumber, item.expiryDate)
              break
            case 'stock_out':
              await get().issueStock(item.inventoryItemId, item.quantity, operationData.reason, operationData.referenceId || '', 'system')
              break
            case 'transfer':
              if (operationData.fromLocation && operationData.toLocation) {
                const transferData: StockTransferFormData = {
                  fromLocation: operationData.fromLocation || '',
                  toLocation: operationData.toLocation || '',
                  items: [{
                    inventoryItemId: item.inventoryItemId,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    notes: item.notes
                  }],
                  reason: operationData.reason,
                  referenceNumber: operationData.referenceNumber
                }
                await get().transferStock(transferData)
              }
              break
            case 'adjustment':
              await get().adjustStock(item.inventoryItemId, item.quantity, operationData.reason, operationData.referenceId)
              break
          }
        }
      },

      // Audit functions
      getAuditHistory: (itemId) => {
        const { audits } = get()
        return audits.filter(audit => 
          audit.scope?.items?.includes(itemId) || 
          audit.findings?.some(finding => finding.itemId === itemId)
        ).sort((a, b) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )
      },

      // Missing functions that interface expects
      getFilteredAndSortedItems: () => {
        const { inventoryItems, filters, sort } = get()
        
        console.log('=== FILTER DEBUG START ===')
        console.log('Total inventory items:', inventoryItems.length)
        console.log('Filters applied:', filters)
        console.log('Sort applied:', sort)

        const resolveStatus = (item: InventoryItem) => {
          if (item.status) return item.status
          if (item.quantity === 0) return 'out_of_stock'
          if (item.quantity <= item.minimumStock) return 'low_stock'
          return 'active'
        }
        
        // Apply filters
        const filtered = inventoryItems.filter(item => {
          const statusValue = resolveStatus(item)
          console.log('Checking item:', item.name, 'ID:', item.id, 'Status:', statusValue)
          
          if (filters.searchTerm && !item.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) && 
              !item.sku.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
            console.log('Filtered out by search term:', filters.searchTerm)
            return false
          }
          if (filters.category?.length && !filters.category.includes(item.category)) {
            console.log('Filtered out by category:', item.category, 'not in', filters.category)
            return false
          }
          if (filters.supplier?.length && !filters.supplier.includes(item.supplierId)) {
            console.log('Filtered out by supplier:', item.supplierId, 'not in', filters.supplier)
            return false
          }
          if (filters.location?.length && !filters.location.includes(item.location)) {
            console.log('Filtered out by location:', item.location, 'not in', filters.location)
            return false
          }
          if (filters.status?.length && !filters.status.includes(statusValue)) {
            console.log('Filtered out by status:', statusValue, 'not in', filters.status)
            return false
          }
          if (filters.stockLevel && filters.stockLevel !== 'all') {
            if (filters.stockLevel === 'in_stock' && item.quantity <= 0) {
              console.log('Filtered out by stock level: in_stock but quantity <= 0')
              return false
            }
            if (filters.stockLevel === 'low_stock' && item.quantity > item.minimumStock) {
              console.log('Filtered out by stock level: low_stock but quantity > minimumStock')
              return false
            }
            if (filters.stockLevel === 'out_of_stock' && item.quantity > 0) {
              console.log('Filtered out by stock level: out_of_stock but quantity > 0')
              return false
            }
            if (filters.stockLevel === 'overstock' && item.quantity <= item.maximumStock) {
              console.log('Filtered out by stock level: overstock but quantity <= maximumStock')
              return false
            }
          }
          console.log('Item passed all filters:', item.name)
          return true
        })
        
        console.log('Items after filtering:', filtered.length)
        console.log('=== FILTER DEBUG END ===')
        
        // Apply sorting
        return filtered.sort((a, b) => {
          const field = sort.field
          const direction = sort.direction === 'asc' ? 1 : -1
          
          if (field === 'name') return a.name.localeCompare(b.name) * direction
          if (field === 'sku') return a.sku.localeCompare(b.sku) * direction
          if (field === 'category') return a.category.localeCompare(b.category) * direction
          if (field === 'quantity') return (a.quantity - b.quantity) * direction
          if (field === 'unitCost') return (a.unitCost - b.unitCost) * direction
          if (field === 'sellingPrice') return (a.sellingPrice - b.sellingPrice) * direction
          if (field === 'supplier') return (a.supplierName || '').localeCompare(b.supplierName || '') * direction
          if (field === 'location') return a.location.localeCompare(b.location) * direction
          if (field === 'status') return resolveStatus(a).localeCompare(resolveStatus(b)) * direction
          if (field === 'lastUpdated') return (new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()) * direction
          
          return 0
        })
      },

      getWhereUsed: (itemId) => {
        const { stockMovements } = get()
        return stockMovements.filter(movement => 
          movement.inventoryItemId === itemId && 
          movement.referenceType === 'job_order' &&
          movement.jobOrderId
        )
      },

      lookupByBarcode: (barcode) => {
        const { inventoryItems } = get()
        return inventoryItems.find(item => item.barcode === barcode)
      },

      resolveAlert: (alertId) => {
        set((state) => ({
          stockAlerts: state.stockAlerts.map(alert =>
            alert.id === alertId
              ? { ...alert, isResolved: true, resolvedAt: new Date().toISOString() }
              : alert
          )
        }))
      }
    }),
    {
      name: 'garage-inventory-storage',
      partialize: (state) => ({
        // Persist only critical data, not UI state
        inventoryItems: state.inventoryItems,
        suppliers: state.suppliers,
        purchaseOrders: state.purchaseOrders,
        stockMovements: state.stockMovements.slice(-1000), // Keep last 1000 movements
        stockAlerts: state.stockAlerts,
        locations: state.locations,
        stockTransfers: state.stockTransfers,
        audits: state.audits.slice(-100), // Keep last 100 audits
        returnOrders: state.returnOrders,
        supplierInvoices: state.supplierInvoices,
        // Don't persist UI state
        filters: {
          searchTerm: '',
          stockLevel: 'all',
          status: ['active', 'low_stock', 'out_of_stock'], // Show all items by default
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
        error: null
      }),
      onRehydrateStorage: () => (state) => {
        // Validate and migrate data when rehydrating
        if (state) {
          const validatedData = validateInventoryData(state)
          Object.assign(state, validatedData)
          ;(state as any).hydrated = true
          
          // Fetch supplier invoices from backend
          if (!(typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') && state.fetchSupplierInvoices) {
            state.fetchSupplierInvoices().catch(() => {})
          }
        }
      },
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Handle migration from version 0 to 1
          const state = typeof persistedState === 'object' && persistedState !== null ? persistedState : {}
          const validatedData = validateInventoryData(state as any)
          return {
            ...state,
            ...validatedData
          }
        }
        return persistedState
      }
    }
  )
)
