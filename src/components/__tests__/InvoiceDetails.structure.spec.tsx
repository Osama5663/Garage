import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useEstimateInvoiceStore } from '../../stores/estimateInvoiceStore'
import { InvoiceDetails } from '../InvoiceDetails'

describe('InvoiceDetails structure and accessibility', () => {
  it('renders items table with correct columns and totals', () => {
    const invoice = {
      id: 'inv_test_1',
      invoiceNumber: 'INV-TEST-001',
      customerId: 'cust_1',
      customerName: 'John Smith',
      vehicleId: 'VIN123',
      vehicleInfo: { make: 'Toyota', model: 'Camry', year: 2020, vin: 'VIN123', registration: 'ABC123' },
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      status: 'sent',
      items: [
        { id: 'i1', type: 'part', description: 'Battery', quantity: 1, unitPrice: 129.99, totalPrice: 129.99, taxRate: 0.2 },
        { id: 'i2', type: 'labor', description: 'liquide', quantity: 1, unitPrice: 85.0, totalPrice: 85.0, taxRate: 0.2 }
      ],
      subtotal: 214.99,
      vatAmount: 43.0,
      totalAmount: 257.99,
      paidAmount: 0,
      remainingAmount: 257.99,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      notes: '',
      termsAndConditions: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'System'
    } as any

    useEstimateInvoiceStore.setState({ invoices: [invoice] })

    render(
      <MemoryRouter>
        <InvoiceDetails invoiceId={invoice.id} />
      </MemoryRouter>
    )

    // Items table accessibility
    const itemsTable = screen.getByRole('table', { name: /invoice items/i })
    expect(itemsTable).toBeInTheDocument()

    // Column headers (scoped to items table)
    const { getByText } = require('@testing-library/dom').within(itemsTable)
    expect(getByText(/Type/i)).toBeTruthy()
    expect(getByText(/Description/i)).toBeTruthy()
    expect(getByText(/Unit Price/i)).toBeTruthy()
    expect(getByText(/Total/i)).toBeTruthy()

    // Totals labels present (values verified elsewhere)
    expect(screen.getByText(/Subtotal:/i)).toBeInTheDocument()
    expect(screen.getByText(/VAT \(20%\):/i)).toBeInTheDocument()
    expect(screen.getByText(/^Total:/i)).toBeInTheDocument()
  })
})
