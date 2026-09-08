import request from 'supertest'
import { describe, it, expect } from 'vitest'
import app from '../app'

describe('API health endpoint', () => {
  it('returns 200 OK with success message', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('message', 'ok')
  })
})
