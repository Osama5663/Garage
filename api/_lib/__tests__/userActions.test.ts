import request from 'supertest'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

type Action = {
  userId: string
  username: string
  action: string
  result: string
  timestamp: string
}

let currentAuth = { id: '1', email: 'admin@example.com', role: 'admin' as const }
const actions: Action[] = []

vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = currentAuth
    next()
  },
  requireRole: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}))

vi.mock('../repositories/userActionsRepo.js', () => ({
  countUserActionsMaria: async () => actions.length,
  listUserActionsMaria: async () => actions.slice().reverse(),
  userActionStatsMaria: async () => ({
    actionsByType: [],
    actionsByDay: [],
    topUsers: [],
  }),
  deleteUserActionsMaria: async () => {
    actions.splice(0, actions.length)
  },
  insertUserActionMaria: async (row: any) => {
    actions.push({
      userId: row.userId,
      username: row.username,
      action: row.action,
      result: row.result,
      timestamp: new Date().toISOString(),
    })
  },
}))

vi.mock('../services/userActionService', async (importOriginal) => {
  const mod = await importOriginal<any>()
  return {
    ...mod,
    logUserAction: async ({ req, action, result }: any) => {
      const user = req.user
      actions.push({
        userId: user.id,
        username: user.email,
        action,
        result: result || '',
        timestamp: new Date().toISOString(),
      })
    },
  }
})

let app: any
beforeAll(async () => {
  app = (await import('../app.js')).default
})

beforeEach(() => {
  actions.splice(0, actions.length)
  currentAuth = { id: '1', email: 'admin@example.com', role: 'admin' }
})

describe('User actions API', () => {
  it('logs a user action via POST', async () => {
    const res = await request(app)
      .post('/api/user-actions')
      .set('Authorization', 'Bearer test_token')
      .send({ action: 'USER_LOGIN', result: 'ok' })
      .expect(201)

    expect(res.body.success).toBe(true)
    expect(actions).toHaveLength(1)
    expect(actions[0].action).toBe('USER_LOGIN')
  })

  it('returns actions list', async () => {
    await request(app)
      .post('/api/user-actions')
      .set('Authorization', 'Bearer test_token')
      .send({ action: 'A', result: 'r' })
      .expect(201)

    const res = await request(app)
      .get('/api/user-actions')
      .set('Authorization', 'Bearer test_token')
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

