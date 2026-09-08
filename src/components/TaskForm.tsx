import { useState } from 'react'
import { 
  RepairTaskFormData, 
  RepairCategory, 
  RepairPriority,
  RepairSpecification
} from '../types/vehicleRepair'
import {
  Plus,
  Trash2,
  Save,
  X,
  DollarSign,
  Settings,
  Car,
  AlertTriangle,
  Wrench,
  BarChart3
} from 'lucide-react'

interface TaskFormProps {
  initialData?: RepairTaskFormData
  onSave: (formData: RepairTaskFormData) => void
  onCancel: () => void
  categories: RepairCategory[]
  priorities: RepairPriority[]
}

const TaskForm = ({ 
  initialData, 
  onSave, 
  onCancel, 
  categories, 
  priorities 
}: TaskFormProps) => {
  const [formData, setFormData] = useState<RepairTaskFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'maintenance',
    subcategory: initialData?.subcategory || '',
    priority: initialData?.priority || 'medium',
    estimatedHours: initialData?.estimatedHours || 1,
    estimatedCost: initialData?.estimatedCost || 0,
    specifications: initialData?.specifications || [],
    dependencies: initialData?.dependencies || [],
    tags: initialData?.tags || []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newTag, setNewTag] = useState('')
  const [newSpec, setNewSpec] = useState({
    partName: '',
    partNumber: '',
    quantity: 1,
    unitCost: 0,
    laborHours: 0,
    required: true,
    supplier: '',
    warranty: ''
  })

  const categoryConfig = {
    engine: { icon: Car, color: 'text-red-600', label: 'Engine' },
    transmission: { icon: Settings, color: 'text-orange-600', label: 'Transmission' },
    brakes: { icon: AlertTriangle, color: 'text-yellow-600', label: 'Brakes' },
    suspension: { icon: Wrench, color: 'text-green-600', label: 'Suspension' },
    electrical: { icon: Settings, color: 'text-blue-600', label: 'Electrical' },
    air_conditioning: { icon: Settings, color: 'text-cyan-600', label: 'A/C & Heating' },
    exhaust: { icon: Settings, color: 'text-gray-600', label: 'Exhaust' },
    tires: { icon: Car, color: 'text-purple-600', label: 'Tires & Wheels' },
    body: { icon: Car, color: 'text-pink-600', label: 'Body Work' },
    interior: { icon: Settings, color: 'text-indigo-600', label: 'Interior' },
    maintenance: { icon: Wrench, color: 'text-teal-600', label: 'Maintenance' },
    diagnostic: { icon: BarChart3, color: 'text-violet-600', label: 'Diagnostic' },
    other: { icon: Settings, color: 'text-slate-600', label: 'Other' }
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
    
    if (formData.estimatedCost < 0) {
      newErrors.estimatedCost = 'Estimated cost cannot be negative'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  const addSpecification = () => {
    if (!newSpec.partName.trim()) return
    
    const spec: Omit<RepairSpecification, 'id' | 'totalCost'> = {
      partName: newSpec.partName,
      partNumber: newSpec.partNumber,
      quantity: newSpec.quantity,
      unitCost: newSpec.unitCost,
      laborHours: newSpec.laborHours,
      required: newSpec.required,
      supplier: newSpec.supplier,
      warranty: newSpec.warranty
    }
    
    setFormData(prev => ({
      ...prev,
      specifications: [...prev.specifications, spec]
    }))
    
    // Reset form
    setNewSpec({
      partName: '',
      partNumber: '',
      quantity: 1,
      unitCost: 0,
      laborHours: 0,
      required: true,
      supplier: '',
      warranty: ''
    })
  }

  const removeSpecification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }))
  }

  const addTag = () => {
    if (!newTag.trim()) return
    if (formData.tags.includes(newTag.trim())) return
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()]
    }))
    setNewTag('')
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const calculateSpecTotal = (spec: typeof newSpec | RepairSpecification | Omit<RepairSpecification, "id" | "totalCost">) => {
    const partsCost = spec.quantity * spec.unitCost
    const laborCost = spec.laborHours * 85 // Assuming $85/hour labor rate
    return partsCost + laborCost
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {initialData ? 'Edit Repair Task' : 'Add New Repair Task'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter task title"
              required
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as RepairCategory }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => {
                const config = categoryConfig[category]
                return (
                  <option key={category} value={category}>
                    {config.label}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={3}
            placeholder="Enter detailed task description"
            required
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as RepairPriority }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {priorities.map(priority => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subcategory (Optional)
            </label>
            <input
              type="text"
              value={formData.subcategory}
              onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Front brakes, Engine mounts"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Hours *
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={formData.estimatedHours}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.estimatedHours ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.estimatedHours && (
              <p className="text-red-500 text-sm mt-1">{errors.estimatedHours}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Cost *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.estimatedCost ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                required
              />
            </div>
            {errors.estimatedCost && (
              <p className="text-red-500 text-sm mt-1">{errors.estimatedCost}</p>
            )}
          </div>
        </div>

        {/* Specifications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Parts & Specifications
          </label>
          
          {formData.specifications.length > 0 && (
            <div className="mb-4 space-y-2">
              {formData.specifications.map((spec, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{spec.partName || 'Labor'}</div>
                    <div className="text-xs text-gray-600">
                      {spec.quantity > 1 && `${spec.quantity}x `}
                      ${spec.unitCost.toFixed(2)} each + {spec.laborHours}h labor
                      = ${calculateSpecTotal(spec).toFixed(2)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSpecification(index)}
                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Part Name</label>
                <input
                  type="text"
                  value={newSpec.partName}
                  onChange={(e) => setNewSpec(prev => ({ ...prev, partName: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Brake pads"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Part Number</label>
                <input
                  type="text"
                  value={newSpec.partNumber}
                  onChange={(e) => setNewSpec(prev => ({ ...prev, partNumber: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., BP-1234"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newSpec.quantity}
                  onChange={(e) => setNewSpec(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newSpec.unitCost}
                  onChange={(e) => setNewSpec(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Labor Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={newSpec.laborHours}
                  onChange={(e) => setNewSpec(prev => ({ ...prev, laborHours: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.0"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={newSpec.supplier}
                  onChange={(e) => setNewSpec(prev => ({ ...prev, supplier: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., AutoParts Corp"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Warranty</label>
                <input
                  type="text"
                  value={newSpec.warranty}
                  onChange={(e) => setNewSpec(prev => ({ ...prev, warranty: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 12 months"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addSpecification}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Spec</span>
                </button>
              </div>
            </div>
            
            <div className="mt-3 text-sm text-gray-600">
              Total: ${calculateSpecTotal(newSpec).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          
          {formData.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <span key={tag} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center space-x-2">
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a tag (e.g., safety, warranty)"
            />
            <button
              type="button"
              onClick={addTag}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Tag</span>
            </button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{initialData ? 'Update Task' : 'Create Task'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default TaskForm