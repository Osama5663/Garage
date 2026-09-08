import React from 'react'
import { Upload } from 'lucide-react'
import { useJobOrderStore } from '../stores/jobOrderStore'

type Props = { jobId: string }

export const DiagnosticReportUpload: React.FC<Props> = ({ jobId }) => {
  const { addDiagnosticFile } = useJobOrderStore()
  const [file, setFile] = React.useState<File | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [error, setError] = React.useState<string>('')
  const [title, setTitle] = React.useState<string>('')

  const onSelect: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] || null
    setFile(f)
  }

  const onUpload = async () => {
    if (!file || !title.trim()) return
    setStatus('uploading')
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('jobId', jobId)
      form.append('title', title.trim())
      const res = await fetch('/api/diagnostics/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      if (data?.ok && data.meta) {
        addDiagnosticFile(jobId, {
          id: data.meta.id,
          originalName: data.meta.originalName,
          storedName: data.meta.storedName,
          mimeType: data.meta.mimeType,
          size: data.meta.size,
          uploadedAt: data.meta.uploadedAt,
          uploadedBy: data.meta.uploadedBy || 'system',
          title: title.trim()
        })
        setStatus('success')
        setFile(null)
        setTitle('')
      } else {
        throw new Error(data?.error || 'Upload failed')
      }
    } catch (e: any) {
      setStatus('error')
      setError(e?.message || 'Upload error')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm md:text-base font-semibold text-slate-900 tracking-tight">Upload Diagnostic Report</h4>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="diagnostic-title">
            Report title
          </label>
          <input
            id="diagnostic-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Pre-scan, Post-repair scan"
            className="block w-full text-sm text-slate-700 border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="file"
            accept=".pdf,.docx,image/*"
            onChange={onSelect}
            aria-label="Select diagnostic report file"
            className="block text-sm text-slate-700 focus:outline-none"
          />
          <button
            onClick={onUpload}
            disabled={!file || !title.trim() || status==='uploading'}
            className={`inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              status==='uploading' ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } ${(!file || !title.trim()) && status!=='uploading' ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {status==='uploading' ? 'Uploading…' : 'Upload'}
          </button>
          {status==='success' && (<span className="text-xs text-green-700 ml-2">Uploaded successfully</span>)}
          {status==='error' && (<span className="text-xs text-red-700 ml-2">{error || 'Upload failed'}</span>)}
        </div>
      </div>
    </div>
  )
}
