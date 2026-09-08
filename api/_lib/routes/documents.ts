import express, { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import {
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../repositories/documentsRepo.js'
import { logUserAction } from '../services/userActionService'

const router = express.Router()

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = 'uploads/documents'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

const getUserContext = (req: Request) => {
  const header = req.headers.authorization
  if (!header) {
    return {
      userId: 'system',
      username: 'system',
    }
  }
  const parts = header.split(' ')
  if (parts.length !== 2) {
    return {
      userId: 'system',
      username: 'system',
    }
  }
  const token = parts[1]
  try {
    const decoded = Buffer.from(token, 'base64').toString('ascii')
    const segments = decoded.split('-')
    if (segments.length >= 1 && segments[0]) {
      return {
        userId: segments[0],
        username: segments[0],
      }
    }
  } catch {
  }
  return {
    userId: 'system',
    username: 'system',
  }
}

// GET /api/documents - Get all documents
router.get('/', async (_req: Request, res: Response) => {
  try {
    const documents = await listDocuments()
    res.json({ success: true, data: documents })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents'
    })
  }
})

// GET /api/documents/:id - Get single document
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const document = await getDocumentById(id)
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      })
    }
    res.json({
      success: true,
      data: document
    })
  } catch (error) {
    console.error('Error fetching document by id:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document'
    })
  }
})

// POST /api/documents - Create new document
router.post('/', async (req: Request, res: Response) => {
  try {
    const document = await createDocument(req.body)
    const user = getUserContext(req)
    await logUserAction({
      req,
      userId: user.userId,
      username: user.username,
      action: 'DOCUMENT_CREATED',
      result: `Document created (id: ${document._id})`,
    })
    res.status(201).json({ success: true, data: document })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to create document'
    })
  }
})

// PUT /api/documents/:id - Update document
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const document = await updateDocument(id, req.body)
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' })
    }
    const user = getUserContext(req)
    await logUserAction({
      req,
      userId: user.userId,
      username: user.username,
      action: 'DOCUMENT_UPDATED',
      result: `Document updated (id: ${id})`,
    })
    res.json({ success: true, data: document })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to update document'
    })
  }
})

// DELETE /api/documents/:id - Delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const ok = await deleteDocument(id)
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Document not found' })
    }
    const user = getUserContext(req)
    await logUserAction({
      req,
      userId: user.userId,
      username: user.username,
      action: 'DOCUMENT_DELETED',
      result: `Document deleted (id: ${id})`,
    })
    res.json({
      success: true,
      message: 'Document deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    })
  }
})

// POST /api/documents/:id/images - Upload image for document body
router.post('/:id/images', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      })
    }

    const doc = await getDocumentById(req.params.id)
    if (!doc) {
      fs.unlinkSync(req.file.path)
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      })
    }

    const imageUrl = `/uploads/documents/${req.file.filename}`
    const images = Array.isArray(doc.body?.images) ? doc.body.images : []
    images.push({
      url: imageUrl,
      filename: req.file.filename,
      position: images.length
    })
    doc.body = { ...(doc.body || { content: '', alignment: 'left', images: [] }), images }
    await updateDocument(req.params.id, doc)

    const user = getUserContext(req)
    await logUserAction({
      req,
      userId: user.userId,
      username: user.username,
      action: 'DOCUMENT_IMAGE_ADDED',
      result: `Image ${req.file.filename} added to document ${req.params.id}`,
    })

    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        position: images.length - 1
      }
    })
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    })
  }
})

// DELETE /api/documents/:id/images/:filename - Delete image from document
router.delete('/:id/images/:filename', async (req: Request, res: Response) => {
  try {
    const document = await getDocumentById(req.params.id)
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      })
    }

    const images = Array.isArray(document.body?.images) ? document.body.images : []
    const imageIndex = images.findIndex((img: any) => img.filename === req.params.filename)
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      })
    }

    // Delete physical file
    const imagePath = path.join('uploads/documents', req.params.filename)
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath)
    }

    const removedImage = images[imageIndex]
    images.splice(imageIndex, 1)
    document.body = { ...(document.body || { content: '', alignment: 'left', images: [] }), images }
    await updateDocument(req.params.id, document)

    const user = getUserContext(req)
    await logUserAction({
      req,
      userId: user.userId,
      username: user.username,
      action: 'DOCUMENT_IMAGE_DELETED',
      result: `Image ${removedImage.filename} removed from document ${req.params.id}`,
    })

    res.json({
      success: true,
      message: 'Image deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete image'
    })
  }
})

export default router
