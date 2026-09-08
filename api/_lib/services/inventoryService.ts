import { getSupplierByIdMaria } from '../repositories/suppliersRepo.js'
import {
  createInventoryItemMaria,
  createStockMovementMaria,
  deleteInventoryItemMaria,
  getInventoryItemByIdMaria,
  getInventoryItemBySkuMaria,
  listInventoryItemsMaria,
  listStockMovementsMaria,
  updateInventoryItemMaria,
} from '../repositories/inventoryRepo.js'

export interface InventoryItemCreateData {
  sku: string
  name: string
  description?: string
  category?: string
  quantity?: number
  unit?: string
  minimumStock?: number
  maximumStock?: number
  reorderPoint?: number
  location?: string
  locationDetails?: {
    rack?: string
    shelf?: string
    bin?: string
    zone?: string
  }
  supplierId: string
  supplierName?: string
  supplierSku?: string
  supplierPartNumber?: string
  unitCost?: number
  sellingPrice?: number
  taxRate?: number
  markupPercentage?: number
  manufacturer?: string
  manufacturerPartNumber?: string
  manufacturerWarrantyMonths?: number
  barcode?: string
  imageUrl?: string
  expiryDate?: string
  notes?: string
  specifications?: string
  compatibility?: string[]
  safetyInfo?: string
  storageRequirements?: string
  isActive?: boolean
  isTaxable?: boolean
  isTrackable?: boolean
}

export interface InventoryItemUpdateData extends Partial<InventoryItemCreateData> {
  status?: string
}

const sanitize = (val: string): string => val.replace(/[<>]/g, '').trim()

export class InventoryService {
  async create(data: InventoryItemCreateData, userId: string): Promise<any> {
    this.validate(data)

    let supplierName = data.supplierName

    const existingSku = await getInventoryItemBySkuMaria(data.sku)
    if (existingSku) throw new Error('SKU already exists')

    if (!supplierName && data.supplierId) {
      const s = await getSupplierByIdMaria(data.supplierId)
      if (s?.name) supplierName = s.name
    }

    const now = new Date()
    const quantity = data.quantity ?? 0
    const minimumStock = data.minimumStock ?? 0
    const status = (data as any).status ?? (quantity === 0 ? 'out_of_stock' : quantity <= minimumStock ? 'low_stock' : 'active')
    const doc: any = {
      ...data,
      quantity,
      minimumStock,
      status,
      isActive: data.isActive ?? true,
      isTaxable: data.isTaxable ?? true,
      isTrackable: data.isTrackable ?? true,
      sku: sanitize(data.sku),
      name: sanitize(data.name),
      description: data.description ? sanitize(data.description) : undefined,
      supplierName,
      createdBy: userId || 'system',
      updatedBy: userId || 'system',
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
    }

    const saved = await createInventoryItemMaria(doc)

    if ((saved.quantity ?? 0) > 0) {
      await this.logMovement({
        inventoryItemId: saved._id,
        itemName: saved.name,
        sku: saved.sku,
        type: 'receive',
        quantity: saved.quantity,
        previousQuantity: 0,
        newQuantity: saved.quantity,
        reason: 'Initial stock',
        createdBy: userId || 'system',
      })
    }

    return saved
  }

  async update(id: string, data: InventoryItemUpdateData, userId: string): Promise<any | null> {
    const existing = await getInventoryItemByIdMaria(id)
    if (!existing) return null

    const oldQuantity = existing.quantity ?? 0
    const newQuantity = data.quantity !== undefined ? data.quantity : oldQuantity

    let supplierName = data.supplierName ?? existing.supplierName
    if (data.supplierId && !data.supplierName) {
      const s = await getSupplierByIdMaria(data.supplierId)
      if (s?.name) supplierName = s.name
    }

    const updated: any = { ...existing }
    Object.keys(data).forEach(key => {
      if ((data as any)[key] !== undefined) {
        (updated as any)[key] = (data as any)[key]
      }
    })
    if (supplierName) updated.supplierName = supplierName
    updated.updatedBy = userId || 'system'
    updated.lastUpdated = new Date()
    updated.updatedAt = new Date()
    if (updated.sku) updated.sku = sanitize(String(updated.sku))
    if (updated.name) updated.name = sanitize(String(updated.name))
    if (updated.description) updated.description = sanitize(String(updated.description))

    const saved = await updateInventoryItemMaria(id, updated)

    if (newQuantity !== oldQuantity) {
      await this.logMovement({
        inventoryItemId: saved._id,
        itemName: saved.name,
        sku: saved.sku,
        type: newQuantity > oldQuantity ? 'receive' : 'issue',
        quantity: newQuantity - oldQuantity,
        previousQuantity: oldQuantity,
        newQuantity: newQuantity,
        reason: data.notes || 'Stock update',
        createdBy: userId || 'system',
      })
    }

    return saved
  }

  async logMovement(data: any): Promise<any> {
    return (await createStockMovementMaria({ ...data, movementDate: new Date() })) as any
  }

  async getMovements(filters: any = {}): Promise<any[]> {
    return (await listStockMovementsMaria(filters)) as any
  }

  async getInventorySummary(limit: number = 5) {
    const items: any[] = await listInventoryItemsMaria({})
    const sorted = items
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.lastUpdated || 0).getTime() - new Date(a.updatedAt || a.lastUpdated || 0).getTime())
    const sample = sorted.slice(0, limit).map((doc) => ({
      id: String(doc._id || doc.id),
      sku: doc.sku,
      name: doc.name,
      quantity: doc.quantity,
    }))
    const totalItems = items.length
    return { totalItems, sample }
  }

  async delete(id: string): Promise<boolean> {
    return await deleteInventoryItemMaria(id)
  }

  async getById(id: string): Promise<any | null> {
    return (await getInventoryItemByIdMaria(id)) as any
  }

  async list(filters: any = {}): Promise<any[]> {
    return (await listInventoryItemsMaria(filters)) as any
  }

  async verifyAndLogInventoryOnStartup(): Promise<void> {
    try {
      const items = await listInventoryItemsMaria({})
      console.log(`[Inventory Startup] Inventory items loaded from database: ${items.length}`)
    } catch (error) {
      console.error('[Inventory Startup] Failed to verify inventory items on startup', error)
      throw error
    }
  }

  private validate(data: InventoryItemCreateData) {
    if (!data.sku || data.sku.trim().length === 0) {
      throw new Error('SKU is required')
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Name is required')
    }
    if (!data.supplierId) {
      throw new Error('Supplier ID is required')
    }
  }
}

export const inventoryService = new InventoryService()
