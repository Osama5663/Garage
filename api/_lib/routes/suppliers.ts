import { Router } from 'express'
import { supplierService } from '../services/supplierService'
import { authenticateToken, requireRole } from '../middleware/auth'
import { logUserAction } from '../services/userActionService'

const router = Router()

router.use(authenticateToken)

router.get('/', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const { status, category, search } = req.query as any
    const suppliers = await supplierService.list({ status, category, search })
    res.json({ success: true, data: suppliers })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const s = await supplierService.getById(req.params.id)
    if (!s) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: s })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const created = await supplierService.create(req.body, req.user?.id)
    void logUserAction({
      req,
      action: 'SUPPLIER_CREATE',
      result: `Supplier ${created.name || created._id} created successfully`,
    })
    res.status(201).json({ success: true, data: created })
  } catch (error) {
    console.error('Supplier create error:', error)
    void logUserAction({
      req,
      action: 'SUPPLIER_CREATE_ERROR',
      result: `Supplier creation failed: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const updated = await supplierService.update(req.params.id, req.body, req.user?.id)
    if (!updated) {
      res.status(404).json({ success: false, error: 'Supplier not found' })
      return
    }
    void logUserAction({
      req,
      action: 'SUPPLIER_UPDATE',
      result: `Supplier ${updated.name || updated._id} updated successfully`,
    })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Supplier update error:', error)
    void logUserAction({
      req,
      action: 'SUPPLIER_UPDATE_ERROR',
      result: `Supplier update failed for ${req.params.id}: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id', requireRole(['admin']), async (req: any, res) => {
  try {
    const success = await supplierService.delete(req.params.id, req.user?.id)
    if (!success) {
      res.status(404).json({ success: false, error: 'Supplier not found' })
      return
    }
    void logUserAction({
      req,
      action: 'SUPPLIER_DELETE',
      result: `Supplier ${req.params.id} deleted successfully`,
    })
    res.json({ success: true })
  } catch (error) {
    void logUserAction({
      req,
      action: 'SUPPLIER_DELETE_ERROR',
      result: `Supplier deletion failed for ${req.params.id}: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/classify', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const updated = await supplierService.classify(req.params.id, req.body.category, req.user!.id)
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/performance', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const perf = await supplierService.evaluatePerformance(req.params.id)
    res.json({ success: true, data: perf })
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

export default router
