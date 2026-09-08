import { Router, Request, Response } from 'express';
import {
  createSupplierInvoiceMaria,
  deleteSupplierInvoiceMaria,
  getSupplierInvoiceByIdMaria,
  listSupplierInvoicesMaria,
  populateSupplierInvoiceMaria,
  unlinkDeliveryNotesForInvoiceMaria,
  upsertSupplierInvoiceMaria,
} from '../repositories/supplierInvoicesRepo.js'

const router = Router();

// Create a new supplier invoice
router.post('/', async (req: Request, res: Response) => {
  try {
    const created = await createSupplierInvoiceMaria(req.body)
    const populated = await populateSupplierInvoiceMaria(created)
    res.status(201).json(populated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
    res.status(400).json({ message });
  }
});

// Get all supplier invoices
router.get('/', async (_req: Request, res: Response) => {
  try {
    const invoices = await listSupplierInvoicesMaria()
    const populated = []
    for (const inv of invoices) {
      populated.push(await populateSupplierInvoiceMaria(inv))
    }
    res.json(populated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
    res.status(500).json({ message });
  }
});

// Get a single supplier invoice by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await getSupplierInvoiceByIdMaria(req.params.id)
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' })
    const populated = await populateSupplierInvoiceMaria(invoice)
    res.json(populated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoice';
    res.status(500).json({ message });
  }
});

// Update a supplier invoice
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await getSupplierInvoiceByIdMaria(req.params.id)
    if (!existing) return res.status(404).json({ message: 'Invoice not found' })
    const updated = await upsertSupplierInvoiceMaria(req.params.id, { ...existing, ...req.body })
    const populated = await populateSupplierInvoiceMaria(updated)
    res.json(populated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update invoice';
    res.status(400).json({ message });
  }
});

// Delete a supplier invoice
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const inv = await getSupplierInvoiceByIdMaria(req.params.id)
    if (!inv) return res.status(404).json({ message: 'Invoice not found' })
    await deleteSupplierInvoiceMaria(req.params.id)
    const dnIds = Array.isArray(inv.deliveryNotes) ? inv.deliveryNotes.map(String) : []
    await unlinkDeliveryNotesForInvoiceMaria(req.params.id, dnIds)
    res.json({ message: 'Invoice deleted successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete invoice';
    res.status(500).json({ message });
  }
});

export default router;
