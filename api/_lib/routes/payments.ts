import { Router, type Response } from 'express';
import { paymentService } from '../services/paymentService';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import {
  getPaymentByIdMaria,
  getPaymentMethodByIdMaria,
  listPaymentMethodsMaria,
  listPaymentsMaria,
} from '../repositories/paymentsRepo.js'

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all payment methods
router.get('/methods', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const methods = await listPaymentMethodsMaria()
    res.json(methods)
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Get all payments with filters
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      party_type, 
      party_id, 
      invoice_id, 
      status, 
      start_date, 
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    const query: any = {};
    if (party_type) query.party_type = party_type;
    if (party_id) query.party_id = party_id;
    if (invoice_id) query.invoice_id = invoice_id;
    if (status) query.status = status;
    
    if (start_date || end_date) {
        query.payment_date = {};
        if (start_date) query.payment_date.$gte = new Date(start_date as string);
        if (end_date) query.payment_date.$lte = new Date(end_date as string);
    }

    const all = await listPaymentsMaria({
      party_type,
      party_id,
      invoice_id,
      status,
      start_date,
      end_date,
    })
    const total = all.length
    const pageNum = Number(page)
    const pageSize = Number(limit)
    const pageItems = all.slice((pageNum - 1) * pageSize, (pageNum - 1) * pageSize + pageSize)
    for (const p of pageItems) {
      const method = await getPaymentMethodByIdMaria(String(p.payment_method_id))
      if (method) {
        p.payment_method_id = method
      }
    }
    res.json({
      payments: pageItems,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get payment by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payment: any = await getPaymentByIdMaria(id)
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    const method = await getPaymentMethodByIdMaria(String(payment.payment_method_id))
    if (method) payment.payment_method_id = method
    res.json(payment)
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Create new payment
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentData = {
      ...req.body,
      created_by: req.user?.id ?? 'system',
      payment_number: await paymentService.generatePaymentNumber()
    };

    const result = await paymentService.createPayment(paymentData);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payment'
    console.error('Error creating payment:', error);
    res.status(500).json({ error: message });
  }
});

// Update payment
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const result = await paymentService.updatePayment(id, updateData, req.user?.id ?? 'system');
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update payment'
    console.error('Error updating payment:', error);
    res.status(500).json({ error: message });
  }
});

// Delete payment (soft delete by setting status to cancelled)
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await paymentService.cancelPayment(id, req.user?.id ?? 'system');
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel payment'
    console.error('Error cancelling payment:', error);
    res.status(500).json({ error: message });
  }
});

// Get invoice balance
router.get('/invoice/:invoiceId/balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const balance = await paymentService.getInvoiceBalance(invoiceId);
    res.json({ balance });
  } catch (error) {
    console.error('Error calculating invoice balance:', error);
    res.status(500).json({ error: 'Failed to calculate invoice balance' });
  }
});

// Get party balance (client or supplier)
router.get('/party/:partyType/:partyId/balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { partyType, partyId } = req.params;
    const balance = await paymentService.getPartyBalance(partyType as 'client' | 'supplier', partyId);
    res.json({ balance });
  } catch (error) {
    console.error('Error calculating party balance:', error);
    res.status(500).json({ error: 'Failed to calculate party balance' });
  }
});

// Get outstanding invoices for a party
router.get('/party/:partyType/:partyId/outstanding-invoices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { partyType, partyId } = req.params;
    const invoices = await paymentService.getOutstandingInvoices(partyType as 'client' | 'supplier', partyId);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching outstanding invoices:', error);
    res.status(500).json({ error: 'Failed to fetch outstanding invoices' });
  }
});

// Allocate payment to multiple invoices
router.post('/:id/allocate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { allocations } = req.body;
    const result = await paymentService.allocatePayment(id, allocations, req.user?.id ?? 'system');
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to allocate payment'
    console.error('Error allocating payment:', error);
    res.status(500).json({ error: message });
  }
});

export default router;
