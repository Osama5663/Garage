// Vehicle Repair Task Categories and Specifications

export type RepairCategory = 
  | 'engine'
  | 'transmission' 
  | 'brakes'
  | 'suspension'
  | 'electrical'
  | 'air_conditioning'
  | 'exhaust'
  | 'tires'
  | 'body'
  | 'interior'
  | 'maintenance'
  | 'diagnostic'
  | 'other'

export type RepairPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'

export interface RepairSpecification {
  id: string
  partNumber?: string
  partName?: string
  quantity: number
  unitCost: number
  totalCost: number
  laborHours: number
  notes?: string
  required: boolean
  supplier?: string
  warranty?: string
}

export interface RepairTask {
  id: string
  title: string
  description: string
  category: RepairCategory
  subcategory?: string
  priority: RepairPriority
  status: TaskStatus
  estimatedHours: number
  actualHours: number
  estimatedCost: number
  actualCost: number
  specifications: RepairSpecification[]
  completionNotes?: string
  completionDate?: string
  completedBy?: string
  photos: string[]
  diagnosticCodes: string[]
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  assignedTo?: string
  dependencies: string[] // IDs of tasks that must be completed first
  tags: string[]
}

export interface VehicleRepairTemplate {
  id: string
  name: string
  description: string
  category: RepairCategory
  tasks: Omit<RepairTask, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'actualHours' | 'actualCost'>[]
  totalEstimatedHours: number
  totalEstimatedCost: number
  commonVehicles: string[] // Vehicle makes/models this template applies to
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  isActive: boolean
  usageCount: number
}

export interface VehicleRepairJob {
  id: string
  jobId: string // Reference to main job order
  customerId: string
  vehicleId: string
  templateId?: string // If created from template
  title: string
  description: string
  category: RepairCategory
  priority: RepairPriority
  status: TaskStatus
  tasks: RepairTask[]
  totalEstimatedHours: number
  totalActualHours: number
  totalEstimatedCost: number
  totalActualCost: number
  completionPercentage: number
  startDate?: string
  completionDate?: string
  assignedMechanic?: string
  notes: string
  photos: string[]
  documents: string[]
  customerApproval: {
    approved: boolean
    approvedAt?: string
    approvedBy?: string
    notes?: string
  }
  warrantyInfo?: {
    duration: string
    coverage: string
    terms: string
  }
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface RepairTaskFormData {
  title: string
  description: string
  category: RepairCategory
  subcategory?: string
  priority: RepairPriority
  estimatedHours: number
  estimatedCost: number
  specifications: Omit<RepairSpecification, 'id' | 'totalCost'>[]
  dependencies: string[]
  tags: string[]
  photos?: string[]
  diagnosticCodes?: string[]
}

export interface VehicleRepairTemplateFormData {
  name: string
  description: string
  category: RepairCategory
  tasks: RepairTaskFormData[]
  commonVehicles: string[]
  tags: string[]
}

export interface VehicleRepairJobFormData {
  title: string
  description: string
  category: RepairCategory
  priority: RepairPriority
  tasks: RepairTaskFormData[]
  templateId?: string
  notes: string
  assignedMechanic?: string
  startDate?: string
  completionDate?: string
}

// Search and filter interfaces
export interface RepairTaskFilter {
  category?: RepairCategory[]
  priority?: RepairPriority[]
  status?: TaskStatus[]
  assignedTo?: string[]
  dateRange?: {
    start: string
    end: string
  }
  costRange?: {
    min: number
    max: number
  }
  tags?: string[]
  searchTerm?: string
}

export interface RepairTaskSearchResult {
  tasks: RepairTask[]
  totalCount: number
  filters: RepairTaskFilter
  executionTime: number
}