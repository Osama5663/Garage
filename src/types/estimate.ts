export interface Estimate {
  id: string
  estimateNumber: string
  customerId: string
  customerName: string
  vehicleId: string
  vehicleInfo: {
    make: string
    model: string
    year: number
    vin: string
    registration: string
  }
  
  // Estimate Details
  issueDate: string
  expiryDate: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  
  // Items and Pricing
  items: EstimateItem[]
  subtotal: number
  vatAmount: number
  totalAmount: number
  
  // Additional Info
  notes: string
  termsAndConditions: string
  
  // Conversion tracking
  convertedToInvoice?: string // invoice ID
  convertedDate?: string
  
  // Job order relation
  jobOrderId?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  
  // Flexible field for custom invoice types (e.g. SNTL)
  customData?: Record<string, any>
}

export interface EstimateItem {
  id: string
  type: 'part' | 'labor' | 'service' | 'other'
  category?: string
  discountRate?: number
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  partNumber?: string
  laborHours?: number
  hourlyRate?: number
  taxRate: number // VAT rate as percentage
  notes?: string
}

export interface EstimateFormData {
  customerId: string
  vehicleId: string
  issueDate: string
  expiryDate: string
  items: EstimateItem[]
  notes: string
  termsAndConditions: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  estimateId?: string // Reference to original estimate
  customerId: string
  customerName: string
  vehicleId: string
  vehicleInfo: {
    make: string
    model: string
    year: number
    vin: string
    registration: string
  }
  
  // Invoice Details
  issueDate: string
  dueDate: string
  status: 'draft' | 'sent' | 'validated' | 'paid' | 'overdue' | 'cancelled'
  
  // Items and Pricing
  items: InvoiceItem[]
  subtotal: number
  vatAmount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  
  // Payment Info
  paymentStatus: 'paid' | 'partial' | 'unpaid'
  amountPaid: number
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other'
  paymentDate?: string
  paymentReference?: string
  paymentHistory?: PaymentRecord[]
  
  // Additional Info
  notes: string
  termsAndConditions: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string

  // Flexible field for custom invoice types (e.g. SNTL)
  customData?: Record<string, any>
}

export interface InvoiceItem {
  id: string
  type: 'part' | 'labor' | 'service' | 'other'
  category?: string
  discountRate?: number
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  partNumber?: string
  laborHours?: number
  hourlyRate?: number
  taxRate: number // VAT rate as percentage
  notes?: string
}

export interface InvoiceFormData {
  estimateId?: string
  customerId: string
  vehicleId: string
  issueDate: string
  dueDate: string
  items: InvoiceItem[]
  notes: string
  termsAndConditions: string
}

export interface PaymentRecord {
  id: string
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other'
  reference: string
  notes?: string
  createdBy: string
  createdAt: string
}

export interface TaxCalculation {
  subtotal: number
  vatRate: number
  vatAmount: number
  totalAmount: number
}

export interface EstimateStats {
  totalEstimates: number
  acceptedEstimates: number
  rejectedEstimates: number
  conversionRate: number
  totalValue: number
  averageValue: number
}

export interface InvoiceStats {
  totalInvoices: number
  paidInvoices: number
  overdueInvoices: number
  totalOutstanding: number
  totalPaid: number
  averageInvoiceValue: number
}
