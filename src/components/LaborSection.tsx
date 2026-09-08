import { useState } from 'react'
import { t } from '../i18n'
import { formatCurrency } from '../utils/formatters'
import { LaborItem } from '../types/jobOrder'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'

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

interface LaborSectionProps {
  laborItems: LaborItem[]
  onLaborChange: (items: LaborItem[]) => void
  mechanics: Array<{ id: string; name: string; hourlyRate: number }>
}

const LaborSection = ({ laborItems, onLaborChange, mechanics = [] }: LaborSectionProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState<Partial<LaborItem>>({
    description: '',
    category: '',
    discountRate: 0,
    notes: '',
    hours: 1,
    rate: 0,
    mechanic: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [isAddingNew, setIsAddingNew] = useState(false)

  const calculateTotal = (hours: number, rate: number, discountRate?: number): number => {
    const r = Math.min(100, Math.max(0, Number(discountRate ?? 0)))
    const net = rate * (1 - r / 100)
    return hours * net
  }

  const handleAddNew = () => {
    if (newItem.description && newItem.mechanic && newItem.hours && newItem.rate) {
      const mechanic = mechanics.find(m => m.id === newItem.mechanic)
      const item: LaborItem = {
        id: `labor_${Date.now()}`,
        description: newItem.description,
        category: String(newItem.category || '').trim() || undefined,
        discountRate: Math.min(100, Math.max(0, Number(newItem.discountRate ?? 0))),
        notes: newItem.notes || '',
        hours: newItem.hours,
        rate: newItem.rate,
        total: calculateTotal(newItem.hours, newItem.rate, newItem.discountRate),
        mechanic: mechanic?.name || newItem.mechanic,
        date: newItem.date || new Date().toISOString().split('T')[0]
      }
      onLaborChange([...laborItems, item])
      setNewItem({
        description: '',
        category: '',
        discountRate: 0,
        notes: '',
        hours: 1,
        rate: 0,
        mechanic: '',
        date: new Date().toISOString().split('T')[0]
      })
      setIsAddingNew(false)
    }
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
  }

  const handleSaveEdit = (id: string, updatedItem: LaborItem) => {
    const updatedItems = laborItems.map(item => 
      item.id === id ? { ...updatedItem, total: calculateTotal(updatedItem.hours, updatedItem.rate, updatedItem.discountRate) } : item
    )
    onLaborChange(updatedItems)
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    onLaborChange(laborItems.filter(item => item.id !== id))
  }

  const getTotalHours = (): number => {
    return laborItems.reduce((total, item) => total + item.hours, 0)
  }

  const getTotalLaborCost = (): number => {
    return laborItems.reduce((total, item) => total + item.total, 0)
  }

  const formatMoney = (amount: number): string => formatCurrency(amount)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-green-600">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            <path d="M12 22V12"/>
          </svg>
          {t('laborSection.title')}
        </h3>
        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('laborSection.addTask')}</span>
        </button>
      </div>

      {mechanics.length === 0 && (
        <p className="mb-2 text-sm text-red-500">
          Aucun mécanicien actif disponible. Ajoutez un mécanicien dans la gestion des mécaniciens.
        </p>
      )}

      {/* Add New Item Form */}
      {isAddingNew && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('laborSection.fields.taskName')}</label>
              <input
                type="text"
                value={newItem.description || ''}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter task name"
              />
              <input
                type="text"
                value={newItem.notes || ''}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Détails"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('laborSection.fields.category')}</label>
              <input
                list="labor-category-suggestions"
                value={newItem.category || ''}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: Moteur"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('laborSection.fields.technician')}</label>
              <select
                value={newItem.mechanic || ''}
                onChange={(e) => {
                  const mechanic = mechanics.find(m => m.id === e.target.value)
                  setNewItem({ 
                    ...newItem, 
                    mechanic: e.target.value,
                    rate: mechanic?.hourlyRate || 0
                  })
                }}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">{t('laborSection.fields.technician')}</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.name} ({formatMoney(mechanic.hourlyRate)}/h)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('laborSection.fields.hours')}</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={newItem.hours || 1}
                onChange={(e) => setNewItem({ ...newItem, hours: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('laborSection.fields.hourlyRate')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItem.rate || 0}
                onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('laborSection.fields.discount')}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={Number(newItem.discountRate ?? 0)}
                onChange={(e) => setNewItem({ ...newItem, discountRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-7 flex justify-end space-x-2">
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

      {/* Labor Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('laborSection.table.taskName')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('laborSection.table.category')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('laborSection.table.technician')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('laborSection.table.hours')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('laborSection.table.hourlyRate')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('laborSection.table.discount')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('laborSection.table.totalPrice')}</th>
              <th className="text-left py-2 px-3 font-medium text-gray-700">{t('laborSection.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {laborItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  {t('laborSection.empty')}
                </td>
              </tr>
            ) : (
              laborItems.map((item) => (
                <EditableLaborRow
                  key={item.id}
                  item={item}
                  isEditing={editingId === item.id}
                  onSave={(updatedItem) => handleSaveEdit(item.id, updatedItem)}
                  onEdit={() => handleEdit(item.id)}
                  onDelete={() => handleDelete(item.id)}
                  mechanics={mechanics}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {laborItems.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium text-green-900">
              {t('laborSection.summary.totalHours')}: <span className="font-bold">{getTotalHours().toFixed(1)}</span>
            </div>
            <div className="text-sm font-medium text-green-900">
              {t('laborSection.summary.totalCost')}: <span className="font-bold">{formatMoney(getTotalLaborCost())}</span>
            </div>
          </div>
        </div>
      )}

      <datalist id="labor-category-suggestions">
        {categorySuggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  )
}

interface EditableLaborRowProps {
  item: LaborItem
  isEditing: boolean
  onSave: (item: LaborItem) => void
  onEdit: () => void
  onDelete: () => void
  mechanics: Array<{ id: string; name: string; hourlyRate: number }>
}

const EditableLaborRow = ({ item, isEditing, onSave, onEdit, onDelete, mechanics }: EditableLaborRowProps) => {
  const [editedItem, setEditedItem] = useState<LaborItem>(item)

  const handleSave = () => {
    onSave(editedItem)
  }

  const handleCancel = () => {
    setEditedItem(item)
    onEdit()
  }

  if (isEditing) {
    const r = Math.min(100, Math.max(0, Number(editedItem.discountRate ?? 0)))
    const total = editedItem.hours * editedItem.rate * (1 - r / 100)

    return (
      <tr className="border-b border-gray-100 bg-green-50">
        <td className="py-2 px-3">
          <input
            type="text"
            value={editedItem.description}
            onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <input
            type="text"
            value={editedItem.notes || ''}
            onChange={(e) => setEditedItem({ ...editedItem, notes: e.target.value })}
            className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Détails"
          />
        </td>
        <td className="py-2 px-3">
          <input
            list="labor-category-suggestions"
            value={editedItem.category || ''}
            onChange={(e) => setEditedItem({ ...editedItem, category: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </td>
        <td className="py-2 px-3">
          <select
            value={mechanics.find(m => m.name === editedItem.mechanic)?.id || ''}
            onChange={(e) => {
              const mechanic = mechanics.find(m => m.id === e.target.value)
              setEditedItem({ 
                ...editedItem, 
                mechanic: mechanic?.name || editedItem.mechanic,
                rate: mechanic?.hourlyRate || editedItem.rate
              })
            }}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">{t('laborSection.fields.technician')}</option>
            {mechanics.map((mechanic) => (
              <option key={mechanic.id} value={mechanic.id}>
                {mechanic.name}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={editedItem.hours}
            onChange={(e) => setEditedItem({ ...editedItem, hours: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={editedItem.rate}
            onChange={(e) => setEditedItem({ ...editedItem, rate: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={Number(editedItem.discountRate ?? 0)}
            onChange={(e) => setEditedItem({ ...editedItem, discountRate: parseFloat(e.target.value) || 0 })}
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
        <div>{item.description}</div>
        {item.notes ? <div className="text-xs text-gray-500 font-normal">{item.notes}</div> : null}
      </td>
      <td className="py-2 px-3 text-gray-700">{item.category || ''}</td>
      <td className="py-2 px-3 text-gray-700">{item.mechanic}</td>
      <td className="py-2 px-3 text-gray-700">{item.hours.toFixed(1)}</td>
      <td className="py-2 px-3 text-gray-700">{formatCurrency(item.rate)}</td>
      <td className="py-2 px-3 text-gray-700">{Number(item.discountRate ?? 0)}%</td>
      <td className="py-2 px-3 font-medium text-green-900">{formatCurrency(item.total)}</td>
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

export default LaborSection
