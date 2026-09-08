import express from 'express'
import { 
  getTemplates, 
  getTemplate, 
  getCurrentTemplate,
  createTemplateVersion,
  setDefaultTemplateVersion,
  generateDocument,
  getDocument,
  updateDocumentStatus
} from './templates'
import paymentRoutes from './routes/payments'

const router = express.Router()

// Template routes
router.get('/templates', getTemplates)
router.get('/templates/:id', getTemplate)
router.get('/templates/current/:type', getCurrentTemplate)
router.post('/templates/versions', createTemplateVersion)
router.post('/templates/set-default', setDefaultTemplateVersion)

// Document routes
router.post('/documents/generate', generateDocument)
router.get('/documents/:id', getDocument)
router.patch('/documents/:id/status', updateDocumentStatus)

// Payment routes
router.use('/payments', paymentRoutes)

export default router