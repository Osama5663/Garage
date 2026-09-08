import crypto from 'crypto'
import {
  createSupplierMaria,
  deleteSupplierMaria,
  getSupplierByEmailMaria,
  getSupplierByIdMaria,
  listSuppliersMaria,
  supplierAuditLog,
  updateSupplierMaria,
} from '../repositories/suppliersRepo.js'

export type SupplierCategory = 'preferred' | 'standard' | 'temporary' | 'blacklisted'

export interface SupplierCreateData {
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  city: string
  postcode?: string
  country: string
  taxId?: string
  website?: string
  paymentTerms?: string
  currency?: string
  deliveryTime?: number
  minimumOrderValue?: number
  minimumOrder?: number
  category?: SupplierCategory
  notes?: string
  contractStartDate?: string
  contractEndDate?: string
}

export interface SupplierUpdateData extends Partial<SupplierCreateData> {
  isActive?: boolean
  rating?: number
  qualified?: boolean
}

const sanitize = (val: string): string => val.replace(/[<>]/g, '').trim()
const isValidEmail = (email: string) => /.+@.+\..+/.test(email)
const isValidPhone = (phone: string) => typeof phone === 'string' && phone.trim().length >= 6
const isValidPaymentTerms = (terms?: string) => !terms || /(Net\s*\d+|COD|Prepaid|Advance)/i.test(terms)

export class SupplierService {
  async create(data: SupplierCreateData, userId: string): Promise<any> {
    this.validate(data)
    const existingEmail = await getSupplierByEmailMaria(data.email)
    if (existingEmail) throw new Error('Email already exists')
    const now = new Date()
    const doc: any = {
      name: sanitize(data.name),
      contactPerson: sanitize(data.contactPerson),
      email: sanitize(data.email.toLowerCase()),
      phone: sanitize(data.phone),
      address: sanitize(data.address),
      city: sanitize(data.city),
      postcode: data.postcode ? sanitize(data.postcode) : undefined,
      country: sanitize(data.country),
      website: data.website ? sanitize(data.website) : undefined,
      paymentTerms: data.paymentTerms,
      currency: data.currency,
      deliveryTime: data.deliveryTime ?? 0,
      minimumOrderValue: data.minimumOrderValue ?? 0,
      minimumOrder: data.minimumOrder ?? 0,
      category: data.category ?? 'standard',
      isActive: true,
      rating: 3,
      qualified: false,
      contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : undefined,
      contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    }
    if (data.taxId) setTaxId(doc, sanitize(data.taxId))
    const saved = await createSupplierMaria(doc)
    await supplierAuditLog({
      supplierId: saved._id,
      action: 'create',
      performedBy: userId ?? 'system',
      changes: saved,
    })
    return saved
  }

  async update(id: string, data: SupplierUpdateData, userId: string): Promise<any | null> {
    const existing = await getSupplierByIdMaria(id)
    if (!existing) return null

    const updated: any = { ...existing }
    if (data.name) updated.name = sanitize(data.name)
    if (data.contactPerson) updated.contactPerson = sanitize(data.contactPerson)
    if (data.email) updated.email = sanitize(data.email.toLowerCase())
    if (data.phone) updated.phone = sanitize(data.phone)
    if (data.address) updated.address = sanitize(data.address)
    if (data.city) updated.city = sanitize(data.city)
    if (data.postcode) updated.postcode = sanitize(data.postcode)
    if (data.country) updated.country = sanitize(data.country)
    if (data.website) updated.website = sanitize(data.website)
    if (data.paymentTerms !== undefined) updated.paymentTerms = data.paymentTerms
    if (data.currency !== undefined) updated.currency = data.currency
    if (data.deliveryTime !== undefined) updated.deliveryTime = data.deliveryTime
    if (data.minimumOrderValue !== undefined) updated.minimumOrderValue = data.minimumOrderValue
    if (data.minimumOrder !== undefined) updated.minimumOrder = data.minimumOrder
    if (data.category) updated.category = data.category
    if (data.isActive !== undefined) updated.isActive = data.isActive
    if (data.rating !== undefined) updated.rating = Math.min(5, Math.max(0, data.rating))
    if (data.qualified !== undefined) updated.qualified = data.qualified
    if (data.contractStartDate) updated.contractStartDate = new Date(data.contractStartDate)
    if (data.contractEndDate) updated.contractEndDate = new Date(data.contractEndDate)
    if (data.taxId) setTaxId(updated, sanitize(data.taxId))

    this.validate({
      name: updated.name,
      contactPerson: updated.contactPerson,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      city: updated.city,
      country: updated.country,
      paymentTerms: updated.paymentTerms,
    } as any)

    const before = { ...existing }
    updated.updatedAt = new Date()
    const saved = await updateSupplierMaria(id, updated)
    await supplierAuditLog({
      supplierId: id,
      action: 'update',
      performedBy: userId ?? 'system',
      changes: { before, after: saved },
    })
    return saved
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await getSupplierByIdMaria(id)
    if (!existing) return false
    const ok = await deleteSupplierMaria(id)
    if (ok) {
      await supplierAuditLog({ supplierId: id, action: 'delete', performedBy: userId ?? 'system' })
    }
    return ok
  }

  async getById(id: string): Promise<any | null> {
    return getSupplierByIdMaria(id)
  }

  async list(filters?: { status?: 'active' | 'inactive'; category?: SupplierCategory; search?: string }): Promise<any[]> {
    const all = await listSuppliersMaria()
    const search = filters?.search ? String(filters.search).trim().toLowerCase() : ''
    const filtered = all.filter(s => {
      if (filters?.status) {
        const active = filters.status === 'active'
        if (!!s.isActive !== active) return false
      }
      if (filters?.category) {
        if (s.category !== filters.category) return false
      }
      if (search) {
        if (!String(s.name || '').toLowerCase().includes(search)) return false
      }
      return true
    })
    filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    return filtered
  }

  async classify(id: string, category: SupplierCategory, userId: string): Promise<any | null> {
    const s = await getSupplierByIdMaria(id)
    if (!s) return null
    s.category = category
    s.updatedAt = new Date()
    const saved = await updateSupplierMaria(id, s)
    await supplierAuditLog({ supplierId: id, action: 'classify', performedBy: userId ?? 'system', changes: { category } })
    return saved
  }

  async evaluatePerformance(id: string): Promise<{ rating: number; qualified: boolean }> {
    const s = await getSupplierByIdMaria(id)
    if (!s) throw new Error('Supplier not found')
    const base = s.rating ?? 3
    const deliveryScore = Math.max(0, Math.min(2, (s.deliveryTime ?? 0) > 0 ? 2 - Math.min(2, (s.deliveryTime ?? 0) / 30) : 1))
    const orderValueScore = (s.minimumOrderValue ?? 0) > 0 ? 0.5 : 1
    const rating = Math.min(5, Math.max(0, base + deliveryScore + orderValueScore - (s.category === 'blacklisted' ? 2 : 0)))
    const qualified = rating >= 3 && s.isActive && s.category !== 'blacklisted'
    return { rating, qualified }
  }

  enforceContractRules(s: any): void {
    if (s.contractStartDate && s.contractEndDate && s.contractEndDate < s.contractStartDate) {
      throw new Error('Contract end date must be after start date')
    }
    if (s.contractEndDate && s.contractEndDate < new Date()) {
      s.isActive = false
    }
    if (!isValidPaymentTerms(s.paymentTerms)) {
      throw new Error('Invalid payment terms')
    }
  }
  
  validate(data: SupplierCreateData): void {
    if (!data.name || !data.contactPerson || !data.email || !data.phone || !data.address || !data.city || !data.country) {
      throw new Error('Missing required supplier fields')
    }
    if (!isValidEmail(data.email)) throw new Error('Invalid email')
    if (!isValidPhone(data.phone)) throw new Error('Invalid phone')
    if (!isValidPaymentTerms(data.paymentTerms)) throw new Error('Invalid payment terms')
  }
}

export const supplierService = new SupplierService()

const getKey = (): Buffer => {
  const key = process.env.SUPPLIER_ENC_KEY || ''
  if (!key || key.length < 32) {
    return crypto.createHash('sha256').update(key || 'default-key').digest()
  }
  return Buffer.from(key.slice(0, 32))
}

const setTaxId = (doc: any, plain: string) => {
  if (!plain) {
    doc.taxIdEncrypted = undefined
    doc.taxIdIv = undefined
    return
  }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  doc.taxIdEncrypted = Buffer.concat([enc, tag]).toString('base64')
  doc.taxIdIv = iv.toString('base64')
}
