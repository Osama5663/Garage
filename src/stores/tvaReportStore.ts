import { create } from 'zustand'
import { TVAReport, Invoice, TVAAnomalies } from '../types/tva'
import { roundCurrency } from '../utils/tva'
import { useEstimateInvoiceStore } from './estimateInvoiceStore'
import { useInventoryStore } from './inventoryStore'

interface TVAReportStore {
  // State
  report: TVAReport | null
  isLoading: boolean
  error: string | null
  
  // Actions
  generateReport: (startDate: string, endDate: string, periodType: 'month' | 'quarter' | 'year' | 'custom') => Promise<void>
  exportToCSV: (type: 'sales' | 'purchases' | 'summary') => void
  exportToPDF: (type: 'sales' | 'purchases' | 'summary') => void
  clearReport: () => void
}

const calculateAnomalies = (invoices: Invoice[]): TVAAnomalies => {
  let nonStandardRates = 0
  let negativeTVA = 0
  let zeroTVA = 0
  let unusualRatio = 0

  invoices.forEach(invoice => {
    // Check for non-standard TVA rates (not 20%)
    if (Math.abs(invoice.tvaRate - 0.20) > 0.001) {
      nonStandardRates++
    }

    // Check for negative TVA
    if (invoice.totalTVA < 0) {
      negativeTVA++
    }

    // Check for zero TVA
    if (invoice.totalTVA === 0) {
      zeroTVA++
    }

    // Check for unusual TVA vs HT ratio (TVA should be around 20% of HT)
    if (invoice.totalHT > 0) {
      const actualRatio = invoice.totalTVA / invoice.totalHT
      if (Math.abs(actualRatio - 0.20) > 0.05) { // More than 5% deviation
        unusualRatio++
      }
    }
  })

  return {
    nonStandardRates,
    negativeTVA,
    zeroTVA,
    unusualRatio,
    totalAnomalies: nonStandardRates + negativeTVA + zeroTVA + unusualRatio
  }
}

export const useTVAReportStore = create<TVAReportStore>((set, get) => ({
  // Initial state
  report: null,
  isLoading: false,
  error: null,

  // Actions
  generateReport: async (startDate: string, endDate: string, periodType: 'month' | 'quarter' | 'year' | 'custom') => {
    set({ isLoading: true, error: null })

    try {
      let salesInvoices: Invoice[] = []
      let purchaseInvoices: Invoice[] = []
      
      // 1. Fetch from Local Stores (Priority)
      const localSales = useEstimateInvoiceStore.getState().invoices
      const localPurchases = useInventoryStore.getState().supplierInvoices

      const filteredLocalSales = localSales
        .filter(inv => {
            const d = inv.issueDate
            // Robust date comparison: check if invoice date string starts with or equals the filter dates
            // This handles cases where d might be "YYYY-MM-DD" or "YYYY-MM-DDT..."
            // We assume startDate and endDate are YYYY-MM-DD
            
            // Extract YYYY-MM-DD part from invoice date if it contains time
            const invDate = d.includes('T') ? d.split('T')[0] : d
            
            const isDateInRange = invDate >= startDate && invDate <= endDate
            
            // Include draft for now as users might not have validated them
            const isValidStatus = inv.status !== 'cancelled'
            
            return isDateInRange && isValidStatus
        })
        .map(mapLocalSalesInvoice)

      const filteredLocalPurchases = localPurchases
        .filter(inv => {
            const d = inv.invoiceDate
            const invDate = d.includes('T') ? d.split('T')[0] : d
            
            const isDateInRange = invDate >= startDate && invDate <= endDate
            const isValidStatus = inv.status !== 'cancelled'
            return isDateInRange && isValidStatus
        })
        .map(mapLocalPurchaseInvoice)
        
      salesInvoices = [...filteredLocalSales]
      purchaseInvoices = [...filteredLocalPurchases]

      // Process data and create report
      const salesSummary = {
        totalHT: salesInvoices.reduce((sum, inv) => sum + inv.totalHT, 0),
        totalTVA: salesInvoices.reduce((sum, inv) => sum + inv.totalTVA, 0),
        totalTTC: salesInvoices.reduce((sum, inv) => sum + inv.totalTTC, 0)
      }

      const purchasesSummary = {
        totalHT: purchaseInvoices.reduce((sum, inv) => sum + inv.totalHT, 0),
        totalTVA: purchaseInvoices.reduce((sum, inv) => sum + inv.totalTVA, 0),
        totalTTC: purchaseInvoices.reduce((sum, inv) => sum + inv.totalTTC, 0)
      }

      const allInvoices = [...salesInvoices, ...purchaseInvoices]
      const anomalies = calculateAnomalies(allInvoices)

      const report: TVAReport = {
        startDate,
        endDate,
        periodType,
        salesSummary,
        purchasesSummary,
        netTVA: roundCurrency(salesSummary.totalTVA - purchasesSummary.totalTVA),
        salesInvoices,
        purchaseInvoices,
        anomalies
      }

      set({ report, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to generate report',
        isLoading: false 
      })
    }
  },

  exportToCSV: (type: 'sales' | 'purchases' | 'summary') => {
    const { report } = get()
    if (!report) return

    let csvContent = ''
    let filename = ''

    if (type === 'summary') {
      csvContent = `Période,${report.startDate} au ${report.endDate}\n`
      csvContent += `Type,Ventes HT,Ventes TVA,Ventes TTC,Achats HT,Achats TVA,Achats TTC,TVA Nette\n`
      csvContent += `Montants,${report.salesSummary.totalHT},${report.salesSummary.totalTVA},${report.salesSummary.totalTTC},${report.purchasesSummary.totalHT},${report.purchasesSummary.totalTVA},${report.purchasesSummary.totalTTC},${report.netTVA}\n`
      filename = `tva-summary-${report.startDate}-${report.endDate}.csv`
    } else {
      const invoices = type === 'sales' ? report.salesInvoices : report.purchaseInvoices
      csvContent = `Numéfacture,Date,${type === 'sales' ? 'Client' : 'Fournisseur'},HT,TVA,TTC,Taux TVA,Statut\n`
      invoices.forEach(inv => {
        csvContent += `${inv.invoiceNumber},${inv.invoiceDate},${type === 'sales' ? inv.customerName : inv.supplierName},${inv.totalHT},${inv.totalTVA},${inv.totalTTC},${inv.tvaRate},${inv.status}\n`
      })
      filename = `tva-${type}-${report.startDate}-${report.endDate}.csv`
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  },

  exportToPDF: (type: 'sales' | 'purchases' | 'summary') => {
    // PDF export will be implemented later
    console.log('PDF export not yet implemented for', type)
  },

  clearReport: () => {
    set({ report: null, error: null })
  }
}))

// Helper to map Local Sales Invoice (EstimateStore) to TVA Invoice
const mapLocalSalesInvoice = (inv: any): Invoice => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    type: 'sales',
    customerId: inv.customerId,
    customerName: inv.customerName,
    totalHT: inv.subtotal,
    totalTVA: inv.vatAmount,
    totalTTC: inv.totalAmount,
    tvaRate: 0.20, // Default 20%
    invoiceDate: inv.issueDate,
    status: inv.status === 'paid' ? 'paid' : 'validated', // Map 'sent'/'overdue' to 'validated' for TVA purposes
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt
})

// Helper to map Local Purchase Invoice (InventoryStore) to TVA Invoice
const mapLocalPurchaseInvoice = (inv: any): Invoice => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    type: 'purchase',
    supplierId: inv.supplierId,
    supplierName: inv.supplierName,
    totalHT: inv.subtotal,
    totalTVA: inv.taxAmount,
    totalTTC: inv.totalAmount,
    tvaRate: 0.20, // Default
    invoiceDate: inv.invoiceDate,
    status: inv.paymentStatus === 'paid' ? 'paid' : 'validated',
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt
})
