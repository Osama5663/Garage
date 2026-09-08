import { useState, useEffect } from 'react'
import { useVehicleRepairStore } from '../stores/vehicleRepairStore'
import { 
  RepairTask, 
  VehicleRepairJobFormData,
  RepairCategory,
  RepairPriority,
  TaskStatus,
  RepairTaskFilter
} from '../types/vehicleRepair'
import {
  Plus,
  Edit,
  Search,
  Filter,
  Download,
  Clock,
  AlertTriangle,
  Wrench,
  Car,
  X,
  Printer,
  FileText,
  Settings,
  BarChart3
} from 'lucide-react'

interface VehicleRepairTaskManagerProps {
  jobId?: string
  customerId?: string
  vehicleId?: string
  onTasksChange?: (tasks: RepairTask[]) => void
  className?: string
}

const VehicleRepairTaskManager = ({ 
  jobId = 'standalone_job', 
  customerId = 'standalone_customer', 
  vehicleId = 'standalone_vehicle', 
  onTasksChange,
  className = ''
}: VehicleRepairTaskManagerProps) => {
  const {
    templates,
    repairJobs,
    activeJob,
    createRepairJob,
    createFromTemplate,
    updateRepairJob,
    updateJobProgress,
    setActiveJob,
    calculateJobTotals,
    exportJob
  } = useVehicleRepairStore()

  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<RepairTaskFilter>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)

  // Initialize or load existing job
  useEffect(() => {
    const existingJob = repairJobs.find(job => job.jobId === jobId)
    if (existingJob) {
      setActiveJob(existingJob)
    }
  }, [jobId, repairJobs, setActiveJob])

  // Notify parent component when tasks change
  useEffect(() => {
    if (onTasksChange && activeJob) {
      onTasksChange(activeJob.tasks)
    }
  }, [activeJob?.tasks, onTasksChange])

  // Category configurations with icons and colors
  const categoryConfig = {
    engine: { icon: Car, color: 'text-red-600 bg-red-50 border-red-200', label: 'Engine' },
    transmission: { icon: Settings, color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'Transmission' },
    brakes: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Brakes' },
    suspension: { icon: Wrench, color: 'text-green-600 bg-green-50 border-green-200', label: 'Suspension' },
    electrical: { icon: Settings, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Electrical' },
    air_conditioning: { icon: Settings, color: 'text-cyan-600 bg-cyan-50 border-cyan-200', label: 'A/C & Heating' },
    exhaust: { icon: Settings, color: 'text-gray-600 bg-gray-50 border-gray-200', label: 'Exhaust' },
    tires: { icon: Car, color: 'text-purple-600 bg-purple-50 border-purple-200', label: 'Tires & Wheels' },
    body: { icon: Car, color: 'text-pink-600 bg-pink-50 border-pink-200', label: 'Body Work' },
    interior: { icon: Settings, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', label: 'Interior' },
    maintenance: { icon: Wrench, color: 'text-teal-600 bg-teal-50 border-teal-200', label: 'Maintenance' },
    diagnostic: { icon: BarChart3, color: 'text-violet-600 bg-violet-50 border-violet-200', label: 'Diagnostic' },
    other: { icon: Settings, color: 'text-slate-600 bg-slate-50 border-slate-200', label: 'Other' }
  }

  const priorityConfig = {
    low: { color: 'text-green-600 bg-green-100', label: 'Low' },
    medium: { color: 'text-yellow-600 bg-yellow-100', label: 'Medium' },
    high: { color: 'text-orange-600 bg-orange-100', label: 'High' },
    urgent: { color: 'text-red-600 bg-red-100', label: 'Urgent' },
    critical: { color: 'text-purple-600 bg-purple-100', label: 'Critical' }
  }

  const statusConfig = {
    pending: { color: 'text-gray-600 bg-gray-100', label: 'Pending' },
    in_progress: { color: 'text-blue-600 bg-blue-100', label: 'In Progress' },
    completed: { color: 'text-green-600 bg-green-100', label: 'Completed' },
    on_hold: { color: 'text-yellow-600 bg-yellow-100', label: 'On Hold' },
    cancelled: { color: 'text-red-600 bg-red-100', label: 'Cancelled' }
  }

  const handleCreateFromTemplate = (templateId: string) => {
    try {
      const job = createFromTemplate(templateId, jobId, customerId, vehicleId, 'current_user')
      setActiveJob(job)
      setShowTemplateSelector(false)
    } catch (error) {
      console.error('Error creating from template:', error)
    }
  }

  const handleCreateNewJob = () => {
    const formData: VehicleRepairJobFormData = {
      title: 'Custom Vehicle Repair Job',
      description: 'Custom repair job created from scratch',
      category: 'maintenance',
      priority: 'medium',
      tasks: [],
      notes: ''
    }
    
    const job = createRepairJob(formData, jobId, customerId, vehicleId, 'current_user')
    setActiveJob(job)
    setIsCreatingNew(false)
  }

  const handleTaskStatusChange = (taskId: string, status: TaskStatus) => {
    if (!activeJob) return
    
    const updatedTasks = activeJob.tasks.map(task =>
      task.id === taskId ? { ...task, status } : task
    )
    
    updateRepairJob(activeJob.id, { tasks: updatedTasks })
    updateJobProgress(activeJob.id)
  }

  const handleExportJob = () => {
    if (!activeJob) return
    
    try {
      const exportData = exportJob(activeJob.id)
      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `repair_job_${activeJob.id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting job:', error)
    }
  }

  const handlePrintJob = () => {
    setShowPrintView(true)
    setTimeout(() => {
      window.print()
      setShowPrintView(false)
    }, 100)
  }

  const filteredTasks = activeJob?.tasks.filter(task => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }
    
    if (filters.category && filters.category.length > 0) {
      if (!filters.category.includes(task.category)) return false
    }
    
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(task.priority)) return false
    }
    
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(task.status)) return false
    }
    
    return true
  }) || []

  const TaskCard = ({ task }: { task: RepairTask }) => {
    const CategoryIcon = categoryConfig[task.category]?.icon || Settings
    const priorityColor = priorityConfig[task.priority]?.color || 'text-gray-600 bg-gray-100'
    const statusColor = statusConfig[task.status]?.color || 'text-gray-600 bg-gray-100'
    
    const completionPercentage = task.status === 'completed' ? 100 : 
      task.status === 'in_progress' ? 50 : 0

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3 flex-1">
              <div className={`p-2 rounded-lg ${categoryConfig[task.category]?.color || 'bg-gray-50'}`}>
                <CategoryIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
                    {priorityConfig[task.priority]?.label || task.priority}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                    {statusConfig[task.status]?.label || task.status}
                  </span>
                  <span className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {task.estimatedHours}h est / {task.actualHours}h actual
                  </span>
                  {/* Prices hidden in repair tasks */}
                </div>

                {task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map(tag => (
                      <span key={tag} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <select
                value={task.status}
                onChange={(e) => handleTaskStatusChange(task.id, e.target.value as TaskStatus)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(statusConfig).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => console.log('Edit task:', task.id)}
                className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                title="Edit task"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                task.status === 'completed' ? 'bg-green-500' :
                task.status === 'in_progress' ? 'bg-blue-500' :
                task.status === 'on_hold' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          {/* Specifications preview */}
          {task.specifications.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Specifications ({task.specifications.length})</h5>
              <div className="space-y-1">
                {task.specifications.slice(0, 2).map(spec => (
                  <div key={spec.id} className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">{spec.partName || 'Labor'}</span>
                    <span className="text-gray-900 font-medium">
                      {spec.quantity > 1 ? `${spec.quantity}x ` : ''}${spec.totalCost.toFixed(2)}
                    </span>
                  </div>
                ))}
                {task.specifications.length > 2 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{task.specifications.length - 2} more specifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!activeJob && !isCreatingNew && !showTemplateSelector) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <Wrench className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Repair Job Started</h3>
          <p className="text-gray-600 mb-6">Create a new repair job or use a template to get started</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span>Use Template</span>
            </button>
            <button
              onClick={handleCreateNewJob}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Job</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showTemplateSelector) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Choose a Template</h2>
          <button
            onClick={() => setShowTemplateSelector(false)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => {
            const CategoryIcon = categoryConfig[template.category]?.icon || Settings
            return (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${categoryConfig[template.category]?.color || 'bg-gray-50'}`}>
                    <CategoryIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Tasks:</span>
                    <span className="font-medium">{template.tasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Hours:</span>
                    <span className="font-medium">{template.totalEstimatedHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Cost:</span>
                    <span className="font-medium">${template.totalEstimatedCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span className="font-medium">{template.usageCount}x</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleCreateFromTemplate(template.id)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Use Template
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!activeJob) return null

  const jobTotals = calculateJobTotals(activeJob.tasks)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{activeJob.title}</h1>
            <p className="text-gray-600 mt-1">{activeJob.description}</p>
            
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig[activeJob.priority]?.color || 'text-gray-600 bg-gray-100'}`}>
                {priorityConfig[activeJob.priority]?.label || activeJob.priority}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[activeJob.status]?.color || 'text-gray-600 bg-gray-100'}`}>
                {statusConfig[activeJob.status]?.label || activeJob.status}
              </span>
              <span className="text-sm text-gray-600">
                <span className="font-medium">{activeJob.tasks.length}</span> tasks
              </span>
              <span className="text-sm text-gray-600">
                <span className="font-medium">{jobTotals.completionPercentage}%</span> complete
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintJob}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={handleExportJob}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-gray-900">{jobTotals.completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${jobTotals.completionPercentage}%` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{jobTotals.totalHours}</div>
              <div className="text-sm text-gray-600">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${jobTotals.totalCost}</div>
              <div className="text-sm text-gray-600">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{activeJob.tasks.filter(t => t.status === 'completed').length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{activeJob.tasks.filter(t => t.status === 'in_progress').length}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              showFilters 
                ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          
          <button
            onClick={() => setIsCreatingNew(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  multiple
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value as RepairCategory)
                    setFilters({ ...filters, category: selected })
                  }}
                >
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  multiple
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value as RepairPriority)
                    setFilters({ ...filters, priority: selected })
                  }}
                >
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  multiple
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value as TaskStatus)
                    setFilters({ ...filters, status: selected })
                  }}
                >
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setFilters({})}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Wrench className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || Object.keys(filters).length > 0 
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first repair task to get started'
              }
            </p>
            <button
              onClick={() => setIsCreatingNew(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>

      {/* Print View */}
      {showPrintView && activeJob && (
        <div className="fixed inset-0 bg-white z-50 p-8 print:p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h1 className="text-2xl font-bold">Print Preview</h1>
              <button
                onClick={() => setShowPrintView(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="border border-gray-300 rounded-lg p-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{activeJob.title}</h1>
                <p className="text-gray-600">{activeJob.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Job Details</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Priority:</span>
                      <span className="font-medium">{priorityConfig[activeJob.priority]?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium">{statusConfig[activeJob.status]?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Tasks:</span>
                      <span className="font-medium">{activeJob.tasks.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion:</span>
                      <span className="font-medium">{jobTotals.completionPercentage}%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Time & Cost Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Estimated Hours:</span>
                      <span className="font-medium">{jobTotals.totalHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Cost:</span>
                      <span className="font-medium">${jobTotals.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Tasks:</span>
                      <span className="font-medium">{activeJob.tasks.filter(t => t.status === 'completed').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining Tasks:</span>
                      <span className="font-medium">{activeJob.tasks.filter(t => t.status !== 'completed').length}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Repair Tasks</h3>
                <div className="space-y-4">
                  {activeJob.tasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600">{task.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${priorityConfig[task.priority]?.color}`}>
                            {priorityConfig[task.priority]?.label}
                          </div>
                          <div className={`text-sm ${statusConfig[task.status]?.color}`}>
                            {statusConfig[task.status]?.label}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Estimated Hours:</span>
                          <span className="ml-2 font-medium">{task.estimatedHours}h</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Actual Hours:</span>
                          <span className="ml-2 font-medium">{task.actualHours}h</span>
                        </div>
                      </div>
                      
                      {task.specifications.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Specifications:</h5>
                          <div className="space-y-1">
                            {task.specifications.map(spec => (
                              <div key={spec.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {spec.partName || 'Labor'} {spec.quantity > 1 && `(${spec.quantity}x)`}
                                </span>
                                {/* Price hidden */}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {activeJob.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-600 text-sm">{activeJob.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VehicleRepairTaskManager
