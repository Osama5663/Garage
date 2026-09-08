import { useState } from 'react'
import { 
  Plus, 
  Trash2, 
  Save,
  Calculator,
  Clock,
  DollarSign
} from 'lucide-react'
import { 
  JobDescriptionFormData, 
  PartItem, 
  PartItemFormData, 
  LaborItem, 
  LaborItemFormData 
} from '../types/jobDescription'
import { formatCurrency } from '../utils/formatters'

interface EnhancedJobDescriptionFormProps {
  initialData?: Partial<JobDescriptionFormData>
  onSave: (formData: JobDescriptionFormData) => void
  onCancel: () => void
  isEditing?: boolean
}

const EnhancedJobDescriptionForm = ({ 
  initialData, 
  onSave, 
  onCancel, 
  isEditing = false
}: EnhancedJobDescriptionFormProps) => {
  const [formData, setFormData] = useState<JobDescriptionFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'medium',
    estimatedHours: initialData?.estimatedHours || 1,
    parts: initialData?.parts || [],
    labor: initialData?.labor || []
  })

  const [newPart, setNewPart] = useState<PartItemFormData>({ name: '', quantity: 1, unitCost: 0 })
  const [newLabor, setNewLabor] = useState<LaborItemFormData>({ description: '', hours: 1, hourlyRate: 75 })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const calculatePartsTotal = () => {
    return formData.parts.reduce((total, part) => total + (part.quantity * part.unitCost), 0)
  }

  const calculateLaborTotal = () => {
    return formData.labor.reduce((total, labor) => total + (labor.hours * labor.hourlyRate), 0)
  }

  const calculateGrandTotal = () => {
    return calculatePartsTotal() + calculateLaborTotal()
  }

  const addPart = () => {
    if (newPart.name && newPart.quantity > 0 && newPart.unitCost >= 0) {
      const part: PartItem = {
        id: `part_${Date.now()}_${Math.random()}`,
        name: newPart.name,
        quantity: newPart.quantity,
        unitCost: newPart.unitCost,
        totalCost: newPart.quantity * newPart.unitCost
      }
      setFormData(prev => ({ ...prev, parts: [...prev.parts, part] }))
      setNewPart({ name: '', quantity: 1, unitCost: 0 })
    }
  }

  const removePart = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      parts: prev.parts.filter((_, i) => i !== index) 
    }))
  }

  const addLabor = () => {
    if (newLabor.description && newLabor.hours > 0 && newLabor.hourlyRate >= 0) {
      const labor: LaborItem = {
        id: `labor_${Date.now()}_${Math.random()}`,
        description: newLabor.description,
        hours: newLabor.hours,
        hourlyRate: newLabor.hourlyRate,
        totalCost: newLabor.hours * newLabor.hourlyRate
      }
      setFormData(prev => ({ ...prev, labor: [...prev.labor, labor] }))
      setNewLabor({ description: '', hours: 1, hourlyRate: 75 })
    }
  }

  const removeLabor = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      labor: prev.labor.filter((_, i) => i !== index) 
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }
    
    if (formData.estimatedHours <= 0) {
      newErrors.estimatedHours = 'Estimated hours must be greater than 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      setIsSubmitting(true)
      try {
        await onSave(formData)
      } catch (error) {
        setErrors({ submit: 'Failed to save job description. Please try again.' })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter job description title"
              required
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={3}
            placeholder="Enter detailed description"
            required
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        {/* Parts Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Parts
            </h3>
            <div className="text-sm font-medium text-gray-700">
              Subtotal: {formatCurrency(calculatePartsTotal())}
            </div>
          </div>

          {/* Add Part Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-3 bg-white rounded-lg border">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Part Name</label>
              <input
                type="text"
                value={newPart.name}
                onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Part name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={newPart.quantity}
                onChange={(e) => setNewPart(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newPart.unitCost}
                onChange={(e) => setNewPart(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addPart}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>

          {/* Parts List */}
          {formData.parts.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 border-b pb-2">
                <div className="col-span-4">PART</div>
                <div className="col-span-2">QUANTITY</div>
                <div className="col-span-3">UNIT PRICE</div>
                <div className="col-span-2">TOTAL</div>
                <div className="col-span-1">ACTION</div>
              </div>
              {formData.parts.map((part, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center py-2 border-b border-gray-200">
                  <div className="col-span-4 font-medium text-gray-900">{part.name}</div>
                  <div className="col-span-2 text-gray-700">{part.quantity}</div>
                  <div className="col-span-3 text-gray-700">{formatCurrency(part.unitCost)}</div>
                  <div className="col-span-2 font-medium text-gray-900">{formatCurrency(part.quantity * part.unitCost)}</div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removePart(index)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Labor Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Labor
            </h3>
            <div className="text-sm font-medium text-gray-700">
              Subtotal: {formatCurrency(calculateLaborTotal())}
            </div>
          </div>

          {/* Add Labor Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-3 bg-white rounded-lg border">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={newLabor.description}
                onChange={(e) => setNewLabor(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Labor description"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hours</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={newLabor.hours}
                onChange={(e) => setNewLabor(prev => ({ ...prev, hours: parseFloat(e.target.value) || 1 }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hourly Rate</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newLabor.hourlyRate}
                onChange={(e) => setNewLabor(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="75.00"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addLabor}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>

          {/* Labor List */}
          {formData.labor.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 border-b pb-2">
                <div className="col-span-5">DESCRIPTION</div>
                <div className="col-span-2">HOURS</div>
                <div className="col-span-3">HOURLY RATE</div>
                <div className="col-span-1">TOTAL</div>
                <div className="col-span-1">ACTION</div>
              </div>
              {formData.labor.map((labor, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center py-2 border-b border-gray-200">
                  <div className="col-span-5 font-medium text-gray-900">{labor.description}</div>
                  <div className="col-span-2 text-gray-700">{labor.hours}h</div>
                  <div className="col-span-3 text-gray-700">{formatCurrency(labor.hourlyRate)}/h</div>
                  <div className="col-span-1 font-medium text-gray-900">{formatCurrency(labor.hours * labor.hourlyRate)}</div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLabor(index)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-blue-600 mr-2" />
              <span className="text-lg font-semibold text-blue-900">Grand Total</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(calculateGrandTotal())}
            </div>
          </div>
          <div className="mt-2 text-sm text-blue-700">
            Parts: {formatCurrency(calculatePartsTotal())} + Labor: {formatCurrency(calculateLaborTotal())}
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Save')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default EnhancedJobDescriptionForm
