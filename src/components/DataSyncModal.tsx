import React from 'react'
import { exportData, importData } from '../utils/dataSync'
import { XCircle, Download, Upload, AlertTriangle } from 'lucide-react'

export const DataSyncModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [error, setError] = React.useState<string | null>(null)
  if (!open) return null

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `garage-data-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    console.log('[analytics] data_export_download')
  }

  const handleImport: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      const res = importData(text)
      if (!res.ok) setError(res.error || 'Import failed')
      else setError(null)
      console.log('[analytics] data_import_apply', { ok: res.ok })
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="data-sync-title">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 id="data-sync-title" className="text-lg font-semibold">Synchronisation des données</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800" aria-label="Close"><XCircle className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-3">Exportez ou importez les données entre les environnements (preview ↔ prod).</p>
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded mb-3"><AlertTriangle className="h-4 w-4" /><span>{error}</span></div>
        )}
        <div className="flex items-center justify-between gap-3">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Export data">
            <Download className="h-4 w-4" /> Exporter
          </button>
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer" aria-label="Import data">
            <Upload className="h-4 w-4" /> Importer
            <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  )
}

