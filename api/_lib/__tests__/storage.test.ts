import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { ensureStorageDir, saveDiagnosticBuffer } from '../services/storage'

describe('Diagnostic storage', () => {
  const tmpBuffer = Buffer.from('test file content')
  const baseDir = path.resolve(process.cwd(), 'storage', 'diagnostics')
  let storedPath = ''

  beforeAll(() => {
    ensureStorageDir()
  })

  it('saves file and returns metadata', () => {
    const meta = saveDiagnosticBuffer({
      jobId: 'job_test',
      originalName: 'Report One.pdf',
      mimeType: 'application/pdf',
      buffer: tmpBuffer,
      uploadedBy: 'tester',
    })
    storedPath = meta.storedPath
    expect(meta.jobId).toBe('job_test')
    expect(meta.originalName).toBe('Report One.pdf')
    expect(meta.mimeType).toBe('application/pdf')
    expect(meta.size).toBe(tmpBuffer.length)
    expect(fs.existsSync(meta.storedPath)).toBe(true)
    expect(meta.storedName).toMatch(/^job_test_\d+_Report_One.pdf$/)
    expect(path.dirname(meta.storedPath)).toBe(baseDir)
  })

  it('sanitizes dangerous filenames', () => {
    const meta = saveDiagnosticBuffer({
      jobId: 'job_x',
      originalName: '../evil\\name?.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: tmpBuffer,
    })
    expect(meta.storedName).not.toContain('..')
    expect(meta.storedName).not.toMatch(/[\\/]/)
    expect(meta.storedName.endsWith('.docx')).toBe(true)
    expect(fs.existsSync(meta.storedPath)).toBe(true)
  })

  afterAll(() => {
    try { if (storedPath && fs.existsSync(storedPath)) fs.unlinkSync(storedPath) } catch {}
  })
})
