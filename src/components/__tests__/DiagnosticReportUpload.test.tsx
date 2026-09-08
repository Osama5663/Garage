import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiagnosticReportUpload } from '../../components/DiagnosticReportUpload'

describe('DiagnosticReportUpload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uploads file successfully and shows success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, meta: { id: 'x', originalName: 'r.pdf', storedName: 'job_1_123_r.pdf', mimeType: 'application/pdf', size: 10, uploadedAt: new Date().toISOString(), uploadedBy: 'tester' } })
    } as any)

    render(<DiagnosticReportUpload jobId="job_1" />)
    const titleInput = screen.getByLabelText('Report title') as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Pre-scan' } })
    const input = screen.getByLabelText('Select diagnostic report file') as HTMLInputElement
    const file = new File(['abc'], 'r.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    const btn = screen.getByText('Upload')
    fireEvent.click(btn)
    expect(await screen.findByText('Uploaded successfully')).toBeInTheDocument()
  })

  it('shows error when upload fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as any)
    render(<DiagnosticReportUpload jobId="job_1" />)
    const titleInput = screen.getByLabelText('Report title') as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Failed upload' } })
    const input = screen.getByLabelText('Select diagnostic report file') as HTMLInputElement
    const file = new File(['abc'], 'r.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    fireEvent.change(input, { target: { files: [file] } })
    const btn = screen.getByText('Upload')
    fireEvent.click(btn)
    expect(await screen.findByText('Upload failed')).toBeInTheDocument()
  })
})
