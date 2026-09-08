import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  RepairTask, 
  VehicleRepairTemplate, 
  VehicleRepairJob, 
  RepairTaskFormData, 
  VehicleRepairTemplateFormData, 
  VehicleRepairJobFormData,
  RepairTaskFilter,
  RepairTaskSearchResult,
  RepairCategory,
  RepairPriority,
  TaskStatus
} from '../types/vehicleRepair'

interface VehicleRepairStore {
  // State
  repairTasks: RepairTask[]
  templates: VehicleRepairTemplate[]
  repairJobs: VehicleRepairJob[]
  activeJob: VehicleRepairJob | null
  isLoading: boolean
  searchResults: RepairTaskSearchResult | null
  
  // Template Management
  createTemplate: (formData: VehicleRepairTemplateFormData, createdBy: string) => void
  updateTemplate: (id: string, formData: Partial<VehicleRepairTemplateFormData>) => void
  deleteTemplate: (id: string) => void
  getTemplateById: (id: string) => VehicleRepairTemplate | undefined
  getTemplatesByCategory: (category: RepairCategory) => VehicleRepairTemplate[]
  
  // Task Management
  createTask: (formData: RepairTaskFormData) => RepairTask
  updateTask: (id: string, formData: Partial<RepairTaskFormData>) => void
  deleteTask: (id: string) => void
  updateTaskStatus: (id: string, status: TaskStatus, notes?: string, completedBy?: string) => void
  updateTaskProgress: (id: string, actualHours: number, actualCost: number) => void
  assignTask: (id: string, assignedTo: string) => void
  addTaskPhoto: (id: string, photoUrl: string) => void
  addTaskSpecification: (id: string, spec: Omit<RepairTask['specifications'][0], 'id'>) => void
  updateTaskSpecification: (taskId: string, specId: string, spec: Partial<RepairTask['specifications'][0]>) => void
  removeTaskSpecification: (taskId: string, specId: string) => void
  
  // Repair Job Management
  createRepairJob: (formData: VehicleRepairJobFormData, jobId: string, customerId: string, vehicleId: string, createdBy: string) => VehicleRepairJob
  updateRepairJob: (id: string, formData: Partial<VehicleRepairJobFormData>) => void
  deleteRepairJob: (id: string) => void
  createFromTemplate: (templateId: string, jobId: string, customerId: string, vehicleId: string, createdBy: string) => VehicleRepairJob
  updateRepairJobStatus: (id: string, status: TaskStatus) => void
  updateJobProgress: (id: string) => void
  setActiveJob: (job: VehicleRepairJob | null) => void
  getRepairJobById: (id: string) => VehicleRepairJob | undefined
  
  // Search and Filter
  searchTasks: (filters: RepairTaskFilter) => void
  clearSearch: () => void
  
  // Categories and Utilities
  getCategories: () => RepairCategory[]
  getPriorities: () => RepairPriority[]
  getStatuses: () => TaskStatus[]
  calculateJobTotals: (tasks: RepairTask[]) => { totalHours: number; totalCost: number; completionPercentage: number }
  getTotalEstimatedHours: () => number
  getTotalEstimatedCost: () => number
  setCurrentJob: (job: VehicleRepairJob | null) => void
  
  // Export/Import
  exportJob: (id: string) => string
  exportTemplate: (id: string) => string
}

// Mock data for vehicle repair templates
const mockTemplates: VehicleRepairTemplate[] = [
  {
    id: 'template_brake_service',
    name: 'Complete Brake Service',
    description: 'Comprehensive brake system inspection and service',
    category: 'brakes',
    tasks: [
      {
        title: 'Brake Pad Inspection',
        description: 'Inspect brake pad thickness and wear patterns',
        category: 'brakes',
        priority: 'high',
        estimatedHours: 0.5,
        estimatedCost: 25,
        specifications: [{
          id: 'spec_1',
          partName: 'Brake Pads (Set)',
          quantity: 1,
          unitCost: 45.99,
          totalCost: 45.99,
          laborHours: 1.5,
          required: true,
          supplier: 'AutoParts Co',
          warranty: '12 months/12,000 miles'
        }],
        dependencies: [],
        tags: ['safety', 'inspection'],
        photos: [],
        diagnosticCodes: []
      },
      {
        title: 'Brake Rotor Resurfacing',
        description: 'Machine rotors to remove glazing and restore flat surface',
        category: 'brakes',
        priority: 'medium',
        estimatedHours: 1.0,
        estimatedCost: 45,
        specifications: [],
        dependencies: ['task_1'],
        tags: ['machining', 'restoration'],
        photos: [],
        diagnosticCodes: []
      },
      {
        title: 'Brake Fluid Flush',
        description: 'Replace old brake fluid with fresh DOT3 fluid',
        category: 'brakes',
        priority: 'medium',
        estimatedHours: 0.75,
        estimatedCost: 35,
        specifications: [{
          id: 'spec_2',
          partName: 'DOT3 Brake Fluid',
          quantity: 2,
          unitCost: 12.99,
          totalCost: 25.98,
          laborHours: 0.75,
          required: true,
          supplier: 'BrakeTech',
          warranty: '6 months'
        }],
        dependencies: [],
        tags: ['maintenance', 'fluids'],
        photos: [],
        diagnosticCodes: []
      }
    ],
    totalEstimatedHours: 2.25,
    totalEstimatedCost: 105,
    commonVehicles: ['Toyota Camry', 'Honda Accord', 'Ford F-150'],
    tags: ['brakes', 'safety', 'maintenance'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin',
    isActive: true,
    usageCount: 15
  },
  {
    id: 'template_oil_change',
    name: 'Standard Oil Change Service',
    description: 'Complete oil change with filter and basic inspection',
    category: 'maintenance',
    tasks: [
      {
        title: 'Drain Old Oil',
        description: 'Remove drain plug and drain old engine oil',
        category: 'maintenance',
        priority: 'medium',
        estimatedHours: 0.25,
        estimatedCost: 15,
        specifications: [],
        dependencies: [],
        tags: ['oil', 'drain'],
        photos: [],
        diagnosticCodes: []
      },
      {
        title: 'Replace Oil Filter',
        description: 'Remove old filter and install new oil filter',
        category: 'maintenance',
        priority: 'medium',
        estimatedHours: 0.25,
        estimatedCost: 20,
        specifications: [{
          id: 'spec_3',
          partName: 'Oil Filter',
          quantity: 1,
          unitCost: 8.99,
          totalCost: 8.99,
          laborHours: 0.25,
          required: true,
          supplier: 'FilterPro',
          warranty: 'Manufacturer warranty'
        }],
        dependencies: ['task_1'],
        tags: ['filter', 'replacement'],
        photos: [],
        diagnosticCodes: []
      },
      {
        title: 'Add New Oil',
        description: 'Install correct amount and type of new engine oil',
        category: 'maintenance',
        priority: 'high',
        estimatedHours: 0.25,
        estimatedCost: 25,
        specifications: [{
          id: 'spec_4',
          partName: 'Engine Oil 5W-30',
          quantity: 5,
          unitCost: 6.99,
          totalCost: 34.95,
          laborHours: 0.25,
          required: true,
          supplier: 'OilCorp',
          warranty: 'Manufacturer warranty'
        }],
        dependencies: ['task_2'],
        tags: ['oil', 'fill'],
        photos: [],
        diagnosticCodes: []
      },
      {
        title: 'Basic Safety Inspection',
        description: 'Check lights, belts, hoses, and fluid levels',
        category: 'maintenance',
        priority: 'low',
        estimatedHours: 0.5,
        estimatedCost: 30,
        specifications: [],
        dependencies: ['task_3'],
        tags: ['inspection', 'safety'],
        photos: [],
        diagnosticCodes: []
      }
    ],
    totalEstimatedHours: 1.25,
    totalEstimatedCost: 90,
    commonVehicles: ['All vehicles'],
    tags: ['maintenance', 'oil', 'filter'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin',
    isActive: true,
    usageCount: 42
  }
]

export const useVehicleRepairStore = create<VehicleRepairStore>()(
  persist(
    (set, get) => ({
  repairTasks: [],
  templates: mockTemplates,
  repairJobs: [],
  activeJob: null,
  isLoading: false,
  searchResults: null,

  // Template Management
  createTemplate: (formData, createdBy) => {
    const newTemplate: VehicleRepairTemplate = {
      id: `template_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      tasks: formData.tasks.map(task => {
        // Convert specifications to proper format
        const specifications = task.specifications.map(spec => ({
          id: `spec_${Date.now()}_${Math.random()}`,
          partName: spec.partName,
          quantity: spec.quantity,
          unitCost: spec.unitCost,
          totalCost: spec.quantity * spec.unitCost,
          laborHours: spec.laborHours,
          required: spec.required,
          supplier: spec.supplier,
          warranty: spec.warranty
        }))
        
        return {
          title: task.title,
          description: task.description,
          category: task.category,
          subcategory: task.subcategory,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          estimatedCost: task.estimatedCost,
          specifications,
          dependencies: task.dependencies,
          tags: task.tags,
          photos: task.photos || [],
          diagnosticCodes: task.diagnosticCodes || []
        }
      }),
      totalEstimatedHours: formData.tasks.reduce((sum, task) => sum + task.estimatedHours, 0),
      totalEstimatedCost: formData.tasks.reduce((sum, task) => sum + task.estimatedCost, 0),
      commonVehicles: formData.commonVehicles || [],
      tags: formData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      isActive: true,
      usageCount: 0
    }
    
    set((state) => ({
      templates: [...state.templates, newTemplate]
    }))
  },

  updateTemplate: (id, formData) => {
    set((state) => ({
      templates: state.templates.map(template =>
        template.id === id
          ? {
              ...template,
              ...formData,
              tasks: formData.tasks 
                ? formData.tasks.map(task => {
                    // Convert specifications to proper format
                    const specifications = task.specifications.map(spec => ({
                      id: `spec_${Date.now()}_${Math.random()}`,
                      partName: spec.partName,
                      quantity: spec.quantity,
                      unitCost: spec.unitCost,
                      totalCost: spec.quantity * spec.unitCost,
                      laborHours: spec.laborHours,
                      required: spec.required,
                      supplier: spec.supplier,
                      warranty: spec.warranty
                    }))
                    
                    return {
                      title: task.title,
                      description: task.description,
                      category: task.category,
                      subcategory: task.subcategory,
                      priority: task.priority,
                      estimatedHours: task.estimatedHours,
                      estimatedCost: task.estimatedCost,
                      specifications,
                      dependencies: task.dependencies,
                      tags: task.tags,
                      photos: task.photos || [],
                      diagnosticCodes: task.diagnosticCodes || []
                    }
                  })
                : template.tasks,
              totalEstimatedHours: formData.tasks 
                ? formData.tasks.reduce((sum, task) => sum + task.estimatedHours, 0)
                : template.totalEstimatedHours,
              totalEstimatedCost: formData.tasks
                ? formData.tasks.reduce((sum, task) => sum + task.estimatedCost, 0)
                : template.totalEstimatedCost,
              updatedAt: new Date().toISOString()
            }
          : template
      )
    }))
  },

  deleteTemplate: (id) => {
    set((state) => ({
      templates: state.templates.filter(template => template.id !== id)
    }))
  },

  getTemplateById: (id) => {
    return get().templates.find(template => template.id === id)
  },

  getTemplatesByCategory: (category) => {
    return get().templates.filter(template => template.category === category)
  },

  // Task Management
  createTask: (formData) => {
    const newTask: RepairTask = {
      id: `task_${Date.now()}`,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      subcategory: formData.subcategory,
      priority: formData.priority,
      estimatedHours: formData.estimatedHours,
      estimatedCost: formData.estimatedCost,
      specifications: formData.specifications?.map(spec => ({
        id: `spec_${Date.now()}_${Math.random()}`,
        partName: spec.partName || '',
        quantity: spec.quantity,
        unitCost: spec.unitCost,
        totalCost: spec.quantity * spec.unitCost,
        laborHours: spec.laborHours,
        required: spec.required,
        supplier: spec.supplier || '',
        warranty: spec.warranty || ''
      })) || [],
      dependencies: formData.dependencies || [],
      tags: formData.tags || [],
      photos: formData.photos || [],
      diagnosticCodes: formData.diagnosticCodes || [],
      status: 'pending',
      actualHours: 0,
      actualCost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    set((state) => ({
      repairTasks: [...state.repairTasks, newTask]
    }))
    
    return newTask
  },

  updateTask: (id, formData) => {
    set((state) => ({
      repairTasks: state.repairTasks.map(task =>
        task.id === id
          ? { 
              ...task, 
              ...formData, 
              specifications: formData.specifications 
                ? formData.specifications.map(spec => ({
                    id: `spec_${Date.now()}_${Math.random()}`,
                    partName: spec.partName || '',
                    quantity: spec.quantity,
                    unitCost: spec.unitCost,
                    totalCost: spec.quantity * spec.unitCost,
                    laborHours: spec.laborHours,
                    required: spec.required,
                    supplier: spec.supplier || '',
                    warranty: spec.warranty || ''
                  }))
                : task.specifications,
              updatedAt: new Date().toISOString() 
            }
          : task
      )
    }))
  },

  deleteTask: (id) => {
    set((state) => ({
      repairTasks: state.repairTasks.filter(task => task.id !== id)
    }))
  },

  updateTaskStatus: (id, status, notes, completedBy) => {
    set((state) => ({
      repairTasks: state.repairTasks.map(task =>
        task.id === id
          ? {
              ...task,
              status,
              completionNotes: notes || task.completionNotes,
              completedBy: completedBy || task.completedBy,
              completedAt: status === 'completed' ? new Date().toISOString() : task.completedAt,
              updatedAt: new Date().toISOString()
            }
          : task
      )
    }))
  },

  updateTaskProgress: (id, actualHours, actualCost) => {
    set((state) => ({
      repairTasks: state.repairTasks.map(task =>
        task.id === id
          ? {
              ...task,
              actualHours,
              actualCost,
              updatedAt: new Date().toISOString()
            }
          : task
      )
    }))
  },

  assignTask: (id, assignedTo) => {
    set((state) => ({
      repairTasks: state.repairTasks.map(task =>
        task.id === id
          ? { ...task, assignedTo, updatedAt: new Date().toISOString() }
          : task
      )
    }))
  },

  addTaskPhoto: (id, photoUrl) => {
    set((state) => ({
      repairTasks: state.repairTasks.map(task =>
        task.id === id
          ? { ...task, photos: [...task.photos, photoUrl], updatedAt: new Date().toISOString() }
          : task
      )
    }))
  },

  addTaskSpecification: (id, spec) => {
    const newSpec = { 
      id: `spec_${Date.now()}`,
      partName: spec.partName || '',
      quantity: spec.quantity,
      unitCost: spec.unitCost,
      totalCost: spec.quantity * spec.unitCost,
      laborHours: spec.laborHours,
      required: spec.required,
      supplier: spec.supplier || '',
      warranty: spec.warranty || ''
    }
    set((state) => ({
      repairTasks: state.repairTasks.map(task =>
        task.id === id
          ? { 
              ...task, 
              specifications: [...task.specifications, newSpec],
              updatedAt: new Date().toISOString()
            }
          : task
      )
    }))
  },

  updateTaskSpecification: (taskId, specId, spec) => {
    set((state) => ({
      repairTasks: state.repairTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              specifications: task.specifications.map(s =>
                s.id === specId ? { ...s, ...spec } : s
              ),
              updatedAt: new Date().toISOString()
            }
          : task
      )
    }))
  },

  removeTaskSpecification: (taskId, specId) => {
    set((state) => ({
      repairTasks: state.repairTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              specifications: task.specifications.filter(s => s.id !== specId),
              updatedAt: new Date().toISOString()
            }
          : task
      )
    }))
  },

  // Repair Job Management
  createRepairJob: (formData, jobId, customerId, vehicleId, createdBy) => {
    const repairTasks = formData.tasks.map(task => {
      const taskId = `task_${Date.now()}_${Math.random()}`
      return {
        id: taskId,
        title: task.title,
        description: task.description,
        category: task.category,
        subcategory: task.subcategory,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        estimatedCost: task.estimatedCost,
        specifications: task.specifications?.map(spec => ({
          id: `spec_${Date.now()}_${Math.random()}`,
          partName: spec.partName || '',
          quantity: spec.quantity,
          unitCost: spec.unitCost,
          totalCost: spec.quantity * spec.unitCost,
          laborHours: spec.laborHours,
          required: spec.required,
          supplier: spec.supplier || '',
          warranty: spec.warranty || ''
        })) || [],
        dependencies: task.dependencies || [],
        tags: task.tags || [],
        photos: task.photos || [],
        diagnosticCodes: task.diagnosticCodes || [],
        status: 'pending' as TaskStatus,
        actualHours: 0,
        actualCost: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })
    
    const totals = get().calculateJobTotals(repairTasks)
    const newJob: VehicleRepairJob = {
      id: `repair_job_${Date.now()}`,
      jobId,
      customerId,
      vehicleId,
      templateId: formData.templateId,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      status: 'pending',
      tasks: formData.tasks.map(task => {
        const taskId = `task_${Date.now()}_${Math.random()}`
        return {
          id: taskId,
          title: task.title,
          description: task.description,
          category: task.category,
          subcategory: task.subcategory,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          estimatedCost: task.estimatedCost,
          specifications: task.specifications?.map(spec => ({
            id: `spec_${Date.now()}_${Math.random()}`,
            partName: spec.partName || '',
            quantity: spec.quantity,
            unitCost: spec.unitCost,
            totalCost: spec.quantity * spec.unitCost,
            laborHours: spec.laborHours,
            required: spec.required,
            supplier: spec.supplier || '',
            warranty: spec.warranty || ''
          })) || [],
          dependencies: task.dependencies || [],
          tags: task.tags || [],
          photos: task.photos || [],
          diagnosticCodes: task.diagnosticCodes || [],
          status: 'pending' as TaskStatus,
          actualHours: 0,
          actualCost: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }),
      totalEstimatedHours: totals.totalHours,
      totalActualHours: 0,
      totalEstimatedCost: totals.totalCost,
      totalActualCost: 0,
      completionPercentage: 0,
      photos: [],
      documents: [],
      customerApproval: {
        approved: false
      },
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy
    }
    
    set((state) => ({
      repairJobs: [...state.repairJobs, newJob],
      activeJob: newJob
    }))
    
    return newJob
  },

  updateRepairJob: (id, formData) => {
    set((state) => ({
      repairJobs: state.repairJobs.map(job =>
        job.id === id
          ? {
              ...job,
              ...formData,
              tasks: formData.tasks
                ? formData.tasks.map(task => {
                    const taskId = `task_${Date.now()}_${Math.random()}`
                    return {
                      id: taskId,
                      title: task.title,
                      description: task.description,
                      category: task.category,
                      subcategory: task.subcategory,
                      priority: task.priority,
                      estimatedHours: task.estimatedHours,
                      estimatedCost: task.estimatedCost,
                      specifications: task.specifications?.map(spec => ({
                        id: `spec_${Date.now()}_${Math.random()}`,
                        partName: spec.partName || '',
                        quantity: spec.quantity,
                        unitCost: spec.unitCost,
                        totalCost: spec.quantity * spec.unitCost,
                        laborHours: spec.laborHours,
                        required: spec.required,
                        supplier: spec.supplier || '',
                        warranty: spec.warranty || ''
                      })) || [],
                      dependencies: task.dependencies || [],
                      tags: task.tags || [],
                      photos: task.photos || [],
                      diagnosticCodes: task.diagnosticCodes || [],
                      status: 'pending' as TaskStatus,
                      actualHours: 0,
                      actualCost: 0,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    }
                  })
                : job.tasks,
              totalEstimatedHours: formData.tasks
                ? get().calculateJobTotals(formData.tasks.map(task => ({
                  id: `task_${Date.now()}_${Math.random()}`,
                  title: task.title,
                  description: task.description,
                  category: task.category,
                  subcategory: task.subcategory,
                  priority: task.priority,
                  estimatedHours: task.estimatedHours,
                  estimatedCost: task.estimatedCost,
                  specifications: task.specifications?.map(spec => ({
                    id: `spec_${Date.now()}_${Math.random()}`,
                    partName: spec.partName || '',
                    quantity: spec.quantity,
                    unitCost: spec.unitCost,
                    totalCost: spec.quantity * spec.unitCost,
                    laborHours: spec.laborHours,
                    required: spec.required,
                    supplier: spec.supplier || '',
                    warranty: spec.warranty || ''
                  })) || [],
                  dependencies: task.dependencies || [],
                  tags: task.tags || [],
                  photos: task.photos || [],
                  diagnosticCodes: task.diagnosticCodes || [],
                  status: 'pending' as TaskStatus,
                  actualHours: 0,
                  actualCost: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }))).totalHours
                : job.totalEstimatedHours,
              totalEstimatedCost: formData.tasks
                ? get().calculateJobTotals(formData.tasks.map(task => ({
                  id: `task_${Date.now()}_${Math.random()}`,
                  title: task.title,
                  description: task.description,
                  category: task.category,
                  subcategory: task.subcategory,
                  priority: task.priority,
                  estimatedHours: task.estimatedHours,
                  estimatedCost: task.estimatedCost,
                  specifications: task.specifications?.map(spec => ({
                    id: `spec_${Date.now()}_${Math.random()}`,
                    partName: spec.partName || '',
                    quantity: spec.quantity,
                    unitCost: spec.unitCost,
                    totalCost: spec.quantity * spec.unitCost,
                    laborHours: spec.laborHours,
                    required: spec.required,
                    supplier: spec.supplier || '',
                    warranty: spec.warranty || ''
                  })) || [],
                  dependencies: task.dependencies || [],
                  tags: task.tags || [],
                  photos: task.photos || [],
                  diagnosticCodes: task.diagnosticCodes || [],
                  status: 'pending' as TaskStatus,
                  actualHours: 0,
                  actualCost: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }))).totalCost
                : job.totalEstimatedCost,
              updatedAt: new Date().toISOString()
            }
          : job
      )
    }))
  },

  deleteRepairJob: (id) => {
    set((state) => ({
      repairJobs: state.repairJobs.filter(job => job.id !== id)
    }))
  },

  createFromTemplate: (templateId, jobId, customerId, vehicleId, createdBy) => {
    const template = get().getTemplateById(templateId)
    if (!template) throw new Error('Template not found')
    
    const tasks: RepairTask[] = template.tasks.map(task => ({
      ...task,
      id: `task_${Date.now()}_${Math.random()}`,
      status: 'pending',
      actualHours: 0,
      actualCost: 0,
      photos: [],
      diagnosticCodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependencies: []
    }))
    
    const newJob: VehicleRepairJob = {
      id: `repair_job_${Date.now()}`,
      jobId,
      customerId,
      vehicleId,
      templateId,
      title: template.name,
      description: template.description,
      category: template.category,
      priority: 'medium',
      status: 'pending',
      tasks,
      totalEstimatedHours: template.totalEstimatedHours,
      totalActualHours: 0,
      totalEstimatedCost: template.totalEstimatedCost,
      totalActualCost: 0,
      completionPercentage: 0,
      notes: '',
      photos: [],
      documents: [],
      customerApproval: { approved: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy
    }
    
    set((state) => ({
      repairJobs: [...state.repairJobs, newJob],
      templates: state.templates.map(t =>
        t.id === templateId ? { ...t, usageCount: t.usageCount + 1 } : t
      )
    }))
    
    return newJob
  },

  updateRepairJobStatus: (id, status) => {
    set((state) => ({
      repairJobs: state.repairJobs.map(job =>
        job.id === id
          ? { ...job, status, updatedAt: new Date().toISOString() }
          : job
      )
    }))
  },

  updateJobProgress: (id) => {
    const job = get().repairJobs.find(j => j.id === id)
    if (!job) return
    
    const completedTasks = job.tasks.filter(task => task.status === 'completed').length
    const totalTasks = job.tasks.length
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    
    const totalActualHours = job.tasks.reduce((sum, task) => sum + task.actualHours, 0)
    const totalActualCost = job.tasks.reduce((sum, task) => sum + task.actualCost, 0)
    
    set((state) => ({
      repairJobs: state.repairJobs.map(j =>
        j.id === id
          ? {
              ...j,
              completionPercentage,
              totalActualHours,
              totalActualCost,
              updatedAt: new Date().toISOString()
            }
          : j
      )
    }))
  },

  setActiveJob: (job) => {
    set({ activeJob: job })
  },

  getRepairJobById: (id) => {
    return get().repairJobs.find(job => job.id === id)
  },

  // Search and Filter
  searchTasks: (filters) => {
    const startTime = Date.now()
    const { repairTasks } = get()
    
    let filteredTasks = [...repairTasks]
    
    // Apply filters
    if (filters.category && filters.category.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        filters.category!.includes(task.category)
      )
    }
    
    if (filters.priority && filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        filters.priority!.includes(task.priority)
      )
    }
    
    if (filters.status && filters.status.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        filters.status!.includes(task.status)
      )
    }
    
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        task.assignedTo && filters.assignedTo!.includes(task.assignedTo)
      )
    }
    
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filteredTasks = filteredTasks.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }
    
    const result: RepairTaskSearchResult = {
      tasks: filteredTasks,
      totalCount: filteredTasks.length,
      filters,
      executionTime: Date.now() - startTime
    }
    
    set({ searchResults: result })
  },

  clearSearch: () => {
    set({ searchResults: null })
  },

  // Categories and Utilities
  getCategories: () => [
    'engine', 'transmission', 'brakes', 'suspension', 'electrical', 
    'air_conditioning', 'exhaust', 'tires', 'body', 'interior', 
    'maintenance', 'diagnostic', 'other'
  ],

  getPriorities: () => ['low', 'medium', 'high', 'urgent', 'critical'],
  
  getStatuses: () => ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],

  calculateJobTotals: (tasks) => {
    const totalHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0)
    const totalCost = tasks.reduce((sum, task) => sum + task.estimatedCost, 0)
    const completedTasks = tasks.filter(task => task.status === 'completed').length
    const completionPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
    
    return { totalHours, totalCost, completionPercentage }
  },

  getTotalEstimatedHours: () => {
    const { repairTasks } = get()
    return repairTasks.reduce((sum, task) => sum + task.estimatedHours, 0)
  },

  getTotalEstimatedCost: () => {
    const { repairTasks } = get()
    return repairTasks.reduce((sum, task) => sum + task.estimatedCost, 0)
  },

  setCurrentJob: (job) => {
    set({ activeJob: job })
  },

  // Export/Import
  exportJob: (id) => {
    const job = get().getRepairJobById(id)
    if (!job) throw new Error('Job not found')
    
    return JSON.stringify(job, null, 2)
  },

  exportTemplate: (id) => {
    const template = get().getTemplateById(id)
    if (!template) throw new Error('Template not found')
    
    return JSON.stringify(template, null, 2)
  }
}),
    {
      name: 'garage-vehicle-repair-storage',
      partialize: (state) => ({
        // Persist only critical data, not UI state
        repairTasks: state.repairTasks,
        templates: state.templates,
        repairJobs: state.repairJobs,
        // Don't persist temporary UI state
        activeJob: null,
        isLoading: false,
        searchResults: null
      }),
      onRehydrateStorage: () => (state) => {
        // Validate and migrate data when rehydrating
        if (state) {
          const validatedData = validateVehicleRepairData(state)
          Object.assign(state, validatedData)
        }
      },
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Handle migration from version 0 to 1
          const state = persistedState as any
          return {
            ...state,
            ...validateVehicleRepairData(state)
          }
        }
        return persistedState as VehicleRepairStore
      }
    }
  )
)

// Data validation helpers for vehicle repair persistence
const validateVehicleRepairData = (data: any): Partial<VehicleRepairStore> => {
  const validated: Partial<VehicleRepairStore> = {}
  
  if (Array.isArray(data.repairTasks)) {
    validated.repairTasks = data.repairTasks.filter((task: any) => {
      return task && task.id && task.title && task.category
    })
  }
  
  if (Array.isArray(data.templates)) {
    validated.templates = data.templates.filter((template: any) => {
      return template && template.id && template.name && template.category
    })
  }
  
  if (Array.isArray(data.repairJobs)) {
    validated.repairJobs = data.repairJobs.filter((job: any) => {
      return job && job.id && job.title && job.customerId && job.vehicleId
    })
  }
  
  return validated
}