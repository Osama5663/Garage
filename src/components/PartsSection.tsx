import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import { formatCurrency } from '../utils/formatters'
import { JobPart } from '../types/jobOrder'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'
import { useInventoryStore } from '../stores/inventoryStore'

const categorySuggestions = [
  'Moteur',
  'Injection',
  'Allumage',
  'Distribution',
  'Refroidissement',
  'Lubrification',
  'Freinage',
  'Suspension',
  'Direction',
  'Transmission',
  'Embrayage',
  'Échappement',
  'Climatisation',
  'Électricité',
  'Batterie / Démarrage',
  'Pneumatiques',
  'Carrosserie',
  'Entretien / Vidange',
  'Diagnostic',
  'Divers'
]

const findInventoryItemForJobPart = (inventoryItems: any[], part: Partial<JobPart>) => {
  if (!inventoryItems || inventoryItems.length === 0) return undefined
  const number = (part.partNumber || '').trim().toLowerCase()
  const name = (part.name || '').trim().toLowerCase()
  return inventoryItems.find((item) => {
    const sku = item.sku?.toLowerCase()
    const manufacturerPart = item.manufacturerPartNumber?.toLowerCase()
    const supplierPart = item.supplierPartNumber?.toLowerCase()
    const itemName = item.name?.toLowerCase()
    if (number && (sku === number || manufacturerPart === number || supplierPart === number)) return true
    if (name && itemName === name) return true
    return false
  })
}

interface PartsSectionProps {
  parts: JobPart[]
  onPartsChange: (parts: JobPart[]) => void
  availableParts?: Array<{ id: string; name: string; partNumber: string; unitCost: number; description: string; supplier: string }>
}

const PartsSection = ({ parts, onPartsChange, availableParts: _availableParts = [] }: PartsSectionProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newPart, setNewPart] = useState<Partial<JobPart>>({
    name: '',
    category: '',
    discountRate: 0,
    partNumber: '',
    description: '',
    quantity: 1,
    unitCost: 0,
    supplier: '',
    status: 'installed'
  })
  const [newPartError, setNewPartError] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [lookupResults, setLookupResults] = useState<any[]>([])
  const [isLookupOpen, setIsLookupOpen] = useState(false)
  const [isLoadingLookup, setIsLoadingLookup] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const cacheRef = useRef<Map<string, any[]>>(new Map())
  const lookupContainerRef = useRef<HTMLDivElement | null>(null)

  const { inventoryItems } = useInventoryStore()

  const doLocalLookup = (query: string) => {
    const term = query.trim().toLowerCase()
    if (!term || term.length < 2) return []
    return (inventoryItems || []).filter(item => {
      const nameMatch = item.name?.toLowerCase().includes(term)
      const pnMatch = item.sku?.toLowerCase() === term || item.manufacturerPartNumber?.toLowerCase() === term || item.supplierPartNumber?.toLowerCase() === term
      return nameMatch || pnMatch
    }).slice(0, 10)
  }

  const triggerLookup = (query: string) => {
    setIsLoadingLookup(true)
    setLookupError(null)
    // Cache first
    const cached = cacheRef.current.get(query)
    if (cached) {
      setLookupResults(cached)
      setIsLookupOpen(true)
      setIsLoadingLookup(false)
      return
    }
    // Local store lookup (fallback when no API)
    const results = doLocalLookup(query)
    cacheRef.current.set(query, results)
    setLookupResults(results)
    setIsLookupOpen(true)
    setIsLoadingLookup(false)
  }

  // Debounced lookup when part name or number changes
  useEffect(() => {
    const q = (newPart.partNumber && newPart.partNumber.trim()) || (newPart.name && newPart.name.trim()) || ''
    if (!isAddingNew) return
    const handle = setTimeout(() => {
      if (q.length >= 2) triggerLookup(q)
      else { setIsLookupOpen(false); setLookupResults([]) }
    }, 300)
    return () => clearTimeout(handle)
  }, [newPart.name, newPart.partNumber, isAddingNew])

  // Close lookup on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (lookupContainerRef.current && !lookupContainerRef.current.contains(e.target as Node)) {
        setIsLookupOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const selectInventoryItem = (item: any) => {
    setNewPart({
      ...newPart,
      name: item.name,
      partNumber: item.sku || item.manufacturerPartNumber || item.supplierPartNumber || newPart.partNumber || '',
      description: item.description || newPart.description || '',
      unitCost: (typeof item.sellingPrice === 'number' ? item.sellingPrice : item.unitCost) || 0,
      supplier: item.supplierName || newPart.supplier || ''
    })
    setNewPartError(null)
    setIsLookupOpen(false)
    setHighlightIndex(-1)
  }

  const onLookupKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isLookupOpen || lookupResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => Math.min(prev + 1, lookupResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = highlightIndex >= 0 ? highlightIndex : 0
      selectInventoryItem(lookupResults[idx])
    } else if (e.key === 'Escape') {
      setIsLookupOpen(false)
      setHighlightIndex(-1)
    }
  }

  const calculateTotal = (quantity: number, unitCost: number, discountRate?: number): number => {
    const r = Math.min(100, Math.max(0, Number(discountRate ?? 0)))
    const net = unitCost * (1 - r / 100)
    return quantity * net
  }

  const handleAddNew = () => {
    if (newPart.name && newPart.quantity && newPart.unitCost !== undefined) {
      const inventoryItem = findInventoryItemForJobPart(inventoryItems || [], newPart)
      if (inventoryItem && newPart.quantity > inventoryItem.quantity) {
        setNewPartError(
          `Quantité demandée (${newPart.quantity}) supérieure au stock disponible (${inventoryItem.quantity})`
        )
        return
      }
      const part: JobPart = {
        id: `part_${Date.now()}`,
        name: newPart.name,
        category: String(newPart.category || '').trim() || undefined,
        discountRate: Math.min(100, Math.max(0, Number(newPart.discountRate ?? 0))),
        partNumber: newPart.partNumber || '',
        description: newPart.description || '',
        quantity: newPart.quantity,
        unitCost: newPart.unitCost,
        totalCost: calculateTotal(newPart.quantity, newPart.unitCost, newPart.discountRate),
        supplier: newPart.supplier || '',
        status: 'installed',
        orderedDate: new Date().toISOString().split('T')[0]
      }
      onPartsChange([...parts, part])
      setNewPart({
        name: '',
        category: '',
        discountRate: 0,
        partNumber: '',
        description: '',
        quantity: 1,
        unitCost: 0,
        supplier: '',
        status: 'installed'
      })
      setNewPartError(null)
      setIsAddingNew(false)
    }
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
  }

  const handleSaveEdit = (id: string, updatedPart: JobPart) => {
    const updatedParts = parts.map(part => 
      part.id === id ? { ...updatedPart, totalCost: calculateTotal(updatedPart.quantity, updatedPart.unitCost, updatedPart.discountRate) } : part
    )
    onPartsChange(updatedParts)
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    onPartsChange(parts.filter(part => part.id !== id))
  }

  const getTotalPartsCost = (): number => {
    return parts.reduce((total, part) => total + part.totalCost, 0)
  }

  const formatMoney = (amount: number): string => formatCurrency(amount)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-green-600">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          {t('partsSection.title')}
        </h3>
        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('partsSection.addPart')}</span>
        </button>
      </div>

      {isAddingNew && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-5">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('partsSection.fields.name')}</label>
              <input
                type="text"
                value={newPart.name || ''}
                onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                onKeyDown={onLookupKeyDown}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Nom de la pièce"
              />
              <input
                type="text"
                value={newPart.description || ''}
                onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Détails"
              />
              <label className="mt-2 block text-xs font-medium text-gray-700 mb-1">{t('partsSection.fields.category')}</label>
              <input
                list="parts-category-suggestions"
                type="text"
                value={newPart.category || ''}
                onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: Moteur"
              />
              {/* Lookup dropdown for name/number */}
              <div ref={lookupContainerRef} className="relative">
                {isLookupOpen && (
                  <div role="listbox" aria-label="Stock results" className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-56 overflow-auto">
                    {isLoadingLookup && (
                      <div className="p-2 text-sm text-gray-500">{t('partsSection.lookup.loading')}</div>
                    )}
                    {!isLoadingLookup && lookupError && (
                      <div className="p-2 text-sm text-red-600">{lookupError}</div>
                    )}
                    {!isLoadingLookup && !lookupError && lookupResults.length === 0 && (
                      <div className="p-2 text-sm text-gray-500">{t('partsSection.lookup.noMatch')}</div>
                    )}
                    {!isLoadingLookup && lookupResults.map((item, idx) => (
                      <button
                        type="button"
                        key={item.id}
                        role="option"
                        aria-selected={highlightIndex === idx}
                        onClick={() => selectInventoryItem(item)}
                        className={`w-full text-left p-2 text-sm ${highlightIndex === idx ? 'bg-green-50' : ''} hover:bg-green-50 focus:outline-none`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-600">{item.sku || item.manufacturerPartNumber || item.supplierPartNumber}</div>
                            <div className="text-xs text-gray-500 truncate">{item.description}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs ${item.quantity <= (item.minimumStock || 0) ? 'text-red-600' : 'text-green-700'}`}>{t('partsSection.lookup.stock')}: {item.quantity}</div>
                            <div className="text-xs text-gray-700">{t('partsSection.lookup.price')}: {formatMoney(Number(item.sellingPrice ?? item.unitCost) || 0)}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('partsSection.fields.number')}</label>
              <input
                type="text"
                value={newPart.partNumber || ''}
                onChange={(e) => setNewPart({ ...newPart, partNumber: e.target.value })}
                onKeyDown={onLookupKeyDown}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t('partsSection.fields.number')}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('partsSection.fields.quantity')}</label>
              <input
                type="number"
                min="1"
                value={newPart.quantity || 1}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1
                  const updated = { ...newPart, quantity: value }
                  setNewPart(updated)
                  setNewPartError(null)
                  const inventoryItem = findInventoryItemForJobPart(inventoryItems || [], updated)
                  if (inventoryItem && value > inventoryItem.quantity) {
                    setNewPartError(
                      `Quantité demandée (${value}) supérieure au stock disponible (${inventoryItem.quantity})`
                    )
                  }
                }}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {(() => {
                const inventoryItem = findInventoryItemForJobPart(inventoryItems || [], newPart)
                if (!inventoryItem) return null
                const colorClass =
                  inventoryItem.quantity === 0
                    ? 'text-red-600'
                    : inventoryItem.quantity <= (inventoryItem.minimumStock || 0)
                    ? 'text-yellow-600'
                    : 'text-green-600'
                return (
                  <p className="mt-1 text-xs text-gray-600">
                    Stock disponible:{' '}
                    <span className={colorClass}>
                      {inventoryItem.quantity}
                    </span>
                  </p>
                )
              })()}
              {newPartError && (
                <p className="mt-1 text-xs text-red-600">
                  {newPartError}
                </p>
              )}
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('partsSection.fields.discount')}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={Number(newPart.discountRate ?? 0)}
                onChange={(e) => setNewPart({ ...newPart, discountRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('partsSection.fields.unitPrice')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newPart.unitCost || 0}
                onChange={(e) => setNewPart({ ...newPart, unitCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-1 flex items-end space-x-2">
              <button
                type="button"
                onClick={handleAddNew}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm transition-colors"
              >
                <Save className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-sm transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('partsSection.table.name')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('partsSection.table.category')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('partsSection.table.number')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('partsSection.table.quantity')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('partsSection.table.unitPrice')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('partsSection.table.discount')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('partsSection.table.totalPrice')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('partsSection.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {parts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  {t('partsSection.empty')}
                </td>
              </tr>
            ) : (
              parts.map((part) => (
                <EditablePartRow
                  key={part.id}
                  part={part}
                  isEditing={editingId === part.id}
                  onSave={(updatedPart) => handleSaveEdit(part.id, updatedPart)}
                  onEdit={() => handleEdit(part.id)}
                  onDelete={() => handleDelete(part.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {parts.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium text-green-900">
              {t('partsSection.summary.totalParts')}: <span className="font-bold">{parts.reduce((total, part) => total + part.quantity, 0)}</span>
            </div>
            <div className="text-sm font-medium text-green-900">
              {t('partsSection.summary.totalCost')}: <span className="font-bold">{formatMoney(getTotalPartsCost())}</span>
            </div>
          </div>
        </div>
      )}

      <datalist id="parts-category-suggestions">
        {categorySuggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  )
}

interface EditablePartRowProps {
  part: JobPart
  isEditing: boolean
  onSave: (part: JobPart) => void
  onEdit: () => void
  onDelete: () => void
}

const EditablePartRow = ({ part, isEditing, onSave, onEdit, onDelete }: EditablePartRowProps) => {
  const { inventoryItems } = useInventoryStore()
  const [editedPart, setEditedPart] = useState<JobPart>(part)
  const [editError, setEditError] = useState<string | null>(null)

  const handleSave = () => {
    const inventoryItem = findInventoryItemForJobPart(inventoryItems || [], editedPart)
    if (inventoryItem && editedPart.quantity > inventoryItem.quantity) {
      setEditError(
        `Quantité demandée (${editedPart.quantity}) supérieure au stock disponible (${inventoryItem.quantity})`
      )
      return
    }
    onSave(editedPart)
  }

  const handleCancel = () => {
    setEditedPart(part)
    setEditError(null)
    onEdit()
  }

  if (isEditing) {
    const r = Math.min(100, Math.max(0, Number(editedPart.discountRate ?? 0)))
    const total = editedPart.quantity * editedPart.unitCost * (1 - r / 100)

    return (
      <tr className="border-b border-gray-100 bg-green-50">
        <td className="py-2 px-3">
          <input
            type="text"
            value={editedPart.name}
            onChange={(e) => setEditedPart({ ...editedPart, name: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <input
            type="text"
            value={editedPart.description || ''}
            onChange={(e) => setEditedPart({ ...editedPart, description: e.target.value })}
            className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Détails"
          />
        </td>
        <td className="py-2 px-3">
          <input
            list="parts-category-suggestions"
            type="text"
            value={editedPart.category || ''}
            onChange={(e) => setEditedPart({ ...editedPart, category: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="text"
            value={editedPart.partNumber}
            onChange={(e) => setEditedPart({ ...editedPart, partNumber: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            min="1"
            value={editedPart.quantity}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1
              const updated = { ...editedPart, quantity: value }
              setEditedPart(updated)
              setEditError(null)
              const inventoryItem = findInventoryItemForJobPart(inventoryItems || [], updated)
              if (inventoryItem && value > inventoryItem.quantity) {
                setEditError(
                  `Quantité demandée (${value}) supérieure au stock disponible (${inventoryItem.quantity})`
                )
              }
            }}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {(() => {
            const inventoryItem = findInventoryItemForJobPart(inventoryItems || [], editedPart)
            if (!inventoryItem) return null
            const colorClass =
              inventoryItem.quantity === 0
                ? 'text-red-600'
                : inventoryItem.quantity <= (inventoryItem.minimumStock || 0)
                ? 'text-yellow-600'
                : 'text-green-600'
            return (
              <p className="mt-1 text-xs text-gray-600">
                Stock disponible:{' '}
                <span className={colorClass}>
                  {inventoryItem.quantity}
                </span>
              </p>
            )
          })()}
          {editError && (
            <p className="mt-1 text-xs text-red-600">
              {editError}
            </p>
          )}
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={editedPart.unitCost}
            onChange={(e) => setEditedPart({ ...editedPart, unitCost: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={Number(editedPart.discountRate ?? 0)}
            onChange={(e) => setEditedPart({ ...editedPart, discountRate: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </td>
        <td className="py-2 px-3 font-medium text-green-900">
          {formatCurrency(total)}
        </td>
        <td className="py-2 px-3">
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={handleSave}
              className="text-green-600 hover:text-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-2 px-3 font-medium text-gray-900">
        <div>{part.name}</div>
        {part.description ? <div className="text-xs text-gray-500 font-normal">{part.description}</div> : null}
      </td>
      <td className="py-2 px-3 text-gray-700">{part.category || ''}</td>
      <td className="py-2 px-3 text-gray-700">{part.partNumber}</td>
      <td className="py-2 px-3 text-gray-700">{part.quantity}</td>
      <td className="py-2 px-3 text-gray-700">{formatCurrency(part.unitCost)}</td>
      <td className="py-2 px-3 text-gray-700">{Number(part.discountRate ?? 0)}%</td>
      <td className="py-2 px-3 font-medium text-green-900">{formatCurrency(part.totalCost)}</td>
      <td className="py-2 px-3">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default PartsSection
