import { AppError } from '../utils/errors'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { fileURLToPath } from 'url'
import { getSupplierByIdMaria } from '../repositories/suppliersRepo.js'
import {
  allBLDocumentsMaria,
  allInvoicesMaria,
  createBLDocumentMaria,
  createInvoiceMaria,
  findBLByNumberMaria,
  getBLDocumentByIdMaria,
  getInvoiceByIdMaria,
  listBLByIdsMaria,
  listBLDocumentsMaria,
  listInvoicesMaria,
  updateBLDocumentMaria,
  updateInvoiceMaria,
} from '../repositories/blRepo.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class BLService {
  async createBLDocument(data: {
    supplierId: string
    blNumber: string
    blDate: Date
    file: Express.Multer.File
    amount: number
    currency?: string
    uploadedBy: string
    metadata?: any
  }): Promise<any> {
    const supplier = await getSupplierByIdMaria(data.supplierId)
    if (!supplier) {
      throw new AppError('Supplier not found', 404)
    }
    const existingBL = await findBLByNumberMaria(data.blNumber)
    if (existingBL) {
      throw new AppError('BL number already exists', 400)
    }

    const uploadResult = await cloudinary.uploader.upload(data.file.path, {
      folder: 'bl-documents',
      resource_type: 'raw'
    })

    const blDocument = await createBLDocumentMaria({
      supplierId: data.supplierId,
      blNumber: data.blNumber,
      blDate: data.blDate.toISOString(),
      documentPath: uploadResult.secure_url,
      originalFilename: data.file.originalname,
      fileSize: data.file.size,
      fileType: data.file.mimetype,
      amount: data.amount,
      currency: data.currency || 'MAD',
      status: 'draft',
      uploadedBy: data.uploadedBy,
      metadata: data.metadata,
      auditLog: [
        {
          action: 'UPLOADED',
          performedBy: data.uploadedBy,
          timestamp: new Date().toISOString(),
          details: `BL document uploaded with amount ${data.amount} ${data.currency || 'MAD'}`
        }
      ],
      supplier: { name: supplier.name, code: supplier.code }
    })

    fs.unlinkSync(data.file.path)
    return blDocument as any
  }

  async getBLDocuments(filters: {
    supplierId?: string
    status?: string
    startDate?: Date
    endDate?: Date
    search?: string
  }): Promise<any[]> {
    const docs = await listBLDocumentsMaria(filters)
    for (const d of docs) {
      if (!d.supplier && d.supplierId) {
        const supplier = await getSupplierByIdMaria(String(d.supplierId))
        if (supplier) d.supplier = { name: supplier.name, code: supplier.code }
      }
    }
    return docs as any
  }

  async updateBLDocumentStatus(id: string, status: string, userId: string): Promise<any> {
    const blDocument: any = await getBLDocumentByIdMaria(id)
    if (!blDocument) {
      throw new AppError('BL document not found', 404)
    }
    blDocument.status = status
    blDocument.auditLog = Array.isArray(blDocument.auditLog) ? blDocument.auditLog : []
    blDocument.auditLog.push({
      action: 'STATUS_UPDATED',
      performedBy: userId,
      timestamp: new Date().toISOString(),
      details: `Status changed to ${status}`
    })
    const saved = await updateBLDocumentMaria(id, blDocument)
    return saved as any
  }

  async generateMonthlyInvoice(data: {
    supplierId: string
    blDocumentIds: string[]
    invoiceDate?: Date
    dueDate?: Date
    generatedBy: string
    notes?: string
  }): Promise<any> {
    const docs = await listBLByIdsMaria(data.blDocumentIds.map(String))
    const blDocuments = docs.filter(d => String(d.supplierId) === String(data.supplierId) && d.status === 'validated')
    if (blDocuments.length !== data.blDocumentIds.length) {
      throw new AppError('Some BL documents are not available for invoicing', 400)
    }

    const totalAmount = blDocuments.reduce((sum, bl) => sum + Number(bl.amount || 0), 0)
    const currency = blDocuments[0]?.currency || 'MAD'
    const invoiceNumber = await this.generateInvoiceNumber()
    const invoiceDate = data.invoiceDate || new Date()
    const dueDate = data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const invoice = await createInvoiceMaria({
      invoiceNumber,
      supplierId: data.supplierId,
      blDocuments: data.blDocumentIds.map(String),
      totalAmount,
      currency,
      invoiceDate: invoiceDate.toISOString(),
      dueDate: dueDate.toISOString(),
      status: 'draft',
      generatedBy: data.generatedBy,
      notes: data.notes,
      auditLog: [
        {
          action: 'GENERATED',
          performedBy: data.generatedBy,
          timestamp: new Date().toISOString(),
          details: `Invoice generated from ${blDocuments.length} BL documents`
        }
      ]
    })

    for (const id of data.blDocumentIds.map(String)) {
      const bl: any = await getBLDocumentByIdMaria(id)
      if (!bl) continue
      bl.status = 'invoiced'
      bl.invoiceId = invoice._id || invoice.id
      bl.auditLog = Array.isArray(bl.auditLog) ? bl.auditLog : []
      bl.auditLog.push({
        action: 'INVOICED',
        performedBy: data.generatedBy,
        timestamp: new Date().toISOString(),
        details: `Included in invoice ${invoiceNumber}`
      })
      await updateBLDocumentMaria(id, bl)
    }

    const supplier = await getSupplierByIdMaria(String(data.supplierId))
    const populated = {
      ...invoice,
      supplierId: supplier ? { name: supplier.name, code: supplier.code } : invoice.supplierId,
      blDocuments: blDocuments,
      generatedBy: { id: data.generatedBy },
    }
    return populated as any
  }

  async generateInvoicePDF(invoiceId: string): Promise<string> {
    const invoice: any = await getInvoiceByIdMaria(invoiceId)
    if (!invoice) {
      throw new AppError('Invoice not found', 404)
    }

    const supplier = invoice.supplierId ? await getSupplierByIdMaria(String(invoice.supplierId)) : null
    const blDocuments = Array.isArray(invoice.blDocuments) ? await listBLByIdsMaria(invoice.blDocuments.map(String)) : []

    const doc = new PDFDocument()
    const filename = `invoice-${invoice.invoiceNumber}.pdf`
    const dirpath = path.join(__dirname, '../../uploads/invoices')
    fs.mkdirSync(dirpath, { recursive: true })
    const filepath = path.join(dirpath, filename)

    doc.pipe(fs.createWriteStream(filepath))

    doc.fontSize(20).text('FACTURE', 50, 50)
    doc.fontSize(12)
    doc.text(`Numéro: ${invoice.invoiceNumber}`, 50, 100)
    doc.text(`Date: ${format(new Date(invoice.invoiceDate), 'dd MMMM yyyy', { locale: fr })}`, 50, 120)
    doc.text(`Échéance: ${format(new Date(invoice.dueDate), 'dd MMMM yyyy', { locale: fr })}`, 50, 140)

    doc.text('Fournisseur:', 50, 180)
    doc.text(supplier?.name || '', 50, 200)
    doc.text((supplier as any)?.address || '', 50, 220)

    doc.text('Montant Total:', 400, 180)
    doc.fontSize(14).text(`${invoice.totalAmount} ${invoice.currency}`, 400, 200)

    doc.text('Détails des BL:', 50, 280)
    let y = 300
    for (const bl of blDocuments as any[]) {
      doc.fontSize(10)
      doc.text(`BL: ${bl.blNumber}`, 50, y)
      doc.text(`Date: ${format(new Date(bl.blDate), 'dd/MM/yyyy')}`, 150, y)
      doc.text(`${bl.amount} ${bl.currency}`, 300, y)
      y += 20
    }

    doc.end()

    const uploadResult = await cloudinary.uploader.upload(filepath, {
      folder: 'invoices',
      resource_type: 'raw'
    })

    invoice.pdfPath = uploadResult.secure_url
    await updateInvoiceMaria(invoiceId, invoice)

    fs.unlinkSync(filepath)
    return uploadResult.secure_url
  }

  async getInvoices(filters: {
    supplierId?: string
    status?: string
    startDate?: Date
    endDate?: Date
  }): Promise<any[]> {
    const invoices = await listInvoicesMaria(filters)
    for (const inv of invoices) {
      if (inv.supplierId && typeof inv.supplierId === 'string') {
        const supplier = await getSupplierByIdMaria(String(inv.supplierId))
        if (supplier) inv.supplierId = { name: supplier.name, code: supplier.code }
      }
      if (Array.isArray(inv.blDocuments)) {
        inv.blDocuments = await listBLByIdsMaria(inv.blDocuments.map(String))
      }
    }
    return invoices as any
  }

  async updateInvoiceStatus(id: string, status: string, userId: string): Promise<any> {
    const invoice: any = await getInvoiceByIdMaria(id)
    if (!invoice) {
      throw new AppError('Invoice not found', 404)
    }
    const oldStatus = invoice.status
    invoice.status = status
    if (status === 'sent') {
      invoice.sentAt = new Date().toISOString()
    } else if (status === 'paid') {
      invoice.paidAt = new Date().toISOString()
    }
    invoice.auditLog = Array.isArray(invoice.auditLog) ? invoice.auditLog : []
    invoice.auditLog.push({
      action: 'STATUS_UPDATED',
      performedBy: userId,
      timestamp: new Date().toISOString(),
      details: `Status changed from ${oldStatus} to ${status}`
    })
    const saved = await updateInvoiceMaria(id, invoice)
    return saved as any
  }

  async getMonthlySummary(month: number, year: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const blDocs = (await allBLDocumentsMaria()).filter((d: any) => {
      const t = new Date(d.blDate || 0).getTime()
      return t >= startDate.getTime() && t <= endDate.getTime()
    })

    const invoices = (await allInvoicesMaria()).filter((d: any) => {
      const t = new Date(d.invoiceDate || 0).getTime()
      return t >= startDate.getTime() && t <= endDate.getTime()
    })

    const bySupplierBL: Record<string, any> = {}
    for (const bl of blDocs) {
      const sid = String(bl.supplierId || '')
      if (!bySupplierBL[sid]) bySupplierBL[sid] = { _id: sid, totalBLs: 0, totalAmount: 0, pendingCount: 0, invoicedCount: 0 }
      bySupplierBL[sid].totalBLs += 1
      bySupplierBL[sid].totalAmount += Number(bl.amount || 0)
      bySupplierBL[sid].pendingCount += bl.status === 'pending' ? 1 : 0
      bySupplierBL[sid].invoicedCount += bl.status === 'invoiced' ? 1 : 0
    }

    const blStats = []
    for (const sid of Object.keys(bySupplierBL)) {
      const supplier = await getSupplierByIdMaria(sid)
      blStats.push({ ...bySupplierBL[sid], supplier })
    }

    const bySupplierInv: Record<string, any> = {}
    for (const inv of invoices) {
      const sid = String(inv.supplierId || '')
      if (!bySupplierInv[sid]) bySupplierInv[sid] = { _id: sid, totalInvoices: 0, totalInvoicedAmount: 0, draftCount: 0, sentCount: 0, paidCount: 0 }
      bySupplierInv[sid].totalInvoices += 1
      bySupplierInv[sid].totalInvoicedAmount += Number(inv.totalAmount || 0)
      bySupplierInv[sid].draftCount += inv.status === 'draft' ? 1 : 0
      bySupplierInv[sid].sentCount += inv.status === 'sent' ? 1 : 0
      bySupplierInv[sid].paidCount += inv.status === 'paid' ? 1 : 0
    }
    const invoiceStats = Object.values(bySupplierInv)

    return {
      month,
      year,
      blStats,
      invoiceStats,
      summary: {
        totalBLs: blStats.reduce((sum: number, stat: any) => sum + stat.totalBLs, 0),
        totalAmount: blStats.reduce((sum: number, stat: any) => sum + stat.totalAmount, 0),
        pendingBLs: blStats.reduce((sum: number, stat: any) => sum + stat.pendingCount, 0),
        invoicedBLs: blStats.reduce((sum: number, stat: any) => sum + stat.invoicedCount, 0),
        totalInvoices: (invoiceStats as any[]).reduce((sum, stat) => sum + stat.totalInvoices, 0),
        totalInvoicedAmount: (invoiceStats as any[]).reduce((sum, stat) => sum + stat.totalInvoicedAmount, 0)
      }
    }
  }

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const datePart = `${year}${month}${day}`
    const prefix = `FA-${datePart}-`

    const invoices = await allInvoicesMaria()
    const sameDay = invoices
      .map((i: any) => String(i.invoiceNumber || ''))
      .filter((n: string) => n.startsWith(prefix))
      .sort()
    const last = sameDay.length ? sameDay[sameDay.length - 1] : null
    let nextSeq = 1
    if (last) {
      const match = last.match(/FA-\d{8}-(\d{3})$/)
      if (match) nextSeq = parseInt(match[1], 10) + 1
    }
    if (nextSeq > 999) {
      throw new AppError('Daily FA invoice sequence limit reached', 400)
    }
    const seq = String(nextSeq).padStart(3, '0')
    return `${prefix}${seq}`
  }
}
