import { Router } from 'express'
import { inventoryService } from '../services/inventoryService'
import { authenticateToken, requireRole } from '../middleware/auth'
import { logUserAction } from '../services/userActionService'

const router = Router()

router.use(authenticateToken)

router.get('/', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const items = await inventoryService.list(req.query)
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/movements', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const movements = await inventoryService.getMovements(req.query)
    res.json({ success: true, data: movements })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const item = await inventoryService.getById(req.params.id)
    if (!item) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: item })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/movements', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const movements = await inventoryService.getMovements({ inventoryItemId: req.params.id })
    res.json({ success: true, data: movements })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    console.log('[Inventory Route] POST / request body:', JSON.stringify(req.body, null, 2))
    console.log('[Inventory Route] User from token:', req.user)
    const created = await inventoryService.create(req.body, req.user?.id)
    console.log('[Inventory Route] Created item:', created._id)
    void logUserAction({
      req,
      action: 'INVENTORY_CREATE',
      result: `Inventory item ${created.name} (${created.sku}) created successfully`,
    })
    res.status(201).json({ success: true, data: created })
  } catch (error) {
    console.error('Inventory create error:', error)
    void logUserAction({
      req,
      action: 'INVENTORY_CREATE_ERROR',
      result: `Inventory item creation failed: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const updated = await inventoryService.update(req.params.id, req.body, req.user?.id)
    if (!updated) {
      res.status(404).json({ success: false, error: 'Inventory item not found' })
      return
    }
    void logUserAction({
      req,
      action: 'INVENTORY_UPDATE',
      result: `Inventory item ${updated.name} updated successfully`,
    })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Inventory update error:', error)
    void logUserAction({
      req,
      action: 'INVENTORY_UPDATE_ERROR',
      result: `Inventory item update failed for ${req.params.id}: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id', requireRole(['admin']), async (req: any, res) => {
  try {
    const success = await inventoryService.delete(req.params.id)
    if (!success) {
      res.status(404).json({ success: false, error: 'Inventory item not found' })
      return
    }
    void logUserAction({
      req,
      action: 'INVENTORY_DELETE',
      result: `Inventory item ${req.params.id} deleted successfully`,
    })
    res.json({ success: true })
  } catch (error) {
    void logUserAction({
      req,
      action: 'INVENTORY_DELETE_ERROR',
      result: `Inventory item deletion failed for ${req.params.id}: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

export default router
