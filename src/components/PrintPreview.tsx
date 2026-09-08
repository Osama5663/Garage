import React, { useEffect, useMemo, useState } from 'react'
import { X, Printer, Eye, AlertTriangle } from 'lucide-react'

type PreviewSection = {
  id: string
  title: string
  render: () => string
}

interface PrintPreviewProps {
  title: string
  open: boolean
  sections: PreviewSection[]
  onClose: () => void
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({ title, open, sections, onClose }) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '')
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const active = useMemo(() => sections.find(s => s.id === activeId) || sections[0], [sections, activeId])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    try {
      const content = active.render()
      setHtml(content)
      setLoading(false)
      console.info('[print-preview]', { section: active.id, length: content.length })
    } catch (e: any) {
      console.error('[print-preview:error]', { section: active.id, message: e?.message })
      setError('Impossible de charger la section. Consultez la console.')
      setLoading(false)
    }
  }, [open, active])

  const printCurrent = () => {
    try {
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write(html)
      w.document.close()
      setTimeout(() => w.print(), 200)
    } catch (e: any) {
      console.error('[print-preview:print-error]', { section: active.id, message: e?.message })
      setError('Erreur pendant l\'impression de la section.')
    }
  }

  const printAll = () => {
    try {
      const merged = sections.map(s => {
        try { return s.render() } catch { return `<div class="p-4 text-red-600">Section ${s.title} introuvable</div>` }
      }).join('\n')
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write(merged)
      w.document.close()
      setTimeout(() => w.print(), 200)
    } catch (e: any) {
      console.error('[print-preview:print-all-error]', { message: e?.message })
      setError('Erreur pendant l\'impression.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printCurrent} className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-1">
              <Printer className="h-4 w-4" /> Imprimer la section
            </button>
            <button onClick={printAll} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-flex items-center gap-1">
              <Printer className="h-4 w-4" /> Imprimer tout
            </button>
            <button onClick={onClose} className="px-2 py-2 text-gray-500 hover:text-gray-700" aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex">
          <aside className="w-60 border-r">
            <ul className="p-2 space-y-1">
              {sections.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveId(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${active.id === s.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <section className="flex-1 overflow-auto">
            {loading && (
              <div className="p-6 text-center">
                <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" aria-label="Chargement" />
                <div className="mt-2 text-sm text-gray-600">Préparation du contenu…</div>
              </div>
            )}
            {!loading && error && (
              <div className="p-6 text-center text-red-600 inline-flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
            {!loading && !error && (
              <div className="min-h-[400px] p-4">
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default PrintPreview
