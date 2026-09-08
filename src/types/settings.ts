// Workshop Configuration Types
export interface WorkshopSettings {
  id: string
  name: string
  companyName?: string
  address: string
  phone: string
  email: string
  website?: string
  logo?: string
  logoUrl?: string
  taxId?: string
  ifNumber?: string
  ice?: string
  rib?: string
  patent?: string
  footerAddress?: string
  footerContact?: string
  footerLegal?: string
  businessHours: BusinessHours
  socialMedia?: SocialMediaLinks
  createdAt: string
  updatedAt: string
}

export interface BusinessHours {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export interface DaySchedule {
  isOpen: boolean
  openTime?: string // HH:MM format
  closeTime?: string // HH:MM format
  breakStart?: string // HH:MM format
  breakEnd?: string // HH:MM format
}

export interface SocialMediaLinks {
  facebook?: string
  instagram?: string
  twitter?: string
  linkedin?: string
}

// Tax Configuration
export interface TaxSettings {
  id: string
  name: string
  rate: number // Percentage (e.g., 8.5 for 8.5%)
  isActive: boolean
  appliesTo: TaxApplication[]
  description?: string
  createdAt: string
  updatedAt: string
}

export type TaxApplication = 'labor' | 'parts' | 'services' | 'subtotal' | 'total'

// Job Types Configuration
export interface JobType {
  id: string
  name: string
  description?: string
  category: JobCategory
  estimatedHours: number
  hourlyRate: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type JobCategory = 'maintenance' | 'repair' | 'inspection' | 'customization' | 'emergency'

// Document Templates
export interface DocumentTemplate {
  id: string
  type: DocumentType
  name: string
  header: TemplateSection
  footer: TemplateSection
  body: TemplateSection
  styles: TemplateStyles
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  version?: number
  history?: Array<{
    version: number
    header: TemplateSection
    footer: TemplateSection
    body: TemplateSection
    styles: TemplateStyles
    updatedAt: string
  }>
}

export type DocumentType = 'estimate' | 'invoice' | 'receipt' | 'work-order' | 'delivery-note' | 'order'

export interface TemplateSection {
  content: string // HTML or template string
  enabled: boolean
  height?: number // in pixels or percentage
}

export interface TemplateStyles {
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  fontSize: number
  headerFontSize: number
  lineHeight: number
  margin: number
  padding: number
}

// Settings State
export interface SettingsState {
  workshop: WorkshopSettings | null
  taxes: TaxSettings[]
  jobTypes: JobType[]
  templates: DocumentTemplate[]
  isLoading: boolean
  error: string | null
}

// Template Variables for dynamic content
export interface TemplateVariables {
  workshop: {
    name: string
    address: string
    phone: string
    email: string
    website: string
    logo: string
    taxId: string
  }
  document: {
    number: string
    date: string
    dueDate: string
    status: string
    total: number
    subtotal: number
    tax: number
    discount: number
  }
  customer: {
    name: string
    email: string
    phone: string
    address: string
    vehicle: string
  }
  business: {
    hours: BusinessHours
    socialMedia: SocialMediaLinks
  }
}

// Configuration Form Types
export interface WorkshopFormData {
  name: string
  address: string
  phone: string
  email: string
  website?: string
  logo?: string
  taxId?: string
  ifNumber?: string
  ice?: string
  rib?: string
  patent?: string
  companyName?: string
  logoUrl?: string
  footerAddress?: string
  footerContact?: string
  footerLegal?: string
}

export interface TaxFormData {
  name: string
  rate: number
  appliesTo: TaxApplication[]
  description?: string
}

export interface JobTypeFormData {
  name: string
  description?: string
  category: JobCategory
  estimatedHours: number
  hourlyRate: number
}

export interface TemplateFormData {
  type: DocumentType
  name: string
  header: string
  footer: string
  body: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  fontSize: number
}
