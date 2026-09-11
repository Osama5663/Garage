import { JobDescription } from './jobDescription'

export interface JobOrder {
  id: string
  jobNumber: string
  customerId: string
  vehicleId: string
  customerName: string
  vehicleInfo: {
    make: string
    model: string
    year: number
    vin: string
    registration: string
  }
  
  // Job Details
  description: string // Legacy field for backward compatibility
  jobDescriptions: JobDescription[] // New structured job descriptions
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in-progress' | 'waiting-parts' | 'completed' | 'approved' | 'cancelled' | 'transferred'
  
  // Assignment & Scheduling
  assignedMechanic: string
  estimatedHours: number
  actualHours: number
  startDate: string
  deadline: string
  completionDate?: string
  
  // Parts & Labor
  partsUsed: JobPart[]
  laborItems: LaborItem[]
  
  // Diagnostics & Media
  diagnosticFiles: DiagnosticFile[]
  attachedImages: JobImage[]
  
  // Cost & Billing
  estimatedCost: number
  finalCost: number
  invoiceId?: string
  
  // Linked Estimates (Devis)
  linkedEstimateIds?: string[]
  estimateAttachments?: DiagnosticFile[]
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  notes: string
  inspection?: VehicleInspection
  checkInSheet?: VehicleCheckSheet
  checkOutSheet?: VehicleCheckSheet
  
  // Approval Workflow
  approvedAt?: string
  approvedBy?: string
  approvalNotes?: string
  isApproved: boolean
}

export type InspectionStatus = 'ok' | 'monitor' | 'action'

export type VehicleCheckSheetType = 'in' | 'out'

export interface VehicleCheckSheetItem {
  id: string
  label: string
  checked: boolean
  note?: string
  evidenceImages?: JobImage[]
}

export interface VehicleCheckSheetSection {
  id: string
  label: string
  items: VehicleCheckSheetItem[]
}

export interface VehicleCheckSheet {
  id: string
  jobOrderId: string
  vehicleId: string
  type: VehicleCheckSheetType
  date: string
  make: string
  model: string
  fuel?: string
  firstRegistrationDate?: string
  registration: string
  vin: string
  mileage?: number
  sections: VehicleCheckSheetSection[]
  globalNote?: string
}

export interface InspectionItem {
  id: string
  label: string
  status: InspectionStatus | null
  comment?: string
  evidenceImages?: JobImage[]
}

export interface InspectionSection {
  id: string
  label: string
  items: InspectionItem[]
  generalComment?: string
}

export interface VehicleInspection {
  id: string
  jobOrderId: string
  vehicleId: string
  date: string
  mileage?: number
  inspectorName?: string
  sections: InspectionSection[]
  globalRemarks?: string
}

export interface JobPart {
  id: string
  category?: string
  discountRate?: number
  partNumber: string
  name: string
  description: string
  quantity: number
  unitCost: number
  totalCost: number
  supplier?: string
  status: 'ordered' | 'received' | 'installed' | 'returned'
  orderedDate?: string
  receivedDate?: string
}

export interface LaborItem {
  id: string
  category?: string
  discountRate?: number
  description: string
  notes?: string
  hours: number
  rate: number
  total: number
  mechanic: string
  date: string
}

export interface DiagnosticFile {
  id: string
  originalName: string
  storedName: string
  mimeType: string
  size: number
  uploadedAt: string
  uploadedBy?: string
  title?: string
}

export interface JobImage {
  id: string
  url: string
  filename: string
  description: string
  uploadDate: string
  category: 'before' | 'after' | 'during' | 'diagnostic' | 'other'
}

export interface JobOrderFormData {
  customerId: string
  vehicleId: string
  description: string // Legacy field for backward compatibility
  jobDescriptions: JobDescription[] // New structured job descriptions
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignedMechanic: string
  estimatedHours: number
  deadline: string
  estimatedCost: number
  notes: string
  laborItems: LaborItem[]
  parts: JobPart[]
}

export interface Mechanic {
  id: string
  name: string
  email: string
  phone: string
  specialization: string[]
  availability: 'available' | 'busy' | 'unavailable'
  currentJobs: number
  hourlyRate: number
}

export interface JobStatusHistory {
  id: string
  jobId: string
  status: string
  changedBy: string
  changedAt: string
  notes: string
}
