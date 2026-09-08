import express from 'express'
import multer from 'multer'
import { saveDiagnosticBuffer, deleteDiagnosticByStoredName } from '../services/storage.js'
import { inventoryService } from '../services/inventoryService.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const allowedMime = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const jobId = String(req.body.jobId || '')
    if (!jobId) return res.status(400).json({ ok: false, error: 'Missing jobId' })
    const file = req.file
    if (!file) return res.status(400).json({ ok: false, error: 'No file provided' })
    if (!(allowedMime.has(file.mimetype) || file.mimetype.startsWith('image/'))) {
      return res.status(415).json({ ok: false, error: 'Unsupported file type' })
    }
    const meta = saveDiagnosticBuffer({
      jobId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      uploadedBy: req.headers['x-user-id'] as string | undefined,
    })
    return res.status(200).json({ ok: true, meta })
  } catch (e) {
    console.error('Upload error', e)
    return res.status(500).json({ ok: false, error: 'Upload failed' })
  }
})

router.get('/inventory', async (_req, res) => {
  try {
    const summary = await inventoryService.getInventorySummary()
    return res.status(200).json({ ok: true, summary })
  } catch (e) {
    console.error('Inventory diagnostics error', e)
    return res.status(500).json({ ok: false, error: 'Failed to load inventory diagnostics' })
  }
})

export default router

router.delete('/delete', async (req, res) => {
  try {
    const storedName = String((req.body && req.body.storedName) || '')
    if (!storedName) return res.status(400).json({ ok: false, error: 'Missing storedName' })
    const result = deleteDiagnosticByStoredName(storedName)
    if (!result.ok) return res.status(500).json({ ok: false, error: result.error })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Delete error', e)
    return res.status(500).json({ ok: false, error: 'Delete failed' })
  }
})
