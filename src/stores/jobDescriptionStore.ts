import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JobDescription, JobDescriptionFormData, JobTaskFormData, JobDescriptionState, HistoryState } from '../types/jobDescription'
import { jobDescriptionApiService } from '../services/jobDescriptionApiService'

interface JobDescriptionStore extends JobDescriptionState, HistoryState {
  isLoading: boolean
  error: string | null
  
  // Actions
  initialize: () => Promise<void>
  addDescription: (formData: JobDescriptionFormData) => Promise<void>
  updateDescription: (id: string, formData: JobDescriptionFormData) => Promise<void>
  deleteDescription: (id: string) => Promise<void>
  addTask: (descriptionId: string, taskData: JobTaskFormData) => Promise<void>
  updateTask: (descriptionId: string, taskId: string, taskData: JobTaskFormData) => Promise<void>
  deleteTask: (descriptionId: string, taskId: string) => Promise<void>
  toggleTaskComplete: (descriptionId: string, taskId: string) => Promise<void>
  setEditingId: (id: string | null) => void
  setIsAddingNew: (isAdding: boolean) => void
  reorderDescriptions: (startIndex: number, endIndex: number) => Promise<void>
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  setDraggedId: (id: string | null) => void
  setDraggedOverId: (id: string | null) => void
  clearDescriptions: () => void
  clearError: () => void
  
  // Pricing actions
  calculatePricingPreview: (estimatedHours: number, priority: string) => { laborCost: number; partsCost: number; totalCost: number; hourlyRate: number }
  
  // Job Order integration
  loadJobDescriptionsForJobOrder: (jobOrderId: string) => Promise<void>
}

const saveToHistory = (current: JobDescription[], past: JobDescription[][]) => {
  return [...past, current].slice(-50) // Keep last 50 states
}

export const useJobDescriptionStore = create<JobDescriptionStore>()(
  persist(
    (set, get) => ({
  descriptions: [],
  editingId: null,
  isAddingNew: false,
  draggedId: null,
  draggedOverId: null,
  past: [],
  present: [],
  future: [],
  isLoading: false,
  error: null,

  // Initialize store by loading from API
  initialize: async () => {
    const { descriptions } = get()
    if (descriptions.length === 0) {
      console.log('JobDescriptionStore: Initializing from API...')
      set({ isLoading: true, error: null })
      
      try {
        const jobDescriptions = await jobDescriptionApiService.getAllJobDescriptions()
        console.log(`JobDescriptionStore: Loaded ${jobDescriptions.length} job descriptions from API`)
        
        set({ 
          descriptions: jobDescriptions,
          present: jobDescriptions,
          past: [],
          future: [],
          isLoading: false
        })
      } catch (error) {
        console.error('JobDescriptionStore: Error initializing from API:', error)
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load job descriptions',
          isLoading: false
        })
        
        // Fallback to demo data if API fails
        console.log('JobDescriptionStore: Falling back to demo data')
        const demoData: JobDescription[] = [
          {
            id: 'demo_1',
            title: 'Engine Oil Change',
            description: 'Replace engine oil and oil filter, check fluid levels',
            tasks: [],
            priority: 'medium',
            estimatedHours: 1.5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            order: 0,
            parts: [],
            labor: []
          }
        ]
        set({ 
          descriptions: demoData,
          present: demoData,
          past: [],
          future: [],
          isLoading: false
        })
      }
    }
  },

  // Add new job description via API
  addDescription: async (formData) => {
    console.log('JobDescriptionStore: Adding new description via API...')
    const { descriptions, past } = get()
    set({ isLoading: true, error: null })
    
    try {
      // Validate data locally first
      const validation = jobDescriptionApiService.validateJobDescriptionData(formData)
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`)
      }
      
      const newDescription = await jobDescriptionApiService.createJobDescription(formData)
      console.log('JobDescriptionStore: Description added successfully via API')
      
      const newDescriptions = [...descriptions, newDescription]
      set({
        descriptions: newDescriptions,
        present: newDescriptions,
        past: saveToHistory(descriptions, past),
        future: [],
        isAddingNew: false,
        isLoading: false
      })
      
      console.log('JobDescriptionStore: State updated with new description')
    } catch (error) {
      console.error('JobDescriptionStore: Error adding description:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add job description',
        isLoading: false
      })
      throw error // Re-throw to allow component to handle
    }
  },

  // Update job description via API
  updateDescription: async (id, formData) => {
    console.log(`JobDescriptionStore: Updating description ${id} via API...`)
    const { descriptions, past } = get()
    set({ isLoading: true, error: null })
    
    try {
      const updatedDescription = await jobDescriptionApiService.updateJobDescription(id, formData)
      console.log(`JobDescriptionStore: Description ${id} updated successfully via API`)
      
      const newDescriptions = descriptions.map(desc =>
        desc.id === id ? updatedDescription : desc
      )
      
      set({
        descriptions: newDescriptions,
        present: newDescriptions,
        past: saveToHistory(descriptions, past),
        future: [],
        editingId: null,
        isLoading: false
      })
      
      console.log('JobDescriptionStore: State updated with updated description')
    } catch (error) {
      console.error(`JobDescriptionStore: Error updating description ${id}:`, error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update job description',
        isLoading: false
      })
      throw error
    }
  },

  // Delete job description via API
  deleteDescription: async (id) => {
    console.log(`JobDescriptionStore: Deleting description ${id} via API...`)
    const { descriptions, past } = get()
    set({ isLoading: true, error: null })
    
    try {
      await jobDescriptionApiService.deleteJobDescription(id)
      console.log(`JobDescriptionStore: Description ${id} deleted successfully via API`)
      
      const newDescriptions = descriptions.filter(desc => desc.id !== id)
      
      set({
        descriptions: newDescriptions,
        present: newDescriptions,
        past: saveToHistory(descriptions, past),
        future: [],
        isLoading: false
      })
      
      console.log('JobDescriptionStore: State updated with deleted description')
    } catch (error) {
      console.error(`JobDescriptionStore: Error deleting description ${id}:`, error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete job description',
        isLoading: false
      })
      throw error
    }
  },

  // Task operations (keep local for now, can be extended to API)
  addTask: async (descriptionId, taskData) => {
    const { descriptions, past } = get()
    const newDescriptions = descriptions.map(desc =>
      desc.id === descriptionId
        ? {
            ...desc,
            tasks: [
              ...desc.tasks,
              {
                id: `task_${Date.now()}`,
                title: taskData.title,
                description: taskData.description,
                estimatedHours: taskData.estimatedHours,
                priority: taskData.priority,
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ],
            updatedAt: new Date().toISOString()
          }
        : desc
    )

    set({
      descriptions: newDescriptions,
      present: newDescriptions,
      past: saveToHistory(descriptions, past),
      future: []
    })
  },

  updateTask: async (descriptionId, taskId, taskData) => {
    const { descriptions, past } = get()
    const newDescriptions = descriptions.map(desc =>
      desc.id === descriptionId
        ? {
            ...desc,
            tasks: desc.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    title: taskData.title,
                    description: taskData.description,
                    estimatedHours: taskData.estimatedHours,
                    priority: taskData.priority,
                    updatedAt: new Date().toISOString()
                  }
                : task
            ),
            updatedAt: new Date().toISOString()
          }
        : desc
    )

    set({
      descriptions: newDescriptions,
      present: newDescriptions,
      past: saveToHistory(descriptions, past),
      future: []
    })
  },

  deleteTask: async (descriptionId, taskId) => {
    const { descriptions, past } = get()
    const newDescriptions = descriptions.map(desc =>
      desc.id === descriptionId
        ? {
            ...desc,
            tasks: desc.tasks.filter(task => task.id !== taskId),
            updatedAt: new Date().toISOString()
          }
        : desc
    )

    set({
      descriptions: newDescriptions,
      present: newDescriptions,
      past: saveToHistory(descriptions, past),
      future: []
    })
  },

  toggleTaskComplete: async (descriptionId, taskId) => {
    const { descriptions, past } = get()
    const newDescriptions = descriptions.map(desc =>
      desc.id === descriptionId
        ? {
            ...desc,
            tasks: desc.tasks.map(task =>
              task.id === taskId
                ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() }
                : task
            ),
            updatedAt: new Date().toISOString()
          }
        : desc
    )

    set({
      descriptions: newDescriptions,
      present: newDescriptions,
      past: saveToHistory(descriptions, past),
      future: []
    })
  },

  setEditingId: (id) => set({ editingId: id }),
  setIsAddingNew: (isAdding) => set({ isAddingNew: isAdding }),

  reorderDescriptions: async (startIndex, endIndex) => {
    const { descriptions, past } = get()
    const newDescriptions = [...descriptions]
    const [removed] = newDescriptions.splice(startIndex, 1)
    newDescriptions.splice(endIndex, 0, removed)

    const reorderedDescriptions = newDescriptions.map((desc, index) => ({
      ...desc,
      order: index
    }))

    set({
      descriptions: reorderedDescriptions,
      present: reorderedDescriptions,
      past: saveToHistory(descriptions, past),
      future: []
    })
  },

  undo: () => {
    const { past, present, future } = get()
    if (past.length === 0) return

    const previous = past[past.length - 1]
    const newPast = past.slice(0, -1)

    set({
      descriptions: previous,
      present: previous,
      past: newPast,
      future: [present, ...future]
    })
  },

  redo: () => {
    const { past, present, future } = get()
    if (future.length === 0) return

    const next = future[0]
    const newFuture = future.slice(1)

    set({
      descriptions: next,
      present: next,
      past: [...past, present],
      future: newFuture
    })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  setDraggedId: (id) => set({ draggedId: id }),
  setDraggedOverId: (id) => set({ draggedOverId: id }),

  clearDescriptions: () => {
    const { descriptions, past } = get()
    set({
      descriptions: [],
      present: [],
      past: saveToHistory(descriptions, past),
      future: [],
      editingId: null,
      isAddingNew: false
    })
  },

  clearError: () => set({ error: null }),

  // Pricing preview calculation
  calculatePricingPreview: (estimatedHours, priority) => {
    return jobDescriptionApiService.calculatePricingPreview(estimatedHours, priority)
  },

  // Load job descriptions for specific job order
  loadJobDescriptionsForJobOrder: async (jobOrderId) => {
    console.log(`JobDescriptionStore: Loading job descriptions for job order ${jobOrderId}...`)
    set({ isLoading: true, error: null })
    
    try {
      const jobDescriptions = await jobDescriptionApiService.getJobDescriptionsByJobOrderId(jobOrderId)
      console.log(`Found ${jobDescriptions.length} job descriptions for job order ${jobOrderId}`)
      
      set({ 
        descriptions: jobDescriptions,
        present: jobDescriptions,
        past: [],
        future: [],
        isLoading: false
      })
    } catch (error) {
      console.error(`Error loading job descriptions for job order ${jobOrderId}:`, error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load job descriptions for job order',
        isLoading: false
      })
    }
  }
}),
    {
      name: 'garage-job-descriptions-storage',
      partialize: (state) => ({
        // Persist only critical data, not UI state
        descriptions: state.descriptions,
        // Don't persist temporary UI state
        editingId: null,
        isAddingNew: false,
        draggedId: null,
        draggedOverId: null,
        isLoading: false,
        error: null
      }),
      onRehydrateStorage: () => (state) => {
        // Validate and migrate data when rehydrating
        if (state?.descriptions) {
          state.descriptions = validateJobDescriptionData(state.descriptions)
        }
      },
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Handle migration from version 0 to 1
          const state = persistedState as { descriptions?: any[] }
          return {
            ...state,
            descriptions: validateJobDescriptionData(state.descriptions || [])
          }
        }
        return persistedState as JobDescriptionState
      }
    }
  )
)

// Data validation helpers for job description persistence
const validateJobDescriptionData = (descriptions: any[]): JobDescription[] => {
  if (!Array.isArray(descriptions)) return []
  
  return descriptions.filter((desc: any) => {
    return desc && desc.id && desc.title && Array.isArray(desc.tasks)
  })
}