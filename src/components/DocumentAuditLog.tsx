import React, { useEffect, useState } from 'react'
import { Clock, FileText, Filter, Download, AlertCircle } from 'lucide-react'
import { api } from '../services/api'
import { UserActivity } from '../types/auth'
import { useCurrentUser } from '../stores/authStore'

interface DocumentAuditLogProps {
  documentId?: string
}

const DocumentAuditLog: React.FC<DocumentAuditLogProps> = ({ documentId }) => {
  const currentUser = useCurrentUser()
  const [entries, setEntries] = useState<UserActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterDocumentId, setFilterDocumentId] = useState(documentId || '')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const effectiveDocumentId = (filterDocumentId || documentId || '').trim()
  const totalPages = Math.max(1, Math.ceil((totalCount || entries.length || 1) / pageSize))

  useEffect(() => {
    loadEntries()
  }, [effectiveDocumentId, page, pageSize])

  const loadEntries = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, any> = {
        page,
        limit: pageSize,
      }
      if (effectiveDocumentId) {
        params.search = effectiveDocumentId
      }
      const response = await api.get('/user-actions', { params })
      const data = response.data
      if (data && data.success) {
        const list: UserActivity[] = data.data || []
        setEntries(list)
        setTotalCount(data.pagination?.total || list.length)
      } else {
        setEntries([])
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Error loading document audit entries', err)
      setError('Unable to load document change history.')
      setEntries([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionLabel = (action: string): string => {
    if (action === 'DOCUMENT_CREATED') return 'document créé'
    if (action === 'DOCUMENT_UPDATED') return 'document modifié'
    if (action === 'DOCUMENT_DELETED') return 'document supprimé'
    if (action === 'DOCUMENT_IMAGE_ADDED') return 'image ajoutée'
    if (action === 'DOCUMENT_IMAGE_DELETED') return 'image supprimée'
    return action.replace(/_/g, ' ').toLowerCase()
  }

  const getActionColor = (action: string): string => {
    if (action === 'DOCUMENT_CREATED') return 'text-green-700'
    if (action === 'DOCUMENT_UPDATED') return 'text-blue-700'
    if (action === 'DOCUMENT_DELETED') return 'text-red-700'
    if (action === 'DOCUMENT_IMAGE_ADDED') return 'text-indigo-700'
    if (action === 'DOCUMENT_IMAGE_DELETED') return 'text-amber-700'
    return 'text-gray-700'
  }

  const getParameterLines = (activity: UserActivity): string[] => {
    if (!activity.result) return []
    return [activity.result]
  }

  const handleExportCsv = () => {
    if (!entries.length) return

    const header = ['timestamp', 'user', 'action', 'document_id', 'result']
    const rows = entries.map((entry) => {
      const summary = entry.result || ''
      return [
        new Date(entry.timestamp).toISOString(),
        entry.username,
        entry.action,
        effectiveDocumentId || '',
        summary,
      ]
    })

    const csv = [header, ...rows]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const datePart = new Date().toISOString().split('T')[0]
    a.download = `document-audit-${datePart}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 text-blue-600">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-medium text-blue-900">
            Document tracking is active
          </div>
          <p className="mt-1 text-sm text-blue-800">
            All document creations, edits, deletions, and parameter changes are recorded with timestamps and user
            information. Navigation between pages and general system activity are not tracked here.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-700" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Document change history</h2>
              <p className="text-sm text-gray-600">
                Review all recorded document actions and parameter changes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadEntries}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Refresh
            </button>
            <button
              onClick={handleExportCsv}
              disabled={!entries.length}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export report
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document ID
              </label>
              <input
                type="text"
                value={filterDocumentId}
                onChange={(e) => {
                  setFilterDocumentId(e.target.value)
                  setPage(1)
                }}
                placeholder="Filter by document identifier"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="text-sm text-gray-600">
              <div>
                Showing {entries.length} of {totalCount || entries.length} events.
              </div>
              {effectiveDocumentId && (
                <div className="mt-1">
                  Filtered for document <span className="font-mono text-xs">{effectiveDocumentId}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-start md:justify-end text-xs text-gray-500">
              Logged in as {currentUser?.username || 'system'}
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading document history...
            </div>
          ) : error ? (
            <div className="py-6 text-sm text-red-600">
              {error}
            </div>
          ) : !entries.length ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No document activity has been recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const parameterLines = getParameterLines(entry)
                return (
                  <div
                    key={entry.id}
                    className="border border-gray-200 rounded-md px-4 py-3 bg-white hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${getActionColor(entry.action)}`}>
                            {getActionLabel(entry.action)}
                          </span>
                          {effectiveDocumentId && (
                            <span className="text-xs text-gray-400">
                              on document <span className="font-mono">{effectiveDocumentId}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          Performed by {entry.username}
                        </div>
                        {parameterLines.length > 0 && (
                          <div className="mt-2 text-xs text-gray-700 bg-gray-50 rounded-md px-3 py-2">
                            <div className="font-medium mb-1">
                              Details
                            </div>
                            <ul className="list-disc list-inside space-y-0.5">
                              {parameterLines.map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex items-center justify-between pt-2 text-xs text-gray-600">
                <div>
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DocumentAuditLog
