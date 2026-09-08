export interface TVAReport {
  startDate: string
  endDate: string
  periodType: 'month' | 'quarter' | 'year' | 'custom'
  salesSummary: TVASummary
  purchasesSummary: TVASummary
  netTVA: number
  salesInvoices: Invoice[]
  purchaseInvoices: Invoice[]
  anomalies: TVAAnomalies
}

export interface TVASummary {
  totalHT: number
  totalTVA: number
  totalTTC: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  type: 'sales' | 'purchase'
  customerId?: string
  supplierId?: string
  customerName?: string
  supplierName?: string
  totalHT: number
  totalTVA: number
  totalTTC: number
  tvaRate: number
  invoiceDate: string
  status: 'draft' | 'validated' | 'paid' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export interface TVAAnomalies {
  nonStandardRates: number
  negativeTVA: number
  zeroTVA: number
  unusualRatio: number
  totalAnomalies: number
}

export interface PeriodOption {
  value: string
  label: string
  type: 'month' | 'quarter' | 'year' | 'custom'
  startDate: string
  endDate: string
}

export interface TVAAnalytics {
  salesHTEvolution: DataPoint[]
  purchasesHTEvolution: DataPoint[]
  grossMargin: number
  insights: string[]
}

export interface DataPoint {
  date: string
  value: number
}

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  createdAt: string
}

export interface Supplier {
  id: string
  _id?: string
  name: string
  email?: string
  phone?: string
  createdAt: string
}
