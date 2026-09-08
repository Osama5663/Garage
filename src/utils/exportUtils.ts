import { Invoice, Estimate } from '../types/estimate'
import { formatCurrency, formatDate } from './formatters'
import { jsPDF } from 'jspdf'
import { printTheme } from './printTheme'
import { renderDocument, convertWorkshopSettings } from './renderDocument'
import { useSettingsStore } from '../stores/settingsStore'
import { useCustomerStore } from '../stores/customerStore'

// removed template designer integration

// CSV Export Functions
export const exportInvoiceToCSV = (invoice: Invoice): void => {
  const headers = [
    'Invoice Number',
    'Customer Name',
    'Customer ID',
    'Vehicle Make',
    'Vehicle Model',
    'Vehicle Year',
    'VIN',
    'Registration',
    'Issue Date',
    'Due Date',
    'Status',
    'Payment Status',
    'Subtotal',
    'VAT Amount',
    'Total Amount',
    'Amount Paid',
    'Remaining Balance',
    'Notes'
  ]

  const data = [
    invoice.invoiceNumber,
    invoice.customerName,
    invoice.customerId,
    invoice.vehicleInfo.make,
    invoice.vehicleInfo.model,
    invoice.vehicleInfo.year,
    invoice.vehicleInfo.vin,
    invoice.vehicleInfo.registration,
    formatDate(invoice.issueDate),
    formatDate(invoice.dueDate),
    invoice.status,
    invoice.paymentStatus,
    formatCurrency(invoice.subtotal),
    formatCurrency(invoice.vatAmount),
    formatCurrency(invoice.totalAmount),
    formatCurrency(invoice.amountPaid),
    formatCurrency(invoice.totalAmount - invoice.amountPaid),
    invoice.notes || ''
  ]

  const csvContent = [headers, data].map(row => 
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  downloadFile(csvContent, `${invoice.invoiceNumber}.csv`, 'text/csv')
}

export const exportEstimateToCSV = (estimate: Estimate): void => {
  const headers = [
    'Estimate Number',
    'Customer Name',
    'Customer ID',
    'Vehicle Make',
    'Vehicle Model',
    'Vehicle Year',
    'VIN',
    'Registration',
    'Issue Date',
    'Expiry Date',
    'Status',
    'Subtotal',
    'VAT Amount',
    'Total Amount',
    'Converted to Invoice',
    'Notes'
  ]

  const data = [
    estimate.estimateNumber,
    estimate.customerName,
    estimate.customerId,
    estimate.vehicleInfo.make,
    estimate.vehicleInfo.model,
    estimate.vehicleInfo.year,
    estimate.vehicleInfo.vin,
    estimate.vehicleInfo.registration,
    formatDate(estimate.issueDate),
    formatDate(estimate.expiryDate),
    estimate.status,
    formatCurrency(estimate.subtotal),
    formatCurrency(estimate.vatAmount),
    formatCurrency(estimate.totalAmount),
    estimate.convertedToInvoice || '',
    estimate.notes || ''
  ]

  const csvContent = [headers, data].map(row => 
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  downloadFile(csvContent, `${estimate.estimateNumber}.csv`, 'text/csv')
}

export const exportInvoiceItemsToCSV = (invoice: Invoice): void => {
  const headers = [
    'Invoice Number',
    'Item Type',
    'Description',
    'Quantity',
    'Unit Price',
    'Total Price'
  ]

  const rows = invoice.items.map(item => [
    invoice.invoiceNumber,
    item.type,
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.totalPrice)
  ])

  const csvContent = [headers, ...rows].map(row => 
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  downloadFile(csvContent, `${invoice.invoiceNumber}_items.csv`, 'text/csv')
}

export const exportEstimateItemsToCSV = (estimate: Estimate): void => {
  const headers = [
    'Estimate Number',
    'Item Type',
    'Description',
    'Quantity',
    'Unit Price',
    'Total Price'
  ]

  const rows = estimate.items.map(item => [
    estimate.estimateNumber,
    item.type,
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.totalPrice)
  ])

  const csvContent = [headers, ...rows].map(row => 
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  downloadFile(csvContent, `${estimate.estimateNumber}_items.csv`, 'text/csv')
}

// PDF Export Functions (using basic HTML-to-PDF approach)
export const exportInvoiceToPDF = (invoice: Invoice, paper: 'a4' | 'letter' = 'a4'): string | null => {
  try {
    const doc = new jsPDF({ unit: 'pt', format: paper })
    const margin = printTheme.margins.page
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const contentWidth = pageWidth - margin * 2
    let y = margin

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) { doc.addPage(); y = margin }
    }

    doc.setTextColor(printTheme.colors.text.r, printTheme.colors.text.g, printTheme.colors.text.b)

    const drawHeader = () => {
      doc.setFont(printTheme.fontFamily, 'bold'); doc.setFontSize(printTheme.fontSize.h1)
      doc.text('GARAGE', margin, y)
      doc.setFontSize(printTheme.fontSize.base); doc.setFont(printTheme.fontFamily, 'normal')
      doc.text('123 Garage Street, Auto City, AC1 2BC', margin, y + 16)
      doc.text('Phone: 01234 567890 • Email: info@garage-system.com', margin, y + 32)
      doc.setDrawColor(printTheme.colors.line.r, printTheme.colors.line.g, printTheme.colors.line.b); doc.setLineWidth(1)
      doc.rect(pageWidth - margin - 96, y - 4, 96, 40)
      doc.setFont(printTheme.fontFamily, 'bold'); doc.setFontSize(printTheme.fontSize.h2)
      doc.text('Logo', pageWidth - margin - 50, y + 18, { align: 'center' })
      doc.setFontSize(20)
      doc.text(`FACTURE`, pageWidth - margin - 96, y + 64, { align: 'left' })
      doc.setFont(printTheme.fontFamily, 'normal'); doc.setFontSize(printTheme.fontSize.h2)
      doc.text(`No: ${invoice.invoiceNumber}`, pageWidth - margin - 96, y + 82)
      doc.text(`Date: ${formatDate(invoice.issueDate)}`, pageWidth - margin - 96, y + 98)
      y += 120
    }

    const drawCustomerAndDocInfo = () => {
      ensureSpace(100)
      doc.setFont(printTheme.fontFamily, 'bold'); doc.setFontSize(printTheme.fontSize.h2)
      doc.text('Client', margin, y)
      doc.text('Document', margin + contentWidth / 2, y)
      y += 16
      doc.setFont(printTheme.fontFamily, 'normal')
      doc.text(`${invoice.customerName}`, margin, y)
      doc.text(`ID: ${invoice.customerId}`, margin, y + 16)
      doc.text(`Échéance: ${formatDate(invoice.dueDate)}`, margin + contentWidth / 2, y)
      if (invoice.estimateId) doc.text(`Depuis devis: ${String(invoice.estimateId)}`, margin + contentWidth / 2, y + 16)
      y += 32
      doc.setDrawColor(printTheme.colors.border.r, printTheme.colors.border.g, printTheme.colors.border.b); doc.line(margin, y, margin + contentWidth, y)
      y += 12
    }

    const drawItemsHeader = () => {
      ensureSpace(30)
      const descW = contentWidth * 0.5
      const qtyW = contentWidth * 0.1
      const unitW = contentWidth * 0.2
      const totalW = contentWidth * 0.2
      let x = margin
      doc.setFont(printTheme.fontFamily, 'bold'); doc.setFontSize(printTheme.fontSize.base)
      doc.setDrawColor(printTheme.colors.border.r, printTheme.colors.border.g, printTheme.colors.border.b); doc.setFillColor(printTheme.colors.headerBg.r, printTheme.colors.headerBg.g, printTheme.colors.headerBg.b)
      doc.rect(margin, y - 12, contentWidth, printTheme.table.headerHeight, 'FD')
      doc.text('Description', x, y)
      x += descW
      doc.text('Qté', x, y, { align: 'right' })
      x += qtyW
      doc.text('PU HT', x, y, { align: 'right' })
      x += unitW
      doc.text('Total HT', x, y, { align: 'right' })
      y += printTheme.table.rowHeight
      return { descW, qtyW, unitW, totalW }
    }

    const drawItemRow = (row: { description: string; quantity: number; unitPrice: number; totalPrice: number }, widths: { descW: number; qtyW: number; unitW: number; totalW: number }, index: number) => {
      ensureSpace(20)
      // zebra background for alternating rows
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y - (printTheme.table.rowHeight - 4), contentWidth, printTheme.table.rowHeight, 'F')
      }
      let x = margin
      doc.setFont(printTheme.fontFamily, 'normal'); doc.setFontSize(printTheme.fontSize.base)
      doc.text(row.description, x, y, { maxWidth: widths.descW - 8 })
      x += widths.descW
      doc.text(String(row.quantity), x, y, { align: 'right' })
      x += widths.qtyW
      doc.text(formatCurrency(row.unitPrice), x, y, { align: 'right' })
      x += widths.unitW
      doc.text(formatCurrency(row.totalPrice), x, y, { align: 'right' })
      // row borders
      doc.setDrawColor(printTheme.colors.border.r, printTheme.colors.border.g, printTheme.colors.border.b)
      doc.line(margin, y + 4, margin + contentWidth, y + 4)
      y += printTheme.table.rowHeight
    }

    const drawTotals = () => {
      ensureSpace(100)
      y += 8
      const x = margin + contentWidth * 0.6
      doc.setFont(printTheme.fontFamily, 'bold'); doc.text('Résumé', x, y)
      y += 16; doc.setFont(printTheme.fontFamily, 'normal')
      doc.text('Sous-total HT', x, y); doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, y, { align: 'right' }); y += 14
      doc.text('TVA 20%', x, y); doc.text(formatCurrency(invoice.vatAmount), pageWidth - margin, y, { align: 'right' }); y += 14
      doc.setFont(printTheme.fontFamily, 'bold')
      doc.text('Total TTC', x, y); doc.text(formatCurrency(invoice.totalAmount), pageWidth - margin, y, { align: 'right' }); y += 16
      doc.setFont(printTheme.fontFamily, 'normal')
      doc.text('Payé', x, y); doc.text(formatCurrency(invoice.amountPaid), pageWidth - margin, y, { align: 'right' }); y += 14
      doc.text('Solde restant', x, y); doc.text(formatCurrency(invoice.totalAmount - invoice.amountPaid), pageWidth - margin, y, { align: 'right' }); y += 16
    }

    const drawFooter = () => {
      ensureSpace(120)
      if (invoice.termsAndConditions) {
        doc.setFont(printTheme.fontFamily, 'bold'); doc.text('Conditions de paiement', margin, y); y += 14
        doc.setFont(printTheme.fontFamily, 'normal'); doc.text(invoice.termsAndConditions, margin, y, { maxWidth: contentWidth }); y += 18
      }
      doc.setFont(printTheme.fontFamily, 'normal')
      doc.text(`Échéance: ${formatDate(invoice.dueDate)}`, margin, y); y += 10
      doc.setFont(printTheme.fontFamily, 'bold'); doc.text('Contact', margin, y); y += 14
      const ws = (require('../stores/settingsStore') as any).useSettingsStore.getState().workshop
      const line1 = `${ws?.name || 'GARAGE'} • ${ws?.address || '123 Garage Street, Auto City, AC1 2BC'} • ${ws?.phone || '01234 567890'} • ${ws?.email || 'info@garage-system.com'}`
      const line2 = ws?.website || ''
      doc.setFont(printTheme.fontFamily, 'normal'); doc.text(line1, margin, y, { maxWidth: contentWidth }); y += 12
      if (line2) { doc.text(line2, margin, y, { maxWidth: contentWidth }); y += 12 }
    }

    drawHeader()
    drawCustomerAndDocInfo()
    const widths = drawItemsHeader()
    invoice.items.forEach((item: any, idx) => {
      const category = String(item?.category ?? '').trim()
      const description = category ? `[${category}] ${item.description}` : item.description
      drawItemRow({ description, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice }, widths, idx)
    })
    drawTotals()
    if (invoice.notes) { ensureSpace(40); doc.setFont('helvetica', 'bold'); doc.text('Notes', margin, y); y += 14; doc.setFont('helvetica', 'normal'); doc.text(invoice.notes, margin, y, { maxWidth: contentWidth }); y += 18 }
    drawFooter()

    const blobUrl = doc.output('bloburl') as unknown as string
    return blobUrl
  } catch (e) {
    console.error(e)
    alert('Échec de la génération PDF. Autorisez les fenêtres pop‑up ou réessayez.')
    return null
  }
}

export const exportEstimateToPDF = (estimate: Estimate): void => {
  // Get stores directly
  const settingsStore = useSettingsStore.getState()
  const customerStore = useCustomerStore.getState()
  
  const workshop = settingsStore.workshop
  const customer = customerStore.customers.find((c: any) => c.id === estimate.customerId)
  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : estimate.customerName || ''

  // Safe address extraction
  const getSafeAddress = (c: any) => {
    if (!c) return { street: '', zipCode: '', city: '' }
    if (typeof c.address === 'string') return { street: c.address, zipCode: c.zipCode || '', city: c.city || '' }
    if (c.address && typeof c.address === 'object') {
      return {
        street: c.address.street || '',
        zipCode: c.address.zipCode || c.zipCode || '',
        city: c.address.city || c.city || ''
      }
    }
    return { street: '', zipCode: c.zipCode || '', city: c.city || '' }
  }

  const addressInfo = getSafeAddress(customer)

  // Prepare data for renderDocument
  const laborItems = estimate.items.filter(i => i.type === 'labor')
  const partItems = estimate.items.filter(i => i.type !== 'labor')

  const docData = {
    number: estimate.estimateNumber,
    date: estimate.issueDate,
    dueDate: estimate.expiryDate,
    validUntil: estimate.expiryDate,
    status: estimate.status,
    lines: partItems.map(item => ({
      ref: item.partNumber || '',
      category: (item as any).category,
      description: item.description,
      shortDescription: item.notes,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: Number((item as any).discountRate ?? 0),
      tvaRate: (() => {
        const r = Number(item.taxRate ?? 0)
        return r > 1 ? r : r * 100
      })(),
      lineTotal: item.totalPrice,
      type: item.type
    })),
    labor: laborItems.map(item => ({
      category: (item as any).category,
      description: item.description,
      shortDescription: item.notes,
      hours: item.quantity, // Assuming quantity is hours for labor
      hourlyRate: item.unitPrice,
      discount: Number((item as any).discountRate ?? 0),
      tvaRate: (() => {
        const r = Number(item.taxRate ?? 0)
        return r > 1 ? r : r * 100
      })(),
      totalAmount: item.totalPrice
    })),
    subtotal: estimate.subtotal,
    vatTotal: estimate.vatAmount,
    grandTotal: estimate.totalAmount,
    notes: estimate.notes,
    terms: estimate.termsAndConditions,
    partsSubtotal: partItems.reduce((acc, item) => acc + item.totalPrice, 0),
    laborSubtotal: laborItems.reduce((acc, item) => acc + item.totalPrice, 0)
  }

  const customerData = {
    name: customerName,
    address: addressInfo.street,
    postalCode: addressInfo.zipCode,
    city: addressInfo.city,
    phone: customer?.phone || '',
    email: customer?.email
  }

  try {
    const htmlContent = renderDocument(
      'devis',
      convertWorkshopSettings(workshop || {}),
      docData,
      customerData,
      estimate.vehicleInfo
    )

    if (!htmlContent || htmlContent.trim().length === 0) {
      console.error('Generated HTML is empty')
      alert('Error: Generated document is empty.')
      return
    }

    // Use iframe for printing
    const iframe = document.createElement('iframe')
    // Set style to be invisible but technically rendered
    iframe.style.visibility = 'hidden'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '1px' // Some browsers need non-zero dimensions
    iframe.style.height = '1px'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    
    // Helper to print
    const doPrint = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.error('Print failed:', e)
        alert('Printing failed. Please try again.')
      } finally {
        // Extended cleanup time to ensure print dialog doesn't kill the iframe content too early
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, 5000)
      }
    }

    const frameDoc = iframe.contentWindow?.document
    if (frameDoc) {
      frameDoc.open()
      frameDoc.write(htmlContent)
      frameDoc.close()
      
      // Wait for content to load (styles, images if any)
      // Increased timeout to ensure rendering.
      setTimeout(doPrint, 1000)
    } else {
       console.error('Iframe contentWindow or document not accessible')
       alert('Printing failed: Browser security restriction.')
    }
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Failed to generate document.')
  }
}

// Helper functions
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const renderTemplateToPdf = (_docType: 'job'|'bl'|'invoice', _payload: any, _doc: jsPDF) => false
