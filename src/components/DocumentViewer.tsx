import React, { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, Printer } from 'lucide-react'

type Source =
  | { type: 'pdf'; url: string }
  | { type: 'pdf'; data: ArrayBuffer }
  | { type: 'docx'; url: string }
  | { type: 'docx'; data: ArrayBuffer }
  | { type: 'html'; html: string }

interface DocumentViewerProps {
  title: string
  source: Source
  open: boolean
  onClose: () => void
  extraControls?: React.ReactNode
}

const CDN_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.449/pdf.worker.min.js'

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ title, source, open, onClose, extraControls }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [pageCount, setPageCount] = useState<number>(1)
  const [page, setPage] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState<number>(1)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        if (source.type === 'pdf') {
          const pdfjs = await import('pdfjs-dist')
          ;(pdfjs as any).GlobalWorkerOptions.workerSrc = CDN_WORKER
          const data = 'url' in source ? (await (await fetch(source.url)).arrayBuffer()) : source.data
          const doc = await (pdfjs as any).getDocument({ data }).promise
          setPageCount(doc.numPages)
          const render = async (p: number) => {
            const pageObj = await doc.getPage(p)
            const viewport = pageObj.getViewport({ scale })
            const canvas = canvasRef.current!
            const ctx = canvas.getContext('2d')!
            canvas.width = viewport.width
            canvas.height = viewport.height
            await pageObj.render({ canvasContext: ctx, viewport }).promise
          }
          await render(page)
          setLoading(false)

          const unsub = () => {}
          return { render, unsub }
        }

        if (source.type === 'docx') {
          const { renderAsync } = await import('docx-preview')
          const data = 'url' in source ? (await (await fetch(source.url)).arrayBuffer()) : source.data
          const container = containerRef.current!
          container.innerHTML = ''
          await renderAsync(data, container, undefined, { inWrapper: true })
          setPageCount(1)
          setLoading(false)
          return { render: async () => {}, unsub: () => {} }
        }

        if (source.type === 'html') {
          const container = containerRef.current!
          container.innerHTML = source.html
          setPageCount(1)
          setLoading(false)
          return { render: async () => {}, unsub: () => {} }
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load document')
        setLoading(false)
        return { render: async () => {}, unsub: () => {} }
      }
      return { render: async () => {}, unsub: () => {} }
    }

    let api: { render: (p: number) => Promise<void>; unsub: () => void } | null = null
    load().then(res => { api = res })
    return () => { api?.unsub?.() }
  }, [open, source, scale])

  useEffect(() => {
    const rerender = async () => {
      try {
        if (source.type !== 'pdf') return
        const pdfjs = await import('pdfjs-dist')
        ;(pdfjs as any).GlobalWorkerOptions.workerSrc = CDN_WORKER
        const data = 'url' in source ? (await (await fetch(source.url)).arrayBuffer()) : source.data
        const doc = await (pdfjs as any).getDocument({ data }).promise
        const pageObj = await doc.getPage(page)
        const viewport = pageObj.getViewport({ scale })
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        canvas.width = viewport.width
        canvas.height = viewport.height
        await pageObj.render({ canvasContext: ctx, viewport }).promise
      } catch {}
    }
    if (open && source.type === 'pdf') rerender()
  }, [page])

  const prev = () => setPage(p => Math.max(1, p - 1))
  const next = () => setPage(p => Math.min(pageCount, p + 1))
  const zoomIn = () => setScale(s => Math.min(2.5, s + 0.1))
  const zoomOut = () => setScale(s => Math.max(0.5, s - 0.1))

  const print = () => {
    try {
      if (source.type === 'pdf') {
        const url = 'url' in source ? source.url : URL.createObjectURL(new Blob([source.data], { type: 'application/pdf' }))
        const w = window.open(url, '_blank')
        if (w) setTimeout(() => w.print(), 200)
      } else if (source.type === 'html') {
        const w = window.open('', '_blank')
        if (!w) return
        w.document.write(String((source as any).html))
        w.document.close()
        setTimeout(() => w.print(), 200)
      } else {
        const container = containerRef.current
        if (!container) return
        const w = window.open('', '_blank')
        if (!w) return
        w.document.write(container.innerHTML)
        w.document.close()
        setTimeout(() => w.print(), 200)
      }
    } catch (e: any) {
      setError(e?.message || 'Print failed')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={zoomOut} className="px-2 py-1 border rounded-md" title="Zoom out"><ZoomOut className="h-4 w-4" /></button>
            <button onClick={zoomIn} className="px-2 py-1 border rounded-md" title="Zoom in"><ZoomIn className="h-4 w-4" /></button>
            <button onClick={print} className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-1"><Printer className="h-4 w-4" /> Imprimer</button>
            {extraControls}
          </div>
        </div>
        <div className="flex-1 overflow-auto flex">
          <aside className="w-56 border-r p-3 flex flex-col gap-2">
            <div className="text-sm text-gray-700">Pages</div>
            <div className="flex items-center gap-2">
              <button onClick={prev} disabled={page <= 1} className={`px-2 py-1 border rounded-md ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label="Page précédente"><ChevronLeft className="h-4 w-4" /></button>
              <div className="text-sm">{page} / {pageCount}</div>
              <button onClick={next} disabled={page >= pageCount} className={`px-2 py-1 border rounded-md ${page >= pageCount ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label="Page suivante"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="text-xs text-gray-500">{source.type.toUpperCase()}</div>
          </aside>
          <section className="flex-1 grid place-items-center p-3 overflow-auto">
            {loading && (
              <div className="text-center text-gray-600">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <div className="mt-2 text-sm">Chargement du document…</div>
              </div>
            )}
            {!loading && error && (
              <div className="text-center text-red-600">
                {error}
              </div>
            )}
            {!loading && !error && (
              source.type === 'pdf' ? (
                <canvas ref={canvasRef} className="shadow border bg-white" style={{ maxWidth: '100%', height: 'auto' }} />
              ) : (
                <div ref={containerRef} className="shadow border bg-white w-full max-w-[900px] mx-auto" />
              )
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default DocumentViewer
