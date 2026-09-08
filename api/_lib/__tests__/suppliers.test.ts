import request from 'supertest'
import { describe, it, expect, vi, beforeAll } from 'vitest'

type Supplier = {
  _id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  paymentTerms: string
  category?: string
  rating?: number
  tax?: { type: string; value: string }
}

const db = new Map<string, Supplier>()

vi.mock('../services/userActionService', () => ({
  logUserAction: async () => {},
}))

vi.mock('../services/supplierService', () => {
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))

  return {
    supplierService: {
      async create(data: any) {
        if (!validateEmail(data.email)) throw new Error('Invalid email')
        const id = `sup-${db.size + 1}`
        const doc: Supplier = {
          _id: id,
          name: data.name,
          contactPerson: data.contactPerson,
          email: String(data.email).toLowerCase(),
          phone: data.phone,
          address: data.address,
          city: data.city,
          country: data.country,
          paymentTerms: data.paymentTerms,
          rating: 3,
          category: data.category ?? 'standard',
          tax: data.taxId ? { type: 'taxId', value: data.taxId } : undefined,
        }
        db.set(id, doc)
        return doc
      },
      async update(id: string, data: any) {
        const existing = db.get(id)
        if (!existing) return null
        if (data.email && !validateEmail(data.email)) throw new Error('Invalid email')
        const updated = {
          ...existing,
          ...data,
          email: data.email ? String(data.email).toLowerCase() : existing.email,
        }
        db.set(id, updated as Supplier)
        return updated
      },
      async getById(id: string) {
        return db.get(id) || null
      },
      async list() {
        return Array.from(db.values())
      },
      async delete(id: string) {
        return db.delete(id)
      },
      async classify(id: string, category: string) {
        const existing = db.get(id)
        if (!existing) return null
        const updated = { ...existing, category }
        db.set(id, updated)
        return updated
      },
      async evaluatePerformance() {
        return { rating: 3, qualified: true }
      },
    },
  }
})

let app: any
beforeAll(async () => {
  app = (await import('../app.js')).default
})

const tokenFor = (userId: string) => Buffer.from(`${userId}-test`).toString('base64')
const authHeaderFor = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` })

describe('Suppliers API', () => {
  it('creates supplier with validation', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set(authHeaderFor('1'))
      .send({
        name: 'ACME Parts',
        contactPerson: 'John Doe',
        email: 'john@acme.com',
        phone: '+1 555 123 4567',
        address: '123 Main St',
        city: 'Metropolis',
        country: 'US',
        paymentTerms: 'Net 30',
        taxId: 'TX-123456'
      })
      .expect(201)

    expect(res.body.success).toBe(true)
    expect(res.body.data.name).toBe('ACME Parts')
    expect(res.body.data.tax?.value).toBe('TX-123456')
  })

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set(authHeaderFor('1'))
      .send({
        name: 'Bad Co', contactPerson: 'Jane', email: 'bad', phone: '123456', address: 'x', city: 'y', country: 'z', paymentTerms: 'Net 30'
      })
      .expect(400)
    expect(res.body.success).toBe(false)
  })

  it('updates supplier', async () => {
    const created = await request(app)
      .post('/api/suppliers')
      .set(authHeaderFor('1'))
      .send({
        name: 'Parts Ltd',
        contactPerson: 'Alice',
        email: 'alice@parts.com',
        phone: '+1 333 777',
        address: 'Road 1',
        city: 'City',
        country: 'US',
        paymentTerms: 'Net 30'
      })
      .expect(201)

    const id = created.body.data._id
    const res = await request(app)
      .put(`/api/suppliers/${id}`)
      .set(authHeaderFor('1'))
      .send({ rating: 4, category: 'preferred' })
      .expect(200)

    expect(res.body.data.rating).toBe(4)
    expect(res.body.data.category).toBe('preferred')
  })
})

