import { useState } from 'react'
import { Vehicle, ServiceRecord, Invoice } from '../types/customer'
import { Car, Plus, Wrench, FileText, Calendar, User, Edit, Trash2, Eye } from 'lucide-react'

interface VehicleManagementProps {
  vehicles: Vehicle[]
  onAddVehicle: (vehicle: Omit<Vehicle, 'id' | 'serviceHistory' | 'invoices'>) => void
  onEditVehicle: (vehicleId: string, vehicle: Partial<Vehicle>) => void
  onDeleteVehicle: (vehicleId: string) => void
}

interface VehicleFormData {
  make: string
  model: string
  year: number
  vin: string
  registration: string
  color: string
  mileage: number
}

const VehicleManagement = ({ 
  vehicles, 
  onAddVehicle, 
  onEditVehicle, 
  onDeleteVehicle 
}: VehicleManagementProps) => {
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  
  const [formData, setFormData] = useState<VehicleFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    registration: '',
    color: '',
    mileage: 0
  })
  
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    if (!formData.make.trim()) errors.make = 'Make is required'
    if (!formData.model.trim()) errors.model = 'Model is required'
    if (!formData.vin.trim()) errors.vin = 'VIN is required'
    if (!formData.registration.trim()) errors.registration = 'Registration is required'
    
    // VIN validation (should be 17 characters for most vehicles)
    if (formData.vin.trim() && formData.vin.length !== 17) {
      errors.vin = 'VIN must be 17 characters'
    }
    
    // Year validation
    const currentYear = new Date().getFullYear()
    if (formData.year < 1900 || formData.year > currentYear + 1) {
      errors.year = `Year must be between 1900 and ${currentYear + 1}`
    }
    
    // Mileage validation
    if (formData.mileage < 0) {
      errors.mileage = 'Mileage cannot be negative'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form before submission
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      if (editingVehicle) {
        onEditVehicle(editingVehicle.id, formData)
        setEditingVehicle(null)
        setShowForm(false)
        resetForm()
      } else {
        // Create complete vehicle object with all required properties
        const newVehicle: Omit<Vehicle, 'id' | 'serviceHistory' | 'invoices'> = {
          ...formData,
          color: formData.color || undefined,
          mileage: formData.mileage || 0
        }
        
        // Call onAddVehicle - it will handle success/error notifications
        onAddVehicle(newVehicle)
        // Always close form and reset since notifications are handled in parent
        setShowForm(false)
        resetForm()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      registration: '',
      color: '',
      mileage: 0
    })
  }

  const handleEdit = (vehicle: Vehicle) => {
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      registration: vehicle.registration,
      color: vehicle.color || '',
      mileage: vehicle.mileage || 0
    })
    setEditingVehicle(vehicle)
    setShowForm(true)
  }

  const handleDelete = (vehicleId: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle? This will also remove its service history and invoices.')) {
      onDeleteVehicle(vehicleId)
      if (selectedVehicle?.id === vehicleId) {
        setSelectedVehicle(null)
      }
    }
  }

  if (selectedVehicle) {
    return (
      <div className="space-y-6">
        {/* Vehicle Details Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedVehicle.make} {selectedVehicle.model}
                </h2>
                <p className="text-gray-600">
                  {selectedVehicle.year} • {selectedVehicle.color} • VIN: {selectedVehicle.vin}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Back to List
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Service Records</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedVehicle.serviceHistory.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Invoices</p>
                  <p className="text-2xl font-bold text-green-900">{selectedVehicle.invoices.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">mi</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Current Mileage</p>
                  <p className="text-2xl font-bold text-purple-900">{selectedVehicle.mileage?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              Service History
            </h3>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>
          
          {selectedVehicle.serviceHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No service records found</p>
              <p className="text-sm">Add the first service record for this vehicle</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedVehicle.serviceHistory.map((record) => (
                <ServiceRecordCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Invoices
            </h3>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </button>
          </div>
          
          {selectedVehicle.invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No invoices found</p>
              <p className="text-sm">Create the first invoice for this vehicle</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedVehicle.invoices.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vehicle Management</h2>
          <p className="text-gray-600">Manage customer vehicles and their service history</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vehicle</span>
        </button>
      </div>

      {/* Add/Edit Vehicle Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h3>
            <p className="text-gray-600 text-sm">
              {editingVehicle 
                ? 'Update the vehicle information below.' 
                : 'Fill in the vehicle details below to add it to the customer profile.'}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, make: e.target.value }))
                    if (formErrors.make) {
                      setFormErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.make
                        return newErrors
                      })
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    formErrors.make ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                {formErrors.make && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.make}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, model: e.target.value }))
                    if (formErrors.model) {
                      setFormErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.model
                        return newErrors
                      })
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    formErrors.model ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                {formErrors.model && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.model}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => {
                    const year = parseInt(e.target.value) || new Date().getFullYear()
                    setFormData(prev => ({ ...prev, year }))
                    if (formErrors.year) {
                      setFormErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.year
                        return newErrors
                      })
                    }
                  }}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    formErrors.year ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                {formErrors.year && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.year}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VIN *</label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))
                    if (formErrors.vin) {
                      setFormErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.vin
                        return newErrors
                      })
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    formErrors.vin ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="17-character VIN"
                  maxLength={17}
                  required
                />
                {formErrors.vin && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.vin}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration *</label>
                <input
                  type="text"
                  value={formData.registration}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, registration: e.target.value.toUpperCase() }))
                    if (formErrors.registration) {
                      setFormErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.registration
                        return newErrors
                      })
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    formErrors.registration ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                {formErrors.registration && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.registration}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Red, Blue, Silver"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Mileage</label>
                <input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => {
                    const mileage = parseInt(e.target.value) || 0
                    setFormData(prev => ({ ...prev, mileage }))
                    if (formErrors.mileage) {
                      setFormErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.mileage
                        return newErrors
                      })
                    }
                  }}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    formErrors.mileage ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="0"
                />
                {formErrors.mileage && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.mileage}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingVehicle(null)
                  resetForm()
                  setFormErrors({})
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{editingVehicle ? 'Updating...' : 'Adding...'}</span>
                  </>
                ) : (
                  <span>{editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicle List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {vehicles.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Car className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No vehicles found</h3>
            <p className="text-gray-600 mb-4">This customer doesn't have any vehicles registered yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Add First Vehicle</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onViewDetails={() => setSelectedVehicle(vehicle)}
                onEdit={() => handleEdit(vehicle)}
                onDelete={() => handleDelete(vehicle.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface VehicleCardProps {
  vehicle: Vehicle
  onViewDetails: () => void
  onEdit: () => void
  onDelete: () => void
}

const VehicleCard = ({ vehicle, onViewDetails, onEdit, onDelete }: VehicleCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
            <Car className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {vehicle.make} {vehicle.model}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {vehicle.year}
              </span>
              {vehicle.color && (
                <span className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-1 border border-gray-300"
                    style={{ backgroundColor: vehicle.color.toLowerCase() }}
                  />
                  {vehicle.color}
                </span>
              )}
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                VIN: {vehicle.vin.slice(-8)}
              </span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                Plate: {vehicle.registration}
              </span>
              {vehicle.mileage && vehicle.mileage > 0 && (
                <span className="flex items-center text-blue-600">
                  <Car className="w-3 h-3 mr-1" />
                  {vehicle.mileage.toLocaleString()} mi
                </span>
              )}
            </div>
            
            {/* Vehicle Stats */}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center">
                <Wrench className="w-3 h-3 mr-1" />
                {vehicle.serviceHistory.length} services
              </span>
              <span className="flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                {vehicle.invoices.length} invoices
              </span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onViewDetails}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 shadow-sm hover:shadow-md"
            title="View Vehicle Details"
          >
            <Eye className="w-4 h-4" />
            <span>Details</span>
          </button>
          
          <div className={`flex space-x-1 transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-60'}`}>
            <button
              onClick={onEdit}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-all duration-200 hover:scale-105"
              title="Edit Vehicle"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-all duration-200 hover:scale-105"
              title="Delete Vehicle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ServiceRecordCardProps {
  record: ServiceRecord
}

const ServiceRecordCard = ({ record }: ServiceRecordCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-yellow-100 text-yellow-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{record.date}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
          {record.status.replace('-', ' ').toUpperCase()}
        </span>
      </div>
      <h4 className="font-medium text-gray-900 mb-1">{record.description}</h4>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span><User className="w-3 h-3 inline mr-1" />{record.mechanic}</span>
          <span>{record.mileage.toLocaleString()} mi</span>
        </div>
        <span className="font-medium">${record.cost.toFixed(2)}</span>
      </div>
    </div>
  )
}

interface InvoiceCardProps {
  invoice: Invoice
}

const InvoiceCard = ({ invoice }: InvoiceCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">Invoice #{invoice.id}</span>
          <span className="text-sm text-gray-600">{invoice.date}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
          {invoice.status.toUpperCase()}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{invoice.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}</span>
        <span className="font-bold text-lg">${invoice.amount.toFixed(2)}</span>
      </div>
    </div>
  )
}

export default VehicleManagement