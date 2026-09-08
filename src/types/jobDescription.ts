export interface JobTask {
  id: string
  title: string
  description: string
  estimatedHours: number
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
}

export interface JobDescription {
  id: string
  title: string
  description: string
  tasks: JobTask[]
  parts: PartItem[]
  labor: LaborItem[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedHours: number
  createdAt: string
  updatedAt: string
  order: number
}

export interface JobDescriptionFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedHours: number
  parts: PartItemFormData[]
  labor: LaborItemFormData[]
}

export interface JobTaskFormData {
  title: string
  description: string
  estimatedHours: number
  priority: 'low' | 'medium' | 'high'
}

export interface PartItem {
  id: string
  name: string
  quantity: number
  unitCost: number
  totalCost: number
}

export interface PartItemFormData {
  name: string
  quantity: number
  unitCost: number
}

export interface LaborItem {
  id: string
  description: string
  hours: number
  hourlyRate: number
  totalCost: number
}

export interface LaborItemFormData {
  description: string
  hours: number
  hourlyRate: number
}

export interface JobDescriptionState {
  descriptions: JobDescription[]
  editingId: string | null
  isAddingNew: boolean
  draggedId: string | null
  draggedOverId: string | null
}

export interface JobDescriptionWithPricing extends JobDescription {
  calculatedLaborCost: number
  calculatedPartsCost: number
  calculatedTotalCost: number
  pricingBreakdown: {
    labor: {
      hours: number
      rate: number
      cost: number
    }
    parts: Array<{
      id: string
      name: string
      quantity: number
      unitCost: number
      totalCost: number
    }>
    totalPartsCost: number
    totalCost: number
  }
}

export interface HistoryState {
  past: JobDescription[][]
  present: JobDescription[]
  future: JobDescription[][]
}