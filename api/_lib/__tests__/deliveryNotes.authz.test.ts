import request from 'supertest'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { deliveryNoteService } from '../services/deliveryNoteService'

const tokenFor = (userId: string) => Buffer.from(`${userId}-test`).toString('base64')
const authHeaderFor = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` })

vi.mock('../services/deliveryNoteService', async (importOriginal) => {
  const mod = await importOriginal<any>()
  return {
    ...mod,
    deliveryNoteService: {
      ...(mod.deliveryNoteService || {}),
      create: vi.fn(async () => ({ id: 'dn-1' })),
    },
  }
})

let app: any
beforeAll(async () => {
  app = (await import('../app.js')).default
})

describe('Delivery notes authz', () => {
  it('rejects create without token', async () => {
    const res = await request(app)
      .post('/api/delivery-notes')
      .send({})
    expect(res.status).toBe(401)
  })

  it('rejects create for non-admin/supervisor', async () => {
    const res = await request(app)
      .post('/api/delivery-notes')
      .set(authHeaderFor('2'))
      .send({})
    expect(res.status).toBe(403)
  })

  it('allows create for admin', async () => {
    const dnRes = await request(app)
      .post('/api/delivery-notes')
      .set(authHeaderFor('1'))
      .send({})
      .expect(201)

    expect(dnRes.body.success).toBe(true)
    expect((deliveryNoteService as any).create).toHaveBeenCalled()
    expect(dnRes.body.data).toBeTruthy()
  })
})
