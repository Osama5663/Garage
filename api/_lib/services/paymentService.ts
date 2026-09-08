import { AppError } from '../utils/errors';
import {
  createPaymentMaria,
  getPaymentByIdMaria,
  getPaymentMethodByIdMaria,
  updatePaymentMaria,
  upsertAllocationsMaria,
} from '../repositories/paymentsRepo.js'

export interface PaymentData {
  party_type: 'client' | 'supplier';
  party_id: string;
  invoice_id?: string;
  amount: number;
  currency?: string;
  payment_method_id: string;
  payment_date: string;
  payment_number?: string;
  reference?: string;
  notes?: string;
  status?: 'pending' | 'completed' | 'cancelled' | 'refunded';
  created_by: string;
}

export interface PaymentAllocationData {
  invoice_id: string;
  allocated_amount: number;
}

export interface PaymentUpdateData {
  amount?: number;
  payment_method_id?: string;
  payment_date?: string;
  reference?: string;
  notes?: string;
  status?: 'pending' | 'completed' | 'cancelled' | 'refunded';
}

class PaymentService {
  async generatePaymentNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAY${dateStr}-${random}`;
  }

  async createPayment(paymentData: PaymentData): Promise<any> {
    if (!paymentData.party_type || !paymentData.party_id || !paymentData.amount || !paymentData.payment_method_id) {
      throw new AppError('Missing required payment fields', 400);
    }
    if (paymentData.amount <= 0) {
      throw new AppError('Payment amount must be greater than 0', 400);
    }
    const method = await getPaymentMethodByIdMaria(String(paymentData.payment_method_id))
    if (!method || !method.is_active) {
      throw new AppError('Payment method not found', 404)
    }
    const payment_number = paymentData.payment_number || await this.generatePaymentNumber();
    const doc = await createPaymentMaria({
      ...paymentData,
      payment_number,
      currency: paymentData.currency || 'EUR',
      payment_date: paymentData.payment_date,
      status: paymentData.status || 'completed',
      payment_method: method,
    })
    return doc as any
  }

  async updatePayment(paymentId: string, updateData: PaymentUpdateData, userId: string): Promise<any> {
    const existing: any = await getPaymentByIdMaria(paymentId)
    if (!existing) {
      throw new AppError('Payment not found', 404)
    }
    if (existing.status === 'cancelled') {
      throw new AppError('Cannot update cancelled payment', 400)
    }
    if (String(existing.created_by) !== String(userId)) {
      throw new AppError('Insufficient permissions to update this payment', 403)
    }
    const updated: any = { ...existing, ...updateData, updated_at: new Date().toISOString() }
    if (updateData.payment_method_id) {
      const method = await getPaymentMethodByIdMaria(String(updateData.payment_method_id))
      if (!method || !method.is_active) throw new AppError('Payment method not found', 404)
      updated.payment_method = method
    }
    const saved = await updatePaymentMaria(paymentId, updated)
    return saved as any
  }

  async cancelPayment(paymentId: string, userId: string): Promise<any> {
    const existing: any = await getPaymentByIdMaria(paymentId)
    if (!existing) throw new AppError('Payment not found', 404)
    if (String(existing.created_by) !== String(userId)) {
      throw new AppError('Insufficient permissions to cancel this payment', 403)
    }
    const saved = await updatePaymentMaria(paymentId, { ...existing, status: 'cancelled', updated_at: new Date().toISOString() })
    return saved as any
  }

  async allocatePayment(paymentId: string, allocations: PaymentAllocationData[], userId: string): Promise<any[]> {
    const payment: any = await getPaymentByIdMaria(paymentId)
    if (!payment) throw new AppError('Payment not found', 404)
    if (String(payment.created_by) !== String(userId)) {
      throw new AppError('Insufficient permissions to allocate this payment', 403)
    }
    if (!allocations || allocations.length === 0) {
      throw new AppError('No allocations provided', 400)
    }
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0)
    if (Math.abs(totalAllocated - payment.amount) > 0.01) {
      throw new AppError('Total allocated amount must equal payment amount', 400)
    }
    const inserted = await upsertAllocationsMaria(paymentId, allocations)
    return inserted as any
  }

  async getInvoiceBalance(invoiceId: string): Promise<number> {
    void invoiceId
    return 0
  }

  async getPartyBalance(partyType: 'client' | 'supplier', partyId: string): Promise<number> {
    void partyType
    void partyId
    return 0
  }

  async getOutstandingInvoices(partyType: 'client' | 'supplier', partyId: string) {
    void partyType
    void partyId
    return []
  }
}

export const paymentService = new PaymentService();
