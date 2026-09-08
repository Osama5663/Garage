import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAuthStore } from '../../stores/authStore'
import { Plus, Edit, Trash2, Percent, AlertCircle, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import { TaxSettings, TaxFormData, TaxApplication } from '../../types/settings'

const TaxSettingsManager: React.FC = () => {
  const { taxes, addTax, updateTax, deleteTax, isLoading } = useSettingsStore()
  const { logActivity } = useAuthStore()
  
  const [showForm, setShowForm] = useState(false)
  const [editingTax, setEditingTax] = useState<TaxSettings | null>(null)
  const [formData, setFormData] = useState<TaxFormData>({
    name: '',
    rate: 0,
    appliesTo: [],
    description: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingTax) {
      setFormData({
        name: editingTax.name,
        rate: editingTax.rate,
        appliesTo: [...editingTax.appliesTo],
        description: editingTax.description || ''
      })
    }
  }, [editingTax])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la taxe est requis'
    }
    
    if (formData.rate < 0 || formData.rate > 100) {
      newErrors.rate = 'Le taux de taxe doit être entre 0 et 100'
    }
    
    if (formData.appliesTo.length === 0) {
      newErrors.appliesTo = 'Sélectionnez au moins un type d’application'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof TaxFormData, value: string | number | TaxApplication[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field as keyof typeof prev]: '' }))
    }
  }

  const handleAppliesToChange = (application: TaxApplication) => {
    const currentAppliesTo = formData.appliesTo
    const updatedAppliesTo = currentAppliesTo.includes(application)
      ? currentAppliesTo.filter((a: TaxApplication) => a !== application)
      : [...currentAppliesTo, application]
    
    handleInputChange('appliesTo', updatedAppliesTo)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      if (editingTax) {
        const success = await updateTax(editingTax.id, formData)
        if (success) {
          logActivity('TAX_UPDATED', { taxName: formData.name, rate: formData.rate })
          resetForm()
        }
      } else {
        const newTax = await addTax(formData)
        if (newTax) {
          logActivity('TAX_CREATED', { taxName: newTax.name, rate: newTax.rate })
          resetForm()
        }
      }
    } catch (error) {
      console.error('Error saving tax:', error)
    }
  }

  const handleEdit = (tax: TaxSettings) => {
    setEditingTax(tax)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce taux de taxe ? Cette action est irréversible.')) {
      try {
        const tax = taxes.find((t: TaxSettings) => t.id === id)
        const success = await deleteTax(id)
        if (success && tax) {
          logActivity('TAX_DELETED', { taxName: tax.name })
        }
      } catch (error) {
        console.error('Error deleting tax:', error)
      }
    }
  }

  const handleToggleStatus = async (tax: TaxSettings) => {
    try {
      const success = await updateTax(tax.id, { isActive: !tax.isActive })
      if (success) {
        logActivity('TAX_STATUS_CHANGED', { 
          taxName: tax.name, 
          newStatus: !tax.isActive ? 'active' : 'inactive' 
        })
      }
    } catch (error) {
      console.error('Error updating tax status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      rate: 0,
      appliesTo: [],
      description: ''
    })
    setErrors({})
    setEditingTax(null)
    setShowForm(false)
  }

  const taxApplications: { value: TaxApplication; label: string }[] = [
    { value: 'labor', label: 'Main‑d’œuvre' },
    { value: 'parts', label: 'Pièces' },
    { value: 'services', label: 'Services' },
    { value: 'subtotal', label: 'Sous‑total' },
    { value: 'total', label: 'Total' }
  ]
  const getApplicationLabel = (value: TaxApplication) =>
    taxApplications.find(a => a.value === value)?.label || value

  const activeTaxes = taxes.filter((tax: TaxSettings) => tax.isActive)
  const inactiveTaxes = taxes.filter((tax: TaxSettings) => !tax.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Configuration des taux de taxe</h3>
          <p className="text-sm text-gray-500">Gérez les taux de taxe et leurs règles d’application</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un taux de taxe
        </button>
      </div>

      {/* Tax Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">
              {editingTax ? 'Modifier le taux de taxe' : 'Ajouter un nouveau taux de taxe'}
            </h4>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tax Name */}
              <div>
                <label htmlFor="tax-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la taxe *
                </label>
                <input
                  type="text"
                  id="tax-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`block w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="ex. Taxe de vente, Éco‑participation"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Tax Rate */}
              <div>
                <label htmlFor="tax-rate" className="block text-sm font-medium text-gray-700 mb-1">
                  <Percent className="inline h-4 w-4 mr-1" />
                  Taux de taxe (%) *
                </label>
                <input
                  type="number"
                  id="tax-rate"
                  value={formData.rate}
                  onChange={(e) => handleInputChange('rate', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  max="100"
                  className={`block w-full px-3 py-2 border ${errors.rate ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="8.5"
                />
                {errors.rate && (
                  <p className="mt-1 text-sm text-red-600">{errors.rate}</p>
                )}
              </div>
            </div>

            {/* Applies To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                S’applique à * (sélectionnez au moins un)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {taxApplications.map((app) => (
                  <label key={app.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.appliesTo.includes(app.value)}
                      onChange={() => handleAppliesToChange(app.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{app.label}</span>
                  </label>
                ))}
              </div>
              {errors.appliesTo && (
                <p className="mt-1 text-sm text-red-600">{errors.appliesTo}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="tax-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="tax-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description ou notes facultatives sur cette taxe"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <XCircle className="h-4 w-4 mr-2 inline" />
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 inline" />
                    {editingTax ? 'Mettre à jour la taxe' : 'Créer la taxe'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Taxes */}
      {activeTaxes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Taux de taxe actifs</h4>
          </div>
          <div className="divide-y divide-gray-200">
            {activeTaxes.map((tax) => (
              <div key={tax.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h5 className="text-sm font-medium text-gray-900">{tax.name}</h5>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actif
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {tax.rate}% • S’applique à : {tax.appliesTo.map(getApplicationLabel).join(', ')}
                    </p>
                    {tax.description && (
                      <p className="text-sm text-gray-500 mt-1">{tax.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleStatus(tax)}
                      className="text-green-600 hover:text-green-800"
                      title="Désactiver"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(tax)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tax.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Taxes */}
      {inactiveTaxes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Taux de taxe inactifs</h4>
          </div>
          <div className="divide-y divide-gray-200">
            {inactiveTaxes.map((tax) => (
              <div key={tax.id} className="px-6 py-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h5 className="text-sm font-medium text-gray-900">{tax.name}</h5>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactif
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {tax.rate}% • S’applique à : {tax.appliesTo.map(getApplicationLabel).join(', ')}
                    </p>
                    {tax.description && (
                      <p className="text-sm text-gray-500 mt-1">{tax.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleStatus(tax)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Activer"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(tax)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tax.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {taxes.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun taux de taxe configuré</h3>
          <p className="text-gray-500 mb-4">Commencez par ajouter votre premier taux de taxe.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un taux de taxe
          </button>
        </div>
      )}
    </div>
  )
}

export default TaxSettingsManager
