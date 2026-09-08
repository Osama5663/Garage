import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAuthStore } from '../../stores/authStore'
import { Plus, Edit, Trash2, Wrench, Clock, DollarSign, AlertCircle, CheckCircle, XCircle, Filter } from 'lucide-react'
import { JobType, JobTypeFormData, JobCategory } from '../../types/settings'

const JobTypeManager: React.FC = () => {
  const { jobTypes, addJobType, updateJobType, deleteJobType, isLoading } = useSettingsStore()
  const { logActivity } = useAuthStore()
  
  const [showForm, setShowForm] = useState(false)
  const [editingJobType, setEditingJobType] = useState<JobType | null>(null)
  const [formData, setFormData] = useState<JobTypeFormData>({
    name: '',
    description: '',
    category: 'maintenance',
    estimatedHours: 1,
    hourlyRate: 75
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [filterCategory, setFilterCategory] = useState<string>('all')

  useEffect(() => {
    if (editingJobType) {
      setFormData({
        name: editingJobType.name,
        description: editingJobType.description || '',
        category: editingJobType.category,
        estimatedHours: editingJobType.estimatedHours,
        hourlyRate: editingJobType.hourlyRate
      })
    }
  }, [editingJobType])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Job type name is required'
    }
    
    if (formData.estimatedHours <= 0) {
      newErrors.estimatedHours = 'Estimated hours must be greater than 0'
    }
    
    if (formData.hourlyRate <= 0) {
      newErrors.hourlyRate = 'Hourly rate must be greater than 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof JobTypeFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field as keyof typeof prev]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      if (editingJobType) {
        const success = await updateJobType(editingJobType.id, formData)
        if (success) {
          logActivity('JOB_TYPE_UPDATED', { 
            jobTypeName: formData.name, 
            category: formData.category,
            hourlyRate: formData.hourlyRate
          })
          resetForm()
        }
      } else {
        const newJobType = await addJobType(formData)
        if (newJobType) {
          logActivity('JOB_TYPE_CREATED', { 
            jobTypeName: newJobType.name, 
            category: newJobType.category,
            hourlyRate: newJobType.hourlyRate
          })
          resetForm()
        }
      }
    } catch (error) {
      console.error('Error saving job type:', error)
    }
  }

  const handleEdit = (jobType: JobType) => {
    setEditingJobType(jobType)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job type? This action cannot be undone.')) {
      try {
        const jobType = jobTypes.find((jt: JobType) => jt.id === id)
        const success = await deleteJobType(id)
        if (success && jobType) {
          logActivity('JOB_TYPE_DELETED', { jobTypeName: jobType.name })
        }
      } catch (error) {
        console.error('Error deleting job type:', error)
      }
    }
  }

  const handleToggleStatus = async (jobType: JobType) => {
    try {
      const success = await updateJobType(jobType.id, { isActive: !jobType.isActive })
      if (success) {
        logActivity('JOB_TYPE_STATUS_CHANGED', { 
          jobTypeName: jobType.name, 
          newStatus: !jobType.isActive ? 'active' : 'inactive' 
        })
      }
    } catch (error) {
      console.error('Error updating job type status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'maintenance',
      estimatedHours: 1,
      hourlyRate: 75
    })
    setErrors({})
    setEditingJobType(null)
    setShowForm(false)
  }

  const categories: { value: JobCategory; label: string; color: string }[] = [
    { value: 'maintenance', label: 'Maintenance', color: 'bg-blue-100 text-blue-800' },
    { value: 'repair', label: 'Repair', color: 'bg-red-100 text-red-800' },
    { value: 'inspection', label: 'Inspection', color: 'bg-green-100 text-green-800' },
    { value: 'customization', label: 'Customization', color: 'bg-purple-100 text-purple-800' },
    { value: 'emergency', label: 'Emergency', color: 'bg-orange-100 text-orange-800' }
  ]

  const filteredJobTypes = filterCategory === 'all' 
    ? jobTypes 
    : jobTypes.filter((jt: JobType) => jt.category === filterCategory)

  const activeJobTypes = filteredJobTypes.filter((jt: JobType) => jt.isActive)
  const inactiveJobTypes = filteredJobTypes.filter((jt: JobType) => !jt.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Job Types Configuration</h3>
          <p className="text-sm text-gray-500">Manage service types and their pricing</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Job Type
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <Filter className="h-5 w-5 text-gray-400" />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {/* Job Type Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">
              {editingJobType ? 'Edit Job Type' : 'Add New Job Type'}
            </h4>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Type Name */}
              <div>
                <label htmlFor="job-type-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type Name *
                </label>
                <input
                  type="text"
                  id="job-type-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`block w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="e.g., Oil Change, Brake Inspection"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimated Hours */}
              <div>
                <label htmlFor="estimated-hours" className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Estimated Hours *
                </label>
                <input
                  type="number"
                  id="estimated-hours"
                  value={formData.estimatedHours}
                  onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0.1"
                  max="24"
                  className={`block w-full px-3 py-2 border ${errors.estimatedHours ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="1.5"
                />
                {errors.estimatedHours && (
                  <p className="mt-1 text-sm text-red-600">{errors.estimatedHours}</p>
                )}
              </div>

              <div>
                <label htmlFor="hourly-rate" className="block text_sm font-medium text-gray-700 mb-1">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Hourly Rate *
                </label>
                <input
                  type="number"
                  id="hourly-rate"
                  value={formData.hourlyRate}
                  onChange={(e) => handleInputChange('hourlyRate', parseFloat(e.target.value) || 0)}
                  step="1"
                  min="1"
                  max="1000"
                  className={`block w-full px-3 py-2 border ${errors.hourlyRate ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="75"
                />
                {errors.hourlyRate && (
                  <p className="mt-1 text-sm text-red-600">{errors.hourlyRate}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="job-type-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="job-type-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the job type and what it includes"
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 inline" />
                    {editingJobType ? 'Update Job Type' : 'Create Job Type'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Job Types */}
      {activeJobTypes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Active Job Types</h4>
          </div>
          <div className="divide-y divide-gray-200">
            {activeJobTypes.map((jobType) => (
              <div key={jobType.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h5 className="text-sm font-medium text-gray-900">{jobType.name}</h5>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        categories.find(c => c.value === jobType.category)?.color || 'bg-gray-100 text-gray-800'
                      }`}>
                        {categories.find(c => c.value === jobType.category)?.label}
                      </span>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {jobType.estimatedHours} hours
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${jobType.hourlyRate}/hour
                      </div>
                    </div>
                    {jobType.description && (
                      <p className="text-sm text-gray-500 mt-2">{jobType.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleStatus(jobType)}
                      className="text-green-600 hover:text-green-800"
                      title="Deactivate"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(jobType)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(jobType.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
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

      {/* Inactive Job Types */}
      {inactiveJobTypes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Inactive Job Types</h4>
          </div>
          <div className="divide-y divide-gray-200">
            {inactiveJobTypes.map((jobType) => (
              <div key={jobType.id} className="px-6 py-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h5 className="text-sm font-medium text-gray-900">{jobType.name}</h5>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        categories.find(c => c.value === jobType.category)?.color || 'bg-gray-100 text-gray-800'
                      }`}>
                        {categories.find(c => c.value === jobType.category)?.label}
                      </span>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {jobType.estimatedHours} hours
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${jobType.hourlyRate}/hour
                      </div>
                    </div>
                    {jobType.description && (
                      <p className="text-sm text-gray-500 mt-2">{jobType.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleStatus(jobType)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Activate"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(jobType)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(jobType.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
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
      {jobTypes.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Job Types Configured</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first job type.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Job Type
          </button>
        </div>
      )}
    </div>
  )
}

export default JobTypeManager
