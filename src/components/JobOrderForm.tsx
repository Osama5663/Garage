import { useState, useEffect } from 'react'
import { t } from '../i18n'
import { formatCurrency } from '../utils/formatters'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useCustomerStore } from '../stores/customerStore'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useMechanicStore } from '../stores/mechanicStore'
import { useJobDescriptionStore } from '../stores/jobDescriptionStore'
import { useVehicleRepairStore } from '../stores/vehicleRepairStore'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { JobOrder, JobOrderFormData, LaborItem, JobPart } from '../types/jobOrder'
import { Customer } from '../types/customer'
import { JobDescription } from '../types/jobDescription'
import { RepairTask } from '../types/vehicleRepair'
import VehicleRepairTaskManager from './VehicleRepairTaskManager'
import LaborSection from './LaborSection'
import PartsSection from './PartsSection'
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  Wrench, 
  AlertTriangle,
  FileText,
  Settings
} from 'lucide-react'

interface JobOrderFormProps {
  jobOrderId?: string
}

const JobOrderForm = ({ jobOrderId }: JobOrderFormProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { customers } = useCustomerStore()
  const { jobOrders, addJobOrder, updateJobOrder, getJobOrderById, addLinkedEstimate } = useJobOrderStore()
  const { estimates, updateEstimate } = useEstimateInvoiceStore()
  const { mechanics, fetchMechanics } = useMechanicStore()
  const { descriptions: jobDescriptions, clearDescriptions } = useJobDescriptionStore()
  const { repairTasks, getTotalEstimatedHours, getTotalEstimatedCost, setCurrentJob } = useVehicleRepairStore()
  
  // Use jobOrderId from props or URL params
  const currentJobOrderId = jobOrderId || id
  const isEditMode = !!currentJobOrderId
  
  const [useVehicleRepairSystem, setUseVehicleRepairSystem] = useState(false)
  const [formData, setFormData] = useState<JobOrderFormData>({
    customerId: '',
    vehicleId: '',
    description: '', // Legacy field
    jobDescriptions: [],
    priority: 'medium',
    assignedMechanic: '',
    estimatedHours: 1,
    deadline: '',
    estimatedCost: 0,
    notes: '',
    laborItems: [],
    parts: []
  })

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof JobOrderFormData, string>>>({})

  // Mock available parts data
  const availableParts = [
    { id: 'part_001', name: 'Engine Oil Filter', partNumber: 'OF-1234', unitCost: 15.99, description: 'Standard oil filter for most vehicles', supplier: 'AutoParts Co' },
    { id: 'part_002', name: 'Brake Pads Set', partNumber: 'BP-5678', unitCost: 89.99, description: 'Ceramic brake pads for front wheels', supplier: 'BrakeTech' },
    { id: 'part_003', name: 'Air Filter', partNumber: 'AF-9012', unitCost: 24.99, description: 'Engine air filter replacement', supplier: 'FilterPro' },
    { id: 'part_004', name: 'Spark Plug Set', partNumber: 'SP-3456', unitCost: 45.99, description: 'Set of 4 spark plugs', supplier: 'SparkMaster' },
    { id: 'part_005', name: 'Battery', partNumber: 'BT-7890', unitCost: 129.99, description: '12V car battery', supplier: 'PowerCell' }
  ]

  useEffect(() => {
    fetchMechanics()
    const interval = setInterval(() => {
      fetchMechanics()
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchMechanics])

  useEffect(() => {
    if (isEditMode && currentJobOrderId) {
      // Load existing job order data for editing
      const existingJobOrder = getJobOrderById(currentJobOrderId)
      if (existingJobOrder) {
        console.log('JobOrderForm: Loading existing job order for editing:', existingJobOrder)
        
        setFormData({
          customerId: existingJobOrder.customerId,
          vehicleId: existingJobOrder.vehicleId,
          description: existingJobOrder.description,
          jobDescriptions: existingJobOrder.jobDescriptions || [],
          priority: existingJobOrder.priority,
          assignedMechanic: existingJobOrder.assignedMechanic,
          estimatedHours: existingJobOrder.estimatedHours,
          deadline: existingJobOrder.deadline,
          estimatedCost: existingJobOrder.estimatedCost,
          notes: existingJobOrder.notes || '',
          laborItems: existingJobOrder.laborItems || [],
          parts: existingJobOrder.partsUsed || []
        })
        
        // Set selected customer
        const customer = customers.find(c => c.id === existingJobOrder.customerId)
        setSelectedCustomer(customer || null)
        
        // Determine if using vehicle repair system based on job descriptions
        if (existingJobOrder.jobDescriptions && existingJobOrder.jobDescriptions.length > 0) {
          const hasVehicleRepairTasks = existingJobOrder.jobDescriptions.some(desc => 
            desc.id && desc.id.startsWith('vehicle_repair_')
          )
          setUseVehicleRepairSystem(hasVehicleRepairTasks)
        }
      } else {
        console.log('JobOrderForm: No existing job order found with ID:', currentJobOrderId)
      }
    } else {
      // Check for initial data from estimate conversion
      const initialData = location.state?.initialData
      if (initialData) {
        console.log('JobOrderForm: Loading initial data from estimate:', initialData)
        setFormData(prev => ({
          ...prev,
          customerId: initialData.customerId || '',
          vehicleId: initialData.vehicleId || '',
          description: initialData.description || '',
          parts: initialData.parts || [],
          laborItems: initialData.laborItems || [],
          estimatedCost: initialData.estimatedCost || 0,
          notes: initialData.notes || '',
          deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
        }))

        if (initialData.customerId) {
          const customer = customers.find(c => c.id === initialData.customerId)
          setSelectedCustomer(customer || null)
        }
      } else {
        // Set minimum deadline to tomorrow for new job orders
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setFormData(prev => ({
          ...prev,
          deadline: tomorrow.toISOString().split('T')[0]
        }))
      }
    }
  }, [isEditMode, currentJobOrderId, getJobOrderById, customers, location.state])

  // Update form data when switching between systems or when repair tasks change
  useEffect(() => {
    if (useVehicleRepairSystem) {
      // Update form with vehicle repair data
      const totalHours = getTotalEstimatedHours()
      const totalCost = getTotalEstimatedCost()
      setFormData(prev => ({
        ...prev,
        estimatedHours: totalHours,
        estimatedCost: totalCost
      }))
    }
  }, [useVehicleRepairSystem, repairTasks, getTotalEstimatedHours, getTotalEstimatedCost])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobOrderFormData, string>> = {}

    if (!formData.customerId) newErrors.customerId = t('jobOrderForm.errors.customerRequired')
    if (!formData.vehicleId) newErrors.vehicleId = t('jobOrderForm.errors.vehicleRequired')
    
    // Validate job descriptions based on system being used
    if (useVehicleRepairSystem) {
      // Vehicle repair system validation
      if (repairTasks.length === 0) {
        newErrors.description = t('jobOrderForm.errors.repairTaskRequired')
      }
    } else {
      // New Labor and Parts system validation
      if (formData.laborItems.length === 0 && formData.parts.length === 0) {
        newErrors.description = t('jobOrderForm.errors.laborOrPartRequired')
      }
    }
    
    if (!formData.assignedMechanic) newErrors.assignedMechanic = t('jobOrderForm.errors.mechanicRequired')
    if (formData.estimatedHours <= 0) newErrors.estimatedHours = t('jobOrderForm.errors.hoursPositive')
    if (!formData.deadline) newErrors.deadline = t('jobOrderForm.errors.deadlineRequired')
    if (formData.estimatedCost < 0) newErrors.estimatedCost = t('jobOrderForm.errors.costNonNegative')

    // Validate deadline is not in the past
    if (formData.deadline && new Date(formData.deadline) < new Date()) {
      newErrors.deadline = t('jobOrderForm.errors.deadlinePast')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('JobOrderForm: Starting form submission')
    console.log('JobOrderForm: Form data:', formData)
    console.log('JobOrderForm: Job descriptions:', jobDescriptions)
    console.log('JobOrderForm: Using vehicle repair system:', useVehicleRepairSystem)
    console.log('JobOrderForm: Repair tasks:', repairTasks)
    console.log('JobOrderForm: Is edit mode:', isEditMode)
    
    if (validateForm() && selectedCustomer) {
      console.log('JobOrderForm: Form validation passed')
      const selectedVehicle = selectedCustomer.vehicles.find(v => v.id === formData.vehicleId)
      const mechanic = mechanics.find(m => m.id === formData.assignedMechanic)
      
      if (selectedVehicle && mechanic) {
        console.log('JobOrderForm: Vehicle and mechanic found, creating/updating job order')
        
        let totalEstimatedHours: number
        let legacyDescription: string
        let finalJobDescriptions: JobDescription[]
        let totalEstimatedCost: number
        
        if (useVehicleRepairSystem) {
          // Use vehicle repair system data
          totalEstimatedHours = getTotalEstimatedHours()
          totalEstimatedCost = getTotalEstimatedCost()
          legacyDescription = repairTasks.map(task => 
            `${task.category} - ${task.title}: ${task.description}`
          ).join('\n\n')
          
          // Convert repair tasks to job descriptions format for storage
          finalJobDescriptions = [{
            id: `vehicle_repair_${Date.now()}`,
            title: 'Vehicle Repair Tasks',
            description: legacyDescription,
            tasks: repairTasks.map(task => ({
              id: task.id,
              title: `${task.category} - ${task.title}`,
              description: task.description,
              estimatedHours: task.estimatedHours,
              completed: task.status === 'completed',
              priority: (task.priority === 'critical' || task.priority === 'urgent') ? 'high' : task.priority as 'low' | 'medium' | 'high',
              createdAt: task.createdAt,
              updatedAt: task.updatedAt
            })),
            priority: formData.priority,
            estimatedHours: totalEstimatedHours,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            order: 0,
            parts: [],
            labor: []
          }]
        } else {
          // Use legacy system data
          totalEstimatedHours = jobDescriptions.length > 0 
            ? jobDescriptions.reduce((total, desc) => total + desc.estimatedHours, 0)
            : formData.estimatedHours
          
          legacyDescription = jobDescriptions.length > 0
            ? jobDescriptions.map(desc => `${desc.title}: ${desc.description}`).join('\n\n')
            : formData.description
            
          finalJobDescriptions = jobDescriptions
          totalEstimatedCost = formData.estimatedCost
        }

        if (isEditMode && currentJobOrderId) {
          // Update existing job order
          console.log('JobOrderForm: Updating existing job order')
          const updatedData = {
            customerId: formData.customerId,
            vehicleId: formData.vehicleId,
            description: legacyDescription,
            jobDescriptions: finalJobDescriptions,
            priority: formData.priority,
            assignedMechanic: formData.assignedMechanic,
            estimatedHours: totalEstimatedHours,
            deadline: formData.deadline,
            estimatedCost: totalEstimatedCost,
            notes: formData.notes,
            laborItems: formData.laborItems,
            partsUsed: formData.parts,
            updatedAt: new Date().toISOString()
          }
          
          updateJobOrder(currentJobOrderId, updatedData)
          console.log('JobOrderForm: Job order updated successfully')
        } else {
          // Create new job order
          console.log('JobOrderForm: Creating new job order')
          const estimateId = location.state?.estimateId
          const newJobOrder: JobOrder = {
            id: `job_${Date.now()}`,
            jobNumber: `OR-${new Date().getFullYear()}-${String(jobOrders.length + 1).padStart(3, '0')}`,
            customerId: formData.customerId,
            vehicleId: formData.vehicleId,
            customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
            vehicleInfo: {
              make: selectedVehicle.make,
              model: selectedVehicle.model,
              year: selectedVehicle.year,
              vin: selectedVehicle.vin,
              registration: selectedVehicle.registration
            },
            description: legacyDescription,
            jobDescriptions: finalJobDescriptions,
            priority: formData.priority,
            status: 'pending',
            assignedMechanic: formData.assignedMechanic,
            estimatedHours: totalEstimatedHours,
            actualHours: 0,
            startDate: new Date().toISOString().split('T')[0],
            deadline: formData.deadline,
            partsUsed: formData.parts,
            laborItems: formData.laborItems,
            diagnosticFiles: [],
            attachedImages: [],
            estimatedCost: totalEstimatedCost,
            finalCost: 0,
            notes: formData.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'current_user',
            isApproved: false,
            linkedEstimateIds: estimateId ? [estimateId] : undefined
          }
          
          console.log('JobOrderForm: New job order created:', newJobOrder)
          addJobOrder(newJobOrder)
          
          // Link estimate if it was provided
          if (estimateId) {
            addLinkedEstimate(newJobOrder.id, estimateId)
            const estimate = estimates.find(est => est.id === estimateId)
            if (estimate) {
              updateEstimate(estimateId, { jobOrderId: newJobOrder.id })
            }
          }
          
          console.log('JobOrderForm: Job order added to store')
        }
        
        // Clear appropriate stores
        if (useVehicleRepairSystem) {
          setCurrentJob(null) // Clear vehicle repair job
        } else {
          clearDescriptions() // Clear legacy job descriptions
        }
        
        console.log('JobOrderForm: Navigating to job orders list')
        navigate('/job-orders')
      } else {
        console.log('JobOrderForm: Vehicle or mechanic not found')
      }
    } else {
      console.log('JobOrderForm: Form validation failed')
      console.log('JobOrderForm: Errors:', errors)
    }
  }


  const handleVehicleRepairTasksChange = (tasks: RepairTask[]) => {
    // Update estimated hours and cost based on repair tasks
    const totalHours = tasks.reduce((total, task) => total + task.estimatedHours, 0)
    const totalCost = tasks.reduce((total, task) => total + task.estimatedCost, 0)
    
    setFormData(prev => ({ 
      ...prev, 
      estimatedHours: totalHours,
      estimatedCost: totalCost
    }))
    
    // Clear description error when tasks are added
    if (errors.description && tasks.length > 0) {
      setErrors(prev => ({ ...prev, description: undefined }))
    }
  }

  const handleLaborItemsChange = (laborItems: LaborItem[]) => {
    setFormData(prev => ({ 
      ...prev, 
      laborItems,
      estimatedHours: laborItems.reduce((total: number, item: LaborItem) => total + item.hours, 0),
      estimatedCost: laborItems.reduce((total: number, item: LaborItem) => total + item.total, 0) + 
                     (prev.parts?.reduce((total: number, part: JobPart) => total + part.totalCost, 0) || 0)
    }))
  }

  const handlePartsChange = (parts: JobPart[]) => {
    setFormData(prev => ({ 
      ...prev, 
      parts,
      estimatedCost: (prev.laborItems?.reduce((total: number, item: LaborItem) => total + item.total, 0) || 0) +
                     parts.reduce((total: number, part: JobPart) => total + part.totalCost, 0)
    }))
  }

  const handleInputChange = (field: keyof JobOrderFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    setSelectedCustomer(customer || null)
    setFormData(prev => ({
      ...prev,
      customerId,
      vehicleId: '' // Reset vehicle selection when customer changes
    }))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/job-orders')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? t('jobOrderForm.header.edit') : t('jobOrderForm.header.create')}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Customer & Vehicle Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            {t('jobOrderForm.sections.customerVehicle')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('jobOrderForm.fields.customer.label')}
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.customerId ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">{t('jobOrderForm.fields.customer.placeholder')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.firstName} {customer.lastName} - {customer.email}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <p className="text-red-500 text-sm mt-1">{errors.customerId}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('jobOrderForm.fields.vehicle.label')}
              </label>
              <select
                value={formData.vehicleId}
                onChange={(e) => handleInputChange('vehicleId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.vehicleId ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                disabled={!selectedCustomer}
              >
                <option value="">{t('jobOrderForm.fields.vehicle.placeholder')}</option>
                {selectedCustomer?.vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.registration}
                  </option>
                ))}
              </select>
              {errors.vehicleId && (
                <p className="text-red-500 text-sm mt-1">{errors.vehicleId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              {t('jobOrderForm.sections.jobDetails')}
            </h3>
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useVehicleRepairSystem}
                  onChange={(e) => setUseVehicleRepairSystem(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t('jobOrderForm.fields.useAdvanced')}
                </span>
              </label>
            </div>
          </div>
          
          {/* Vehicle Repair System */}
          {useVehicleRepairSystem ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('jobOrderForm.fields.vehicleRepairTasks')}
                </label>
                <VehicleRepairTaskManager onTasksChange={handleVehicleRepairTasksChange} />
                {repairTasks.length === 0 && errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
                {repairTasks.length > 0 && (
                  <p className="text-green-600 text-sm mt-1">
                    {repairTasks.length} {t('jobOrderForm.labels.repairTasksAdded')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* New Labor and Parts Sections */}
              <div className="space-y-6">
                <LaborSection 
                  laborItems={formData.laborItems}
                  onLaborChange={handleLaborItemsChange}
                  mechanics={(mechanics || []).filter(m => m.status === 'active')}
                />
                
                <PartsSection 
                  parts={formData.parts}
                  onPartsChange={handlePartsChange}
                  availableParts={availableParts}
                />

                {/* Overall Order Total */}
                {(formData.laborItems.length > 0 || formData.parts.length > 0) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {t('jobOrderForm.labels.overallTotal')}
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(
                          (formData.laborItems?.reduce((total, item) => total + item.total, 0) || 0) +
                          (formData.parts?.reduce((total, part) => total + part.totalCost, 0) || 0)
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('jobOrderForm.labels.priorityLevel')}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">{t('jobOrders.filters.low')}</option>
                <option value="medium">{t('jobOrders.filters.medium')}</option>
                <option value="high">{t('jobOrders.filters.high')}</option>
                <option value="urgent">{t('jobOrders.filters.urgent')}</option>
              </select>
            </div>
              
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                {t('jobOrderForm.labels.priorityIndicator')}
              </label>
              <div className={`px-3 py-2 rounded-lg text-center font-medium ${getPriorityColor(formData.priority)}`}>
                {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)} Priority
              </div>
            </div>
          </div>
        </div>

        {/* Assignment & Scheduling */}
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Wrench className="w-5 h-5 mr-2" />
              {t('jobOrderForm.sections.assignmentScheduling')}
            </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('jobOrderForm.fields.assignedMechanic.label')}
              </label>
              <select
                value={formData.assignedMechanic}
                onChange={(e) => handleInputChange('assignedMechanic', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.assignedMechanic ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">{t('jobOrderForm.fields.assignedMechanic.placeholder')}</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.name} - {mechanic.specialization} ({formatCurrency(mechanic.hourlyRate)}/h)
                  </option>
                ))}
              </select>
              {errors.assignedMechanic && (
                <p className="text-red-500 text-sm mt-1">{errors.assignedMechanic}</p>
              )}
            </div>
              
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                {t('jobOrders.labels.estHours')} {useVehicleRepairSystem && `(${t('jobOrderForm.tooltips.hoursAutoCalc')})`}
              </label>
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.estimatedHours ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                disabled={useVehicleRepairSystem}
                title={useVehicleRepairSystem ? t('jobOrderForm.tooltips.hoursAutoCalc') : ''}
              />
              {errors.estimatedHours && (
                <p className="text-red-500 text-sm mt-1">{errors.estimatedHours}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                {t('jobOrders.labels.deadline')} *
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.deadline ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.deadline && (
                <p className="text-red-500 text-sm mt-1">{errors.deadline}</p>
              )}
            </div>
              
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4 inline mr-1" />
                {t('jobOrders.labels.estCost')} {useVehicleRepairSystem && `(${t('jobOrderForm.tooltips.costAutoCalc')})`}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => handleInputChange('estimatedCost', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.estimatedCost ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={useVehicleRepairSystem}
                title={useVehicleRepairSystem ? t('jobOrderForm.tooltips.costAutoCalc') : ''}
              />
              {errors.estimatedCost && (
                <p className="text-red-500 text-sm mt-1">{errors.estimatedCost}</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
            {t('jobOrderForm.sections.additionalInfo')}
            </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('jobOrderForm.fields.notes.label')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder={t('jobOrderForm.fields.notes.placeholder')}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/job-orders')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('deliveryNotesList.actions.cancel')}
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isEditMode ? t('jobOrderForm.actions.update') : t('jobOrderForm.actions.create')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default JobOrderForm
