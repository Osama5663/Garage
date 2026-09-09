/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import jobDescriptionRoutes from './routes/jobDescriptions.js'
import diagnosticsRoutes from './routes/diagnostics.js'
import templateRoutes from './routes.js'
import documentRoutes from './routes/documents.js'
import supplierRoutes from './routes/suppliers.js'
import blDocumentRoutes from './routes/blDocuments.js'
import deliveryNoteRoutes from './routes/deliveryNotes.js'
import purchaseOrderRoutes from './routes/purchaseOrders.js'
import inventoryRoutes from './routes/inventory.js'
import mechanicRoutes from './routes/mechanics.js'
import userActionRoutes from './routes/UserActions.js'
import supplierInvoiceRoutes from './routes/supplierInvoices.js'
import stateRoutes from './routes/state.js'
import adminRoutes from './routes/admin.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.join(__dirname, '../../dist')

// load env
dotenv.config()

const app: express.Application = express()
app.set('etag', false)

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/job-descriptions', jobDescriptionRoutes)
app.use('/api/diagnostics', diagnosticsRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/bl-documents', blDocumentRoutes)
app.use('/api/delivery-notes', deliveryNoteRoutes)
app.use('/api/purchase-orders', purchaseOrderRoutes)
app.use('/api/supplier-invoices', supplierInvoiceRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/mechanics', mechanicRoutes)
app.use('/api/user-actions', userActionRoutes)
app.use('/api/state', stateRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', templateRoutes)

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/', (_req: Request, res: Response) => {
  res.redirect(302, '/garage/')
})

app.use(
  '/garage',
  express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store')
      }
    },
  }),
)
app.get('/garage/*', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(distPath, 'index.html'))
})

/**
 * health
 */
app.use(
  '/api/health',
  (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((_error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
