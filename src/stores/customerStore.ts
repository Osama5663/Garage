import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Customer, Vehicle } from '../types/customer'
import { createServerStateStorage } from '../services/api'

interface CustomerStore {
  customers: Customer[]
  searchTerm: string
  selectedCustomer: Customer | null
  isLoading: boolean
  
  // Actions
  setSearchTerm: (term: string) => void
  setSelectedCustomer: (customer: Customer | null) => void
  addCustomer: (customer: Customer) => void
  updateCustomer: (id: string, customer: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  addVehicle: (customerId: string, vehicle: Vehicle) => void
  updateVehicle: (customerId: string, vehicleId: string, vehicle: Partial<Vehicle>) => void
  deleteVehicle: (customerId: string, vehicleId: string) => void
  getFilteredCustomers: () => Customer[]
  getCustomerById: (id: string) => Customer | undefined
}

// Mock data for demonstration
const mockCustomers: Customer[] = [
  {
    id: '1',
    type: 'individual',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701'
    },
    loyaltyCardNumber: 'LOYAL001',
    vehicles: [
      {
        id: 'v1',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        vin: '1HGBH41JXMN109186',
        registration: 'ABC123',
        color: 'Silver',
        mileage: 45000,
        serviceHistory: [
          {
            id: 's1',
            date: '2024-01-15',
            description: 'Oil change and filter replacement',
            mileage: 44500,
            mechanic: 'Mike Johnson',
            cost: 89.99,
            status: 'completed'
          }
        ],
        invoices: [
          {
            id: 'inv1',
            date: '2024-01-15',
            amount: 89.99,
            status: 'paid',
            description: 'Oil change service',
            items: [
              {
                description: 'Oil Change',
                quantity: 1,
                unitPrice: 89.99,
                total: 89.99
              }
            ]
          }
        ]
      }
    ],
    totalSpent: 1250.00,
    registrationDate: '2023-06-15',
    notes: 'Regular customer, prefers morning appointments'
  },
  {
    id: '2',
    type: 'individual',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@email.com',
    phone: '(555) 987-6543',
    address: {
      street: '456 Oak Ave',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62702'
    },
    loyaltyCardNumber: 'LOYAL002',
    vehicles: [
      {
        id: 'v2',
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        vin: '2HGBH41JXMN109187',
        registration: 'XYZ789',
        color: 'Blue',
        mileage: 52000,
        serviceHistory: [],
        invoices: []
      }
    ],
    totalSpent: 850.00,
    registrationDate: '2023-08-20',
    notes: 'New customer, recommended by John Smith'
  }
]

// Storage validation and migration helpers
const validateCustomerData = (data: any): Customer[] => {
  if (!Array.isArray(data)) {
    console.warn('Invalid customer data format, using mock data')
    return mockCustomers
  }
  
  return data.filter(customer => {
    if (!customer || typeof customer !== 'object') return false
    
    const requiredFields = ['id', 'firstName', 'lastName', 'email', 'phone', 'address', 'vehicles']
    const hasRequiredFields = requiredFields.every(field => field in customer)
    
    if (!hasRequiredFields) {
      console.warn('Customer missing required fields, skipping:', customer)
      return false
    }
    
    // Validate nested data
    if (!Array.isArray(customer.vehicles)) {
      customer.vehicles = []
    }
    
    if (typeof customer.totalSpent !== 'number') {
      customer.totalSpent = 0
    }
    
    return true
  })
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customers: mockCustomers,
      searchTerm: '',
      selectedCustomer: null,
      isLoading: false,

      setSearchTerm: (term) => set({ searchTerm: term }),
      
      setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),

      addCustomer: (customer) => set((state) => ({
        customers: [...state.customers, customer]
      })),

      updateCustomer: (id, updatedCustomer) => set((state) => ({
        customers: state.customers.map(customer =>
          customer.id === id ? { ...customer, ...updatedCustomer } : customer
        )
      })),

      deleteCustomer: (id) => set((state) => ({
        customers: state.customers.filter(customer => customer.id !== id)
      })),

      addVehicle: (customerId, vehicle) => set((state) => {
        const newVehicle: Vehicle = {
          ...vehicle,
          id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          serviceHistory: [],
          invoices: []
        }
        
        return {
          customers: state.customers.map(customer =>
            customer.id === customerId
              ? { ...customer, vehicles: [...customer.vehicles, newVehicle] }
              : customer
          )
        }
      }),

      updateVehicle: (customerId, vehicleId, updatedVehicle) => set((state) => ({
        customers: state.customers.map(customer =>
          customer.id === customerId
            ? {
                ...customer,
                vehicles: customer.vehicles.map(vehicle =>
                  vehicle.id === vehicleId ? { ...vehicle, ...updatedVehicle } : vehicle
                )
              }
            : customer
        )
      })),

      deleteVehicle: (customerId, vehicleId) => set((state) => ({
        customers: state.customers.map(customer =>
          customer.id === customerId
            ? {
                ...customer,
                vehicles: customer.vehicles.filter(vehicle => vehicle.id !== vehicleId)
              }
            : customer
        )
      })),

      getFilteredCustomers: () => {
        const { customers, searchTerm } = get()
        if (!searchTerm) return customers
        
        const term = searchTerm.toLowerCase()
        return customers.filter(customer =>
          customer.firstName.toLowerCase().includes(term) ||
          customer.lastName.toLowerCase().includes(term) ||
          customer.email.toLowerCase().includes(term) ||
          customer.phone.includes(term) ||
          customer.loyaltyCardNumber?.toLowerCase().includes(term) ||
          customer.vehicles.some(vehicle =>
            vehicle.make.toLowerCase().includes(term) ||
            vehicle.model.toLowerCase().includes(term) ||
            vehicle.vin.toLowerCase().includes(term) ||
            vehicle.registration.toLowerCase().includes(term)
          )
        )
      },

      getCustomerById: (id) => {
        const { customers } = get()
        return customers.find(customer => customer.id === id)
      }
    }),
    {
      name: 'garage-customers-storage',
      storage: createJSONStorage(() => createServerStateStorage()),
      partialize: (state) => ({
        customers: state.customers,
        // Don't persist temporary UI state
        searchTerm: '',
        selectedCustomer: null,
        isLoading: false
      }),
      onRehydrateStorage: () => (state) => {
        // Validate and migrate data when rehydrating
        if (state?.customers) {
          state.customers = validateCustomerData(state.customers)
        }
      },
      version: 1, // For future migrations
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Handle migration from version 0 to 1
          const state = persistedState as { customers?: any[] }
          return {
            ...state,
            customers: validateCustomerData(state.customers || [])
          }
        }
        return persistedState as CustomerStore
      }
    }
  )
)
