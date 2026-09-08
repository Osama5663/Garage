import { beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

type Doc = {
  _id: string
  title: string
  header: any
  body: any
  footer: any
  createdAt: string
  updatedAt: string
}

const db = new Map<string, Doc>()

vi.mock('../repositories/documentsRepo.js', () => {
  return {
    listDocuments: async () => Array.from(db.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    getDocumentById: async (id: string) => db.get(id) || null,
    createDocument: async (payload: any) => {
      const id = `doc-${db.size + 1}`
      const now = new Date().toISOString()
      const doc: Doc = { _id: id, createdAt: now, updatedAt: now, ...payload }
      db.set(id, doc)
      return doc
    },
    updateDocument: async (id: string, payload: any) => {
      const existing = db.get(id)
      if (!existing) return null
      const updated = { ...existing, ...payload, updatedAt: new Date().toISOString() }
      db.set(id, updated)
      return updated
    },
    deleteDocument: async (id: string) => db.delete(id),
  }
})

let app: any
beforeAll(async () => {
  app = (await import('../app.js')).default
})

describe('Document API Endpoints', () => {
  it('returns empty array when no documents exist', async () => {
    db.clear()
    const response = await request(app)
      .get('/api/documents')
      .expect(200)

    expect(response.body).toEqual({
      success: true,
      data: []
    })
  })

  it('creates and fetches a document', async () => {
    db.clear()
    const created = await request(app)
      .post('/api/documents')
      .send({
        title: 'Test Document',
        header: { content: 'Header content', alignment: 'left' },
        body: { content: 'Body content', alignment: 'left', images: [] },
        footer: { content: 'Footer content', alignment: 'left' }
      })
      .expect(201)

    const id = created.body.data._id
    const fetched = await request(app)
      .get(`/api/documents/${id}`)
      .expect(200)

    expect(fetched.body.success).toBe(true)
    expect(fetched.body.data.title).toBe('Test Document')
  })
})

