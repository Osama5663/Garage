import { Router } from 'express'
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth'
import { deleteClientStateValue, getClientStateValue, upsertClientStateValue } from '../repositories/stateRepo.js'

const router = Router()

router.use(authenticateToken)

const parseMaybeJson = (value: any) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const getArrayCount = (obj: any, path: string[]) => {
  let cur = obj
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return null
    cur = (cur as any)[key]
  }
  return Array.isArray(cur) ? cur.length : null
}

const isDangerousOverwrite = (key: string, previous: any, next: any) => {
  const prevParsed = parseMaybeJson(previous)
  const nextParsed = parseMaybeJson(next)

  if (key === 'job-order-storage') {
    const prevCount = getArrayCount(prevParsed, ['state', 'jobOrders'])
    const nextCount = getArrayCount(nextParsed, ['state', 'jobOrders'])
    if (typeof prevCount === 'number' && prevCount > 0 && nextCount === 0) return true
    if (
      typeof prevCount === 'number' &&
      typeof nextCount === 'number' &&
      prevCount >= 50 &&
      nextCount < prevCount
    ) {
      return true
    }
    return false
  }

  if (key === 'garage-customers-storage') {
    const prevCount = getArrayCount(prevParsed, ['state', 'customers'])
    const nextCount = getArrayCount(nextParsed, ['state', 'customers'])
    if (typeof prevCount === 'number' && prevCount > 0 && nextCount === 0) return true
    if (
      typeof prevCount === 'number' &&
      typeof nextCount === 'number' &&
      prevCount >= 50 &&
      nextCount < prevCount
    ) {
      return true
    }
    return false
  }

  if (key === 'garage-estimates-invoices-storage') {
    const prevE = getArrayCount(prevParsed, ['state', 'estimates'])
    const nextE = getArrayCount(nextParsed, ['state', 'estimates'])
    const prevI = getArrayCount(prevParsed, ['state', 'invoices'])
    const nextI = getArrayCount(nextParsed, ['state', 'invoices'])
    const prevAny = (typeof prevE === 'number' && prevE > 0) || (typeof prevI === 'number' && prevI > 0)
    const nextBothZero = (nextE === 0 || nextE === null) && (nextI === 0 || nextI === null)
    if (prevAny && nextBothZero) return true
    if (
      typeof prevE === 'number' &&
      typeof nextE === 'number' &&
      prevE >= 50 &&
      nextE < prevE
    ) {
      return true
    }
    if (
      typeof prevI === 'number' &&
      typeof nextI === 'number' &&
      prevI >= 50 &&
      nextI < prevI
    ) {
      return true
    }
    return false
  }

  return false
}

router.get('/:key', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' })
      return
    }

    const key = req.params.key
    const value = await getClientStateValue(userId, key)
    res.json({ success: true, data: value })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:key', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' })
      return
    }

    const key = req.params.key
    const value = (req.body as any)?.value
    if (value === undefined) {
      res.status(400).json({ success: false, error: 'Missing value' })
      return
    }

    const force = String((req.query as any)?.force || '') === '1'
    if (!force) {
      const previous = await getClientStateValue(userId, key)
      if (previous !== null && isDangerousOverwrite(key, previous, value)) {
        res.status(409).json({
          success: false,
          error: 'Refusing to overwrite non-empty data with empty payload. Use ?force=1 to override.',
        })
        return
      }
    }

    const saved = await upsertClientStateValue(userId, key, value)
    res.json({ success: true, data: saved })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:key', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' })
      return
    }

    const key = req.params.key
    await deleteClientStateValue(userId, key)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
