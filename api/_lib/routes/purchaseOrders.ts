import { Router } from 'express'
import { purchaseOrderService } from '../services/purchaseOrderService'
import { authenticateToken, requireRole } from '../middleware/auth'
import { logUserAction } from '../services/userActionService'

const router = Router()

router.use(authenticateToken)

// Get all purchase orders with optional filters
router.get('/', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const { supplier_id, status, order_date_from, order_date_to, search } = req.query as any
    const purchaseOrders = await purchaseOrderService.list({
      supplier_id,
      status,
      order_date_from,
      order_date_to,
      search
    })
    res.json({ success: true, data: purchaseOrders })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// Get purchase order by ID
router.get('/:id', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const purchaseOrder = await purchaseOrderService.getById(req.params.id)
    if (!purchaseOrder) return res.status(404).json({ success: false, error: 'Purchase order not found' })
    res.json({ success: true, data: purchaseOrder })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// Create new purchase order
router.post('/', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const created = await purchaseOrderService.create(req.body, req.user?.id)
    void logUserAction({
      req,
      action: 'PURCHASE_ORDER_CREATE',
      result: `Purchase order ${created.id} created successfully`,
    })
    res.status(201).json({ success: true, data: created })
  } catch (error) {
    console.error('Purchase order create error:', error)
    void logUserAction({
      req,
      action: 'PURCHASE_ORDER_CREATE_ERROR',
      result: `Purchase order creation failed: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

// Update purchase order
router.put('/:id', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const updated = await purchaseOrderService.update(req.params.id, req.body, req.user?.id)
    if (!updated) {
      res.status(404).json({ success: false, error: 'Purchase order not found' })
      return
    }
    void logUserAction({
      req,
      action: 'PURCHASE_ORDER_UPDATE',
      result: `Purchase order ${updated.id} updated successfully`,
    })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Purchase order update error:', error)
    void logUserAction({
      req,
      action: 'PURCHASE_ORDER_UPDATE_ERROR',
      result: `Purchase order update failed for ${req.params.id}: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

// Delete purchase order
router.delete('/:id', requireRole(['admin']), async (req: any, res) => {
  const id = req.params.id
  try {
    const success = await purchaseOrderService.delete(id, req.user?.id)
    if (!success) {
      res.status(404).json({ success: false, error: 'Purchase order not found' })
      return
    }
    void logUserAction({
      req,
      action: 'PURCHASE_ORDER_DELETE',
      result: `Purchase order ${id} deleted successfully`,
    })
    res.json({ success: true })
  } catch (error) {
    const message = (error as Error).message
    void logUserAction({
      req,
      action: 'PURCHASE_ORDER_DELETE_ERROR',
      result: `Purchase order deletion failed for ${id}: ${message}`,
    })
    const statusCode = message === 'Cannot delete purchase order with received items' ? 409 : 400
    res.status(statusCode).json({ success: false, error: message })
  }
})

// Get purchase orders by supplier
router.get('/suppliers/:supplierId', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const purchaseOrders = await purchaseOrderService.getBySupplierId(req.params.supplierId)
    res.json({ success: true, data: purchaseOrders })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
