import { Router } from 'express'
import { authenticateToken, requireRole, type AuthenticatedRequest } from '../middleware/auth'
import { clearAllClientStateValues } from '../repositories/stateRepo.js'

const router = Router()

router.use(authenticateToken)
router.use(requireRole(['admin']))

router.post('/factory-reset', async (req: AuthenticatedRequest, res) => {
  try {
    const confirm = String((req.body as any)?.confirm || '')
    if (confirm !== 'RESET NOW') {
      res.status(400).json({ success: false, error: 'Invalid confirmation phrase' })
      return
    }

    await clearAllClientStateValues()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
