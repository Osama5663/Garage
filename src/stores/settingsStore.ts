import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createServerStateStorage } from '../services/api'
import {
  SettingsState,
  WorkshopSettings,
  TaxSettings,
  JobType,
  DocumentTemplate,
  WorkshopFormData,
  TaxFormData,
  JobTypeFormData,
  TemplateFormData
} from '../types/settings'

interface SettingsStore extends SettingsState {
  // Workshop settings
  updateWorkshop: (data: WorkshopFormData) => Promise<boolean>
  getWorkshop: () => WorkshopSettings | null
  
  // Tax settings
  addTax: (tax: TaxFormData) => Promise<TaxSettings | null>
  updateTax: (id: string, tax: Partial<TaxSettings>) => Promise<boolean>
  deleteTax: (id: string) => Promise<boolean>
  getActiveTaxes: () => TaxSettings[]
  
  // Job types
  addJobType: (jobType: JobTypeFormData) => Promise<JobType | null>
  updateJobType: (id: string, jobType: Partial<JobType>) => Promise<boolean>
  deleteJobType: (id: string) => Promise<boolean>
  getActiveJobTypes: () => JobType[]
  getJobTypesByCategory: (category: string) => JobType[]
  
  // Document templates
  addTemplate: (template: TemplateFormData) => Promise<DocumentTemplate | null>
  updateTemplate: (id: string, template: Partial<DocumentTemplate>) => Promise<boolean>
  deleteTemplate: (id: string) => Promise<boolean>
  getTemplateByType: (type: string) => DocumentTemplate[]
  getDefaultTemplate: (type: string) => DocumentTemplate | null
  
  // Utility functions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  backupTemplates: () => void
  applyFooterToAllTemplates: (footerHtml: string) => Promise<number>
}

// Mock default workshop settings
const DEFAULT_WORKSHOP: WorkshopSettings = {
  id: '1',
  name: 'GaragePro Auto Services',
  companyName: 'GaragePro Auto Services',
  address: '123 Main Street, Auto City, AC 12345',
  phone: '(555) 123-4567',
  email: 'info@garagepro.com',
  website: 'https://garagepro.com',
  taxId: '12-3456789',
  ifNumber: '',
  ice: '',
  rib: '',
  patent: '',
  logoUrl: '',
  footerAddress: '123 Main Street, Auto City, AC 12345',
  footerContact: 'Phone: (555) 123-4567\nEmail: info@garagepro.com\nWebsite: https://garagepro.com',
  footerLegal: 'ICE: \nRC: \nTVA: \nRIB: ',
  businessHours: {
    monday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    friday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '15:00' },
    sunday: { isOpen: false }
  },
  socialMedia: {
    facebook: 'https://facebook.com/garagepro',
    instagram: 'https://instagram.com/garagepro',
    twitter: 'https://twitter.com/garagepro'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

// Mock default tax rates
const DEFAULT_TAXES: TaxSettings[] = [
  {
    id: '1',
    name: 'Sales Tax',
    rate: 8.5,
    isActive: true,
    appliesTo: ['parts', 'services'],
    description: 'State and local sales tax',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Environmental Fee',
    rate: 2.0,
    isActive: true,
    appliesTo: ['labor'],
    description: 'Environmental disposal fee',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Mock default job types
const DEFAULT_JOB_TYPES: JobType[] = [
  {
    id: '1',
    name: 'Oil Change',
    description: 'Standard oil and filter change',
    category: 'maintenance',
    estimatedHours: 0.5,
    hourlyRate: 75,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Brake Inspection',
    description: 'Complete brake system inspection',
    category: 'inspection',
    estimatedHours: 1.0,
    hourlyRate: 85,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Engine Diagnostic',
    description: 'Computer diagnostic scan and analysis',
    category: 'repair',
    estimatedHours: 1.5,
    hourlyRate: 95,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Tire Rotation',
    description: 'Rotate all four tires',
    category: 'maintenance',
    estimatedHours: 0.5,
    hourlyRate: 65,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Default document templates disabled; start empty and allow user-added templates only
const DEFAULT_TEMPLATES: DocumentTemplate[] = []

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      workshop: DEFAULT_WORKSHOP,
      taxes: DEFAULT_TAXES,
      jobTypes: DEFAULT_JOB_TYPES,
      templates: DEFAULT_TEMPLATES,
      isLoading: false,
      error: null,

      // Workshop settings
      updateWorkshop: async (data: WorkshopFormData) => {
        set({ isLoading: true, error: null })
        
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const currentWorkshop = get().workshop
          const updatedWorkshop: WorkshopSettings = {
            ...currentWorkshop!,
            ...data,
            updatedAt: new Date().toISOString()
          }
          
          set({ workshop: updatedWorkshop, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Failed to update workshop settings', isLoading: false })
          return false
        }
      },

      getWorkshop: () => get().workshop,

      // Tax settings
      addTax: async (tax: TaxFormData) => {
        set({ isLoading: true, error: null })
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300))
          
          const newTax: TaxSettings = {
            ...tax,
            id: Date.now().toString(),
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          const updatedTaxes = [...get().taxes, newTax]
          set({ taxes: updatedTaxes, isLoading: false })
          
          return newTax
        } catch (error) {
          set({ error: 'Failed to add tax', isLoading: false })
          return null
        }
      },

      updateTax: async (id: string, tax: Partial<TaxSettings>) => {
        set({ isLoading: true, error: null })
        
        try {
          const updatedTaxes = get().taxes.map(t => 
            t.id === id ? { ...t, ...tax, updatedAt: new Date().toISOString() } : t
          )
          
          set({ taxes: updatedTaxes, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Failed to update tax', isLoading: false })
          return false
        }
      },

      deleteTax: async (id: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const updatedTaxes = get().taxes.filter(t => t.id !== id)
          set({ taxes: updatedTaxes, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Failed to delete tax', isLoading: false })
          return false
        }
      },

      getActiveTaxes: () => get().taxes.filter(tax => tax.isActive),

      // Job types
      addJobType: async (jobType: JobTypeFormData) => {
        set({ isLoading: true, error: null })
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300))
          
          const newJobType: JobType = {
            ...jobType,
            id: Date.now().toString(),
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          const updatedJobTypes = [...get().jobTypes, newJobType]
          set({ jobTypes: updatedJobTypes, isLoading: false })
          
          return newJobType
        } catch (error) {
          set({ error: 'Failed to add job type', isLoading: false })
          return null
        }
      },

      updateJobType: async (id: string, jobType: Partial<JobType>) => {
        set({ isLoading: true, error: null })
        
        try {
          const updatedJobTypes = get().jobTypes.map(jt => 
            jt.id === id ? { ...jt, ...jobType, updatedAt: new Date().toISOString() } : jt
          )
          
          set({ jobTypes: updatedJobTypes, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Failed to update job type', isLoading: false })
          return false
        }
      },

      deleteJobType: async (id: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const updatedJobTypes = get().jobTypes.filter(jt => jt.id !== id)
          set({ jobTypes: updatedJobTypes, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Failed to delete job type', isLoading: false })
          return false
        }
      },

      getActiveJobTypes: () => get().jobTypes.filter(jt => jt.isActive),

      getJobTypesByCategory: (category: string) => 
        get().jobTypes.filter(jt => jt.category === category && jt.isActive),

      // Document templates
      addTemplate: async (template: TemplateFormData) => {
        set({ isLoading: true, error: null })
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300))
          
          const newTemplate: DocumentTemplate = {
            ...template,
            id: Date.now().toString(),
            header: {
              content: template.header,
              enabled: true,
              height: 150
            },
            footer: {
              content: template.footer,
              enabled: true,
              height: 100
            },
            body: {
              content: template.body,
              enabled: true
            },
            styles: {
              primaryColor: template.primaryColor,
              secondaryColor: template.secondaryColor,
              fontFamily: template.fontFamily,
              fontSize: template.fontSize,
              headerFontSize: template.fontSize + 4,
              lineHeight: 1.5,
              margin: 20,
              padding: 15
            },
            isDefault: false,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          const updatedTemplates = [...get().templates, newTemplate]
          set({ templates: updatedTemplates, isLoading: false })
          
          return newTemplate
        } catch (error) {
          set({ error: 'Failed to add template', isLoading: false })
          return null
        }
      },

      updateTemplate: async (id: string, template: Partial<DocumentTemplate>) => {
        set({ isLoading: true, error: null })
        
        try {
          const updatedTemplates = get().templates.map(t => {
            if (t.id !== id) return t
            const now = new Date().toISOString()
            const nextVersion = (t.version || 1) + 1
            const snapshot = { version: t.version || 1, header: t.header, footer: t.footer, body: t.body, styles: t.styles, updatedAt: t.updatedAt }
            const history = Array.isArray(t.history) ? [...t.history, snapshot] : [snapshot]
            return { ...t, ...template, history, version: nextVersion, updatedAt: now }
          })
          
          set({ templates: updatedTemplates, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Failed to update template', isLoading: false })
          return false
        }
      },

      deleteTemplate: async (id: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const updatedTemplates = get().templates.filter(t => t.id !== id)
          set({ templates: updatedTemplates, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Failed to delete template', isLoading: false })
          return false
        }
      },

      getTemplateByType: (type: string) => 
        get().templates.filter(t => t.type === type && t.isActive),

      getDefaultTemplate: (type: string) => 
        get().templates.find(t => t.type === type && t.isDefault && t.isActive) || 
        get().templates.find(t => t.type === type && t.isActive) || null,

      // Utility functions
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null })
      ,
      backupTemplates: () => {
        const current = get().templates
        const backup = JSON.parse(JSON.stringify(current))
        // store backup in localStorage for safety without polluting state shape
        try { localStorage.setItem('templates-backup', JSON.stringify({ at: new Date().toISOString(), templates: backup })) } catch {}
      },
      applyFooterToAllTemplates: async (footerHtml: string) => {
        const templates = get().templates
        let updated = 0
        for (const t of templates) {
          const ok = await get().updateTemplate(t.id, { footer: { ...t.footer, content: footerHtml } })
          if (ok) updated++
        }
        return updated
      }
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => createServerStateStorage()),
      partialize: (state) => ({
        workshop: state.workshop,
        taxes: state.taxes,
        jobTypes: state.jobTypes,
        templates: state.templates
      })
    }
  )
)

// Helper hooks
export const useWorkshopSettings = () => useSettingsStore(state => state.workshop)
export const useTaxSettings = () => useSettingsStore(state => state.taxes)
export const useJobTypes = () => useSettingsStore(state => state.jobTypes)
export const useDocumentTemplates = () => useSettingsStore(state => state.templates)
export const useSettingsLoading = () => useSettingsStore(state => state.isLoading)
export const useSettingsError = () => useSettingsStore(state => state.error)
export const selectSettingsStore = (selector: (state: SettingsStore) => any) => useSettingsStore(selector)
