import fs from 'fs'
import path from 'path'

export type StoredDiagnosticMeta = {
  id: string
  jobId: string
  originalName: string
  storedName: string
  storedPath: string
  mimeType: string
  size: number
  uploadedAt: string
  uploadedBy?: string
}

const baseDir = path.resolve(process.cwd(), 'storage', 'diagnostics')

export const ensureStorageDir = () => {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true })
  }
}

const sanitize = (name: string) => {
  const base = path.basename(name)
  const withoutSlashes = base.replace(/[\\/]/g, '_')
  const noDotDot = withoutSlashes.replace(/\.\.+/g, '_')
  const cleaned = noDotDot.replace(/[^a-zA-Z0-9._-]/g, '_')
  return cleaned.replace(/^\.+/, '_')
}

export const saveDiagnosticBuffer = (opts: {
  jobId: string
  originalName: string
  mimeType: string
  buffer: Buffer
  uploadedBy?: string
}): StoredDiagnosticMeta => {
  ensureStorageDir()
  const timestamp = Date.now()
  const safeOriginal = sanitize(opts.originalName)
  const storedName = `${opts.jobId}_${timestamp}_${safeOriginal}`
  const storedPath = path.join(baseDir, storedName)
  fs.writeFileSync(storedPath, opts.buffer)
  const meta: StoredDiagnosticMeta = {
    id: `diagfile_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
    jobId: opts.jobId,
    originalName: opts.originalName,
    storedName,
    storedPath,
    mimeType: opts.mimeType,
    size: opts.buffer.length,
    uploadedAt: new Date(timestamp).toISOString(),
    uploadedBy: opts.uploadedBy,
  }
  return meta
}

export const deleteDiagnosticByStoredName = (storedName: string): { ok: boolean; error?: string } => {
  ensureStorageDir()
  const safeName = sanitize(storedName)
  const target = path.join(baseDir, safeName)
  const resolved = path.resolve(target)
  if (!resolved.startsWith(baseDir)) {
    return { ok: false, error: 'Invalid path' }
  }
  try {
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved)
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Delete failed' }
  }
}
