import { Router, Response } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth'
import { logUserAction } from '../services/userActionService'
import {
  countUserActionsMaria,
  deleteUserActionsMaria,
  listUserActionsMaria,
  userActionStatsMaria,
} from '../repositories/userActionsRepo.js'

const router = Router()

router.use(authenticateToken)

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, result } = req.body || {}

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ success: false, error: 'action is required' })
    }

    if (typeof result !== 'undefined' && typeof result !== 'string') {
      return res.status(400).json({ success: false, error: 'result must be a string when provided' })
    }

    await logUserAction({
      req,
      action,
      result: typeof result === 'string' ? result : '',
    })

    return res.status(201).json({ success: true })
  } catch (error) {
    console.error('Error logging user action', error)
    return res.status(500).json({ success: false, error: 'Failed to log user action' })
  }
})

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user } = req
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    const {
      userId,
      action,
      search,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>

    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1)
    const pageSize = Math.min(200, Math.max(1, parseInt(limit || '50', 10) || 50))

    const filter: Record<string, any> = {}

    if (user.role !== 'admin') {
      filter.userId = user.id
      if (userId && userId !== user.id) {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' })
      }
    } else if (userId) {
      filter.userId = userId
    }

    if (action) {
      filter.action = action
    }

    if (startDate || endDate) {
      const range: Record<string, any> = {}
      if (startDate) range.$gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        range.$lte = end
      }
      filter.timestamp = range
    }

    const searchTerm = search && search.trim().length > 0 ? search.trim() : undefined

    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i')
      filter.$or = [{ action: regex }, { username: regex }, { result: regex }]
    }

    const q = {
      userId: filter.userId,
      action: filter.action,
      search: searchTerm,
      startDate: filter.timestamp?.$gte,
      endDate: filter.timestamp?.$lte,
      page: pageNum,
      limit: pageSize,
    }
    const total = await countUserActionsMaria(q)
    const data = await listUserActionsMaria(q)
    return res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    })
  } catch (error) {
    console.error('Error fetching user actions', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch user actions' })
  }
})

router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user } = req
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    const { userId, startDate, endDate } = req.query as Record<string, string>

    const match: Record<string, any> = {}

    if (user.role !== 'admin') {
      match.userId = user.id
    } else if (userId) {
      match.userId = userId
    }

    if (startDate || endDate) {
      const range: Record<string, any> = {}
      if (startDate) range.$gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        range.$lte = end
      }
      match.timestamp = range
    }

    const data = await userActionStatsMaria({
      userId: match.userId,
      startDate: match.timestamp?.$gte,
      endDate: match.timestamp?.$lte,
    })
    return res.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching user action stats', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch user action stats' })
  }
})

router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user } = req
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' })
    }

    const { userId, startDate, endDate } = req.query as Record<string, string>

    const filter: Record<string, any> = {}

    if (userId) {
      filter.userId = userId
    }

    if (startDate || endDate) {
      const range: Record<string, any> = {}
      if (startDate) range.$gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        range.$lte = end
      }
      filter.timestamp = range
    }

    await deleteUserActionsMaria({
      userId: filter.userId,
      startDate: filter.timestamp?.$gte,
      endDate: filter.timestamp?.$lte,
    })
    return res.json({ success: true })
  } catch (error) {
    console.error('Error clearing user actions', error)
    return res.status(500).json({ success: false, error: 'Failed to clear user actions' })
  }
})

export default router
