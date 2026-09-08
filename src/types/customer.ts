export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  vin: string
  registration: string
  color?: string
  mileage?: number
  serviceHistory: ServiceRecord[]
  invoices: Invoice[]
}

export interface ServiceRecord {
  id: string
  date: string
  description: string
  mileage: number
  mechanic: string
  cost: number
  status: 'completed' | 'in-progress' | 'scheduled'
}

export interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  description: string
  items: InvoiceItem[]
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Customer {
  id: string
  type: 'individual' | 'company' // New field
  firstName: string // For individual: First Name, For Company: Contact Person First Name
  lastName: string // For individual: Last Name, For Company: Contact Person Last Name
  companyName?: string // Only for company
  ice?: string // Only for company
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  loyaltyCardNumber?: string
  vehicles: Vehicle[]
  totalSpent: number
  registrationDate: string
  notes?: string
}

export interface CustomerFormData {
  type: 'individual' | 'company'
  firstName: string
  lastName: string
  companyName?: string
  ice?: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zipCode: string
  loyaltyCardNumber?: string
  notes?: string
}