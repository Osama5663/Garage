import { Router, type Response } from 'express'
import multer from 'multer'
import { BLService } from '../services/blService'
import { authenticateToken, requireRole, type AuthenticatedRequest } from '../middleware/auth'
import { AppError } from '../utils/errors'
import path from 'path'
import fs from 'fs'

const router = Router()
const blService = new BLService()

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/bl-documents/')
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  fileFilter: (_req, file, cb: any) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, JPEG, JPG, and PNG files are allowed'), false)
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

router.use(authenticateToken)

router.post('/documents/upload',
  requireRole(['admin', 'staff', 'accountant']),
  upload.single('document'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400)
      }

      const { supplierId, blNumber, blDate, amount, currency, metadata } = req.body

      if (!supplierId || !blNumber || !blDate || !amount) {
        throw new AppError('Missing required fields: supplierId, blNumber, blDate, amount', 400)
      }

      const blDocument = await blService.createBLDocument({
        supplierId,
        blNumber,
        blDate: new Date(blDate),
        file: req.file,
        amount: parseFloat(amount),
        currency,
        uploadedBy: req.user?.id ?? 'system',
        metadata: metadata ? JSON.parse(metadata) : undefined
      })

      res.json({
        success: true,
        data: blDocument
      })
    } catch (error) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path)
        } catch {}
      }
      const status = error instanceof AppError ? error.statusCode : 500
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(status).json({
        success: false,
        error: message
      })
    }
  }
)

router.get('/documents',
  requireRole(['admin', 'staff', 'accountant', 'supervisor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { supplierId, status, startDate, endDate, search } = req.query

      const filters = {
        supplierId: supplierId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string
      }

      const documents = await blService.getBLDocuments(filters)

      res.json({
        success: true,
        data: documents
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).json({
        success: false,
        error: message
      })
    }
  }
)

router.patch('/documents/:id/status',
  requireRole(['admin', 'staff', 'accountant']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!['draft', 'validated', 'invoiced', 'cancelled'].includes(status)) {
        throw new AppError('Invalid status', 400)
      }

      const document = await blService.updateBLDocumentStatus(id, status, req.user?.id ?? 'system')

      res.json({
        success: true,
        data: document
      })
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(status).json({
        success: false,
        error: message
      })
    }
  }
)

router.post('/invoices/generate',
  requireRole(['admin', 'staff', 'accountant']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { supplierId, blDocumentIds, invoiceDate, dueDate, notes } = req.body

      if (!supplierId || !blDocumentIds || !Array.isArray(blDocumentIds) || blDocumentIds.length === 0) {
        throw new AppError('Missing required fields: supplierId, blDocumentIds', 400)
      }

      const invoice = await blService.generateMonthlyInvoice({
        supplierId,
        blDocumentIds,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        generatedBy: req.user?.id ?? 'system',
        notes
      })

      res.json({
        success: true,
        data: invoice
      })
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(status).json({
        success: false,
        error: message
      })
    }
  }
)

router.get('/invoices',
  requireRole(['admin', 'staff', 'accountant', 'supervisor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { supplierId, status, startDate, endDate } = req.query

      const filters = {
        supplierId: supplierId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      }

      const invoices = await blService.getInvoices(filters)

      res.json({
        success: true,
        data: invoices
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).json({
        success: false,
        error: message
      })
    }
  }
)

router.get('/invoices/:id/pdf',
  requireRole(['admin', 'staff', 'accountant']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params

      const pdfPath = await blService.generateInvoicePDF(id)

      res.json({
        success: true,
        data: { pdfPath }
      })
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(status).json({
        success: false,
        error: message
      })
    }
  }
)

router.patch('/invoices/:id/status',
  requireRole(['admin', 'staff', 'accountant']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) {
        throw new AppError('Invalid status', 400)
      }

      const invoice = await blService.updateInvoiceStatus(id, status, req.user?.id ?? 'system')

      res.json({
        success: true,
        data: invoice
      })
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(status).json({
        success: false,
        error: message
      })
    }
  }
)

router.get('/reports/monthly-summary',
  requireRole(['admin', 'accountant', 'supervisor']),
  async (req, res) => {
    try {
      const { month, year } = req.query

      if (!month || !year) {
        throw new AppError('Missing required fields: month, year', 400)
      }

      const summary = await blService.getMonthlySummary(
        parseInt(month as string),
        parseInt(year as string)
      )

      res.json({
        success: true,
        data: summary
      })
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(status).json({
        success: false,
        error: message
      })
    }
  }
)

export default router
