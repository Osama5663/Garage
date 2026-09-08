import { useState, useRef, useEffect } from 'react'
import { useJobDescriptionStore } from '../stores/jobDescriptionStore'
import { JobDescription, JobDescriptionFormData, JobTaskFormData, JobTask } from '../types/jobDescription'
import EnhancedJobDescriptionForm from './EnhancedJobDescriptionForm'
import { 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RotateCcw, 
  RotateCw,
  GripVertical,
  X,
  DollarSign,
  Calculator,
  AlertCircle,
  RefreshCw,
  Wrench,
  Package
} from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

interface JobDescriptionListProps {
  onDescriptionsChange?: (descriptions: JobDescription[]) => void
  jobOrderId?: string
}

const JobDescriptionList = ({ onDescriptionsChange, jobOrderId }: JobDescriptionListProps) => {
  const {
    descriptions,
    editingId,
    isAddingNew,
    draggedId,
    draggedOverId,
    isLoading,
    error,
    initialize,
    addDescription,
    updateDescription,
    deleteDescription,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    setEditingId,
    setIsAddingNew,
    reorderDescriptions,
    undo,
    redo,
    canUndo,
    canRedo,
    setDraggedId,
    setDraggedOverId,
    loadJobDescriptionsForJobOrder
  } = useJobDescriptionStore()

  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const onDescriptionsChangeRef = useRef(onDescriptionsChange)

  // Update the ref when the callback changes
  useEffect(() => {
    onDescriptionsChangeRef.current = onDescriptionsChange
  }, [onDescriptionsChange])

  // Notify parent when descriptions change
  useEffect(() => {
    if (onDescriptionsChangeRef.current) {
      onDescriptionsChangeRef.current(descriptions)
    }
  }, [descriptions])

  // Auto-hide feedback messages
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Initialize store on component mount
  useEffect(() => {
    console.log('JobDescriptionList: Component mounted, initializing store')
    if (jobOrderId) {
      loadJobDescriptionsForJobOrder(jobOrderId)
    } else {
      initialize()
    }
  }, [initialize, jobOrderId, loadJobDescriptionsForJobOrder])

  // Show error feedback when error changes
  useEffect(() => {
    if (error) {
      setFeedback({ type: 'error', message: error })
    }
  }, [error])

  const handleAddDescription = async (formData: JobDescriptionFormData) => {
    console.log('JobDescriptionList: handleAddDescription called with:', formData)
    try {
      await addDescription(formData)
      setFeedback({ type: 'success', message: 'Job description added successfully!' })
      console.log('JobDescriptionList: Description added successfully')
    } catch (error) {
      console.error('JobDescriptionList: Error adding description:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add job description. Please try again.'
      setFeedback({ type: 'error', message: errorMessage })
      throw error // Re-throw to allow form to handle
    }
  }

  const handleUpdateDescription = async (id: string, formData: JobDescriptionFormData) => {
    console.log('JobDescriptionList: handleUpdateDescription called with:', id, formData)
    try {
      await updateDescription(id, formData)
      setFeedback({ type: 'success', message: 'Job description updated successfully!' })
      console.log('JobDescriptionList: Description updated successfully')
    } catch (error) {
      console.error('JobDescriptionList: Error updating description:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update job description. Please try again.'
      setFeedback({ type: 'error', message: errorMessage })
      throw error
    }
  }

  const handleDeleteDescription = async (id: string) => {
    console.log('JobDescriptionList: handleDeleteDescription called with:', id)
    try {
      await deleteDescription(id)
      setFeedback({ type: 'success', message: 'Job description deleted successfully!' })
      console.log('JobDescriptionList: Description deleted successfully')
    } catch (error) {
      console.error('JobDescriptionList: Error deleting description:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete job description. Please try again.'
      setFeedback({ type: 'error', message: errorMessage })
    }
  }

  const handleShowPricingPreview = async (_descriptionId: string, estimatedHours: number, priority: string) => {
    try {
      const pricing = useJobDescriptionStore.getState().calculatePricingPreview(estimatedHours, priority)
      console.log('Pricing preview calculated:', pricing)
      // Pricing preview functionality can be implemented here if needed
    } catch (error) {
      console.error('Error calculating pricing preview:', error)
      setFeedback({ type: 'error', message: 'Failed to calculate pricing preview' })
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedDescriptions)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedDescriptions(newExpanded)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index
    setDraggedId(descriptions[index].id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnter = (_e: React.DragEvent, index: number) => {
    dragOverItem.current = index
    setDraggedOverId(descriptions[index].id)
  }

  const handleDragEnd = async () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      try {
        await reorderDescriptions(dragItem.current, dragOverItem.current)
        setFeedback({ type: 'success', message: 'Job description reordered successfully!' })
      } catch (error) {
        console.error('Error reordering descriptions:', error)
        setFeedback({ type: 'error', message: 'Failed to reorder job descriptions' })
      }
    }
    dragItem.current = null
    dragOverItem.current = null
    setDraggedId(null)
    setDraggedOverId(null)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />
      case 'high': return <AlertCircle className="w-4 h-4" />
      case 'medium': return <Clock className="w-4 h-4" />
      case 'low': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  // Loading state
  if (isLoading && descriptions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-gray-600">Loading job descriptions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Error and Success Notifications */}
      {feedback && (
        <div className={`mb-4 p-4 rounded-lg border ${
          feedback.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 mr-2" />
            )}
            <span className="font-medium">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <RefreshCw className="w-4 h-4 mr-2 text-blue-600 animate-spin" />
            <span className="text-blue-800 text-sm">Processing...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Job Descriptions</h2>
          <p className="text-gray-600 mt-1">Manage job descriptions with automatic pricing calculation</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className={`p-2 rounded-lg transition-colors ${
              canUndo()
                ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
            aria-label="Undo last action"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className={`p-2 rounded-lg transition-colors ${
              canRedo()
                ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
            aria-label="Redo last undone action"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              console.log('JobDescriptionList: Add Job Description button clicked')
              setIsAddingNew(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Job Description</span>
          </button>
        </div>
      </div>

      {/* Add New Form */}
      {isAddingNew && (
        <div className="mb-6 animate-in slide-in-from-top duration-300">
          <EnhancedJobDescriptionForm
            onSave={handleAddDescription}
            onCancel={() => setIsAddingNew(false)}
          />
        </div>
      )}

      {/* Job Descriptions List */}
      <div className="space-y-4">
        {descriptions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <AlertTriangle className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {error ? 'Error loading job descriptions' : 'No job descriptions yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {error ? error : 'Start by adding your first job description'}
            </p>
            {error && (
              <button
                onClick={() => jobOrderId ? loadJobDescriptionsForJobOrder(jobOrderId) : initialize()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            )}
            {!error && (
              <button
                onClick={() => setIsAddingNew(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Job Description</span>
              </button>
            )}
          </div>
        ) : (
          descriptions.map((description, index) => (
            <div
              key={description.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              className={`border rounded-lg transition-all duration-200 ${
                draggedId === description.id
                  ? 'opacity-50 shadow-lg'
                  : draggedOverId === description.id
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {editingId === description.id ? (
                <EnhancedJobDescriptionForm
                  initialData={description}
                  onSave={(formData) => handleUpdateDescription(description.id, formData)}
                  onCancel={() => setEditingId(null)}
                  isEditing
                />
              ) : (
                <>
                  {/* Job Description Header */}
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          onClick={() => toggleExpanded(description.id)}
                          className="text-gray-500 hover:text-gray-700 transition-colors mt-1"
                          aria-label={expandedDescriptions.has(description.id) ? 'Collapse' : 'Expand'}
                        >
                          {expandedDescriptions.has(description.id) ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{description.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(description.priority)} flex items-center space-x-1`}>
                              {getPriorityIcon(description.priority)}
                              <span>{description.priority.charAt(0).toUpperCase() + description.priority.slice(1)}</span>
                            </span>
                          </div>
                          <p className="text-gray-600 mt-1">{description.description}</p>
                          
                          {/* Enhanced Pricing Information */}
                          {(description as any).calculatedTotalCost && (
                            <div className="mt-3 space-y-3">
                              {/* Parts Section */}
                              {description.parts && description.parts.length > 0 && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Package className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-900">Parts</span>
                                    <span className="text-xs text-green-700 ml-auto">
                                      Subtotal: {formatCurrency(description.parts.reduce((total, part) => total + part.totalCost, 0))}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    {description.parts.map((part) => (
                                      <div key={part.id} className="flex justify-between items-center">
                                        <span className="text-green-800">{part.name} × {part.quantity}</span>
                                        <span className="text-green-900 font-medium">
                                          {formatCurrency(part.totalCost)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Labor Section */}
                              {description.labor && description.labor.length > 0 && (
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Wrench className="w-4 h-4 text-orange-600" />
                                    <span className="text-sm font-medium text-orange-900">Labor</span>
                                    <span className="text-xs text-orange-700 ml-auto">
                                      Subtotal: {formatCurrency(description.labor.reduce((total, labor) => total + labor.totalCost, 0))}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    {description.labor.map((labor) => (
                                      <div key={labor.id} className="flex justify-between items-center">
                                        <span className="text-orange-800">{labor.description} ({labor.hours}h)</span>
                                        <span className="text-orange-900 font-medium">
                                          {formatCurrency(labor.totalCost)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Total Summary */}
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Calculator className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-900">Total Summary</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Parts:</span>
                                    <div className="font-medium text-blue-900">
                                      {formatCurrency(description.parts?.reduce((total, part) => total + part.totalCost, 0) || 0)}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Labor:</span>
                                    <div className="font-medium text-blue-900">
                                      {formatCurrency(description.labor?.reduce((total, labor) => total + labor.totalCost, 0) || 0)}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Grand Total:</span>
                                    <div className="font-bold text-blue-900">
                                      {formatCurrency(
                                        (description.parts?.reduce((total, part) => total + part.totalCost, 0) || 0) +
                                        (description.labor?.reduce((total, labor) => total + labor.totalCost, 0) || 0)
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-3">
                            <span className="flex items-center text-sm text-gray-500">
                              <Clock className="w-4 h-4 mr-1" />
                              {description.estimatedHours}h estimated
                            </span>
                            <span className="text-sm text-gray-500">
                              {description.tasks.length} tasks
                            </span>
                            {(description as any).calculatedTotalCost && (
                              <span className="flex items-center text-sm font-medium text-blue-600">
                                <DollarSign className="w-4 h-4 mr-1" />
                                {formatCurrency((description as any).calculatedTotalCost)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleShowPricingPreview(description.id, description.estimatedHours, description.priority)}
                          className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                          title="View pricing breakdown"
                          aria-label="View pricing breakdown"
                        >
                          <Calculator className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(description.id)}
                          className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                          aria-label="Edit job description"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            console.log('JobDescriptionList: Delete button clicked for description:', description.id)
                            setShowDeleteConfirm(description.id)
                          }}
                          className="text-gray-500 hover:text-red-600 transition-colors p-1"
                          aria-label="Delete job description"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="text-gray-400 cursor-grab active:cursor-grabbing p-1">
                          <GripVertical className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks Section */}
                  {expandedDescriptions.has(description.id) && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900">Tasks</h4>
                        <button
                          onClick={() => {
                            const taskData: JobTaskFormData = {
                              title: '',
                              description: '',
                              estimatedHours: 1,
                              priority: 'medium'
                            }
                            addTask(description.id, taskData)
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Task</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {description.tasks.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">No tasks added yet</p>
                        ) : (
                          description.tasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onToggleComplete={() => toggleTaskComplete(description.id, task.id)}
                              onUpdate={(taskData) => updateTask(description.id, task.id, taskData)}
                              onDelete={() => deleteTask(description.id, task.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onConfirm={() => {
            handleDeleteDescription(showDeleteConfirm)
            setShowDeleteConfirm(null)
          }}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  )
}



interface TaskItemProps {
  task: JobTask
  onToggleComplete: () => void
  onUpdate: (taskData: JobTaskFormData) => void
  onDelete: () => void
}

const TaskItem = ({ task, onToggleComplete, onUpdate, onDelete }: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<JobTaskFormData>({
    title: task.title,
    description: task.description,
    estimatedHours: task.estimatedHours,
    priority: task.priority
  })

  const handleSave = () => {
    onUpdate(formData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      title: task.title,
      description: task.description,
      estimatedHours: task.estimatedHours,
      priority: task.priority
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="space-y-3">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Task title"
          />
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            placeholder="Task description"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0.5 }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Hours"
            />
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <button
            onClick={onToggleComplete}
            className={`mt-1 transition-colors ${
              task.completed
                ? 'text-green-600 hover:text-green-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {task.completed ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
            )}
          </button>
          <div className="flex-1">
            <h5 className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              {task.title}
            </h5>
            <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
              {task.description}
            </p>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                task.priority === 'high' ? 'text-red-600 bg-red-50' :
                task.priority === 'medium' ? 'text-yellow-600 bg-yellow-50' :
                task.priority === 'low' ? 'text-green-600 bg-green-50' :
                'text-gray-600 bg-gray-50'
              }`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
              <span className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {task.estimatedHours}h
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-500 hover:text-blue-600 transition-colors p-1"
            aria-label="Edit task"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-gray-500 hover:text-red-600 transition-colors p-1"
            aria-label="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface DeleteConfirmModalProps {
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmModal = ({ onConfirm, onCancel }: DeleteConfirmModalProps) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
      <p className="text-gray-600 mb-6">
        Are you sure you want to delete this job description? This action cannot be undone.
      </p>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)

export default JobDescriptionList
