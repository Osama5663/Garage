import { Router } from 'express'
import { deliveryNoteService } from '../services/deliveryNoteService'
import { authenticateToken, requireRole } from '../middleware/auth'
import { logUserAction } from '../services/userActionService'

const router = Router()

router.use(authenticateToken)

// Get all delivery notes with optional filters
router.get('/', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const { supplier_id, purchase_order_id, status, delivery_date_from, delivery_date_to, search } = req.query as any
    const deliveryNotes = await deliveryNoteService.list({
      supplier_id,
      purchase_order_id,
      status,
      delivery_date_from,
      delivery_date_to,
      search
    })
    res.json({ success: true, data: deliveryNotes })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// Get delivery note by ID
router.get('/:id', requireRole(['admin', 'staff', 'supervisor']), async (req, res) => {
  try {
    const deliveryNote = await deliveryNoteService.getById(req.params.id)
    if (!deliveryNote) return res.status(404).json({ success: false, error: 'Delivery note not found' })
    res.json({ success: true, data: deliveryNote })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// Create new delivery note
router.post('/', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const created = await deliveryNoteService.create(req.body, req.user?.id)
    void logUserAction({
      req,
      action: 'DELIVERY_NOTE_CREATE',
      result: `Delivery note ${created.id} created successfully`,
    })
    res.status(201).json({ success: true, data: created })
  } catch (error) {
    console.error('Delivery note create error:', error)
    void logUserAction({
      req,
      action: 'DELIVERY_NOTE_CREATE_ERROR',
      result: `Delivery note creation failed: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

// Update delivery note
router.put('/:id', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const updated = await deliveryNoteService.update(req.params.id, req.body, req.user?.id)
    if (!updated) {
      res.status(404).json({ success: false, error: 'Delivery note not found' })
      return
    }
    void logUserAction({
      req,
      action: 'DELIVERY_NOTE_UPDATE',
      result: `Delivery note ${updated.id} updated successfully`,
    })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Delivery note update error:', error)
    void logUserAction({
      req,
      action: 'DELIVERY_NOTE_UPDATE_ERROR',
      result: `Delivery note update failed for ${req.params.id}: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

// Delete delivery note
router.delete('/:id', requireRole(['admin']), async (req: any, res) => {
  try {
    const success = await deliveryNoteService.delete(req.params.id, req.user?.id)
    if (!success) {
      res.status(404).json({ success: false, error: 'Delivery note not found' })
      return
    }
    void logUserAction({
      req,
      action: 'DELIVERY_NOTE_DELETE',
      result: `Delivery note ${req.params.id} deleted successfully`,
    })
    res.json({ success: true })
  } catch (error) {
    void logUserAction({
      req,
      action: 'DELIVERY_NOTE_DELETE_ERROR',
      result: `Delivery note deletion failed for ${req.params.id}: ${(error as Error).message}`,
    })
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

// Validate delivery note
router.post('/:id/validate', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const validated = await deliveryNoteService.validateDeliveryNote(req.params.id, req.user?.id)
    if (!validated) return res.status(404).json({ success: false, error: 'Delivery note not found' })
    res.json({ success: true, data: validated })
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

// Cancel delivery note
router.post('/:id/cancel', requireRole(['admin', 'supervisor']), async (req: any, res) => {
  try {
    const cancelled = await deliveryNoteService.cancelDeliveryNote(req.params.id, req.user?.id)
    if (!cancelled) return res.status(404).json({ success: false, error: 'Delivery note not found' })
    res.json({ success: true, data: cancelled })
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

// Get invoicable delivery notes for a supplier
router.get('/suppliers/:supplierId/invoicable', requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const deliveryNotes = await deliveryNoteService.getInvoicableDeliveryNotes(req.params.supplierId)
    res.json({ success: true, data: deliveryNotes })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// Link delivery notes to invoice
router.post('/link-to-invoice', requireRole(['admin', 'staff', 'supervisor']), async (req: any, res) => {
  try {
    const { delivery_note_ids, invoice_id } = req.body
    if (!delivery_note_ids || !Array.isArray(delivery_note_ids) || !invoice_id) {
      return res.status(400).json({ success: false, error: 'delivery_note_ids and invoice_id are required' })
    }
    
    await deliveryNoteService.linkToInvoice(delivery_note_ids, invoice_id)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message })
  }
})

export default router
