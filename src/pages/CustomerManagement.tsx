import { useState } from 'react'
import { useCustomerStore } from '../stores/customerStore'
import { Customer, CustomerFormData } from '../types/customer'
import CustomerList from './CustomerList'
import CustomerDetail from './CustomerDetail'
import CustomerForm from '../components/CustomerForm'

const CustomerManagement = () => {
  const { 
    addCustomer, 
    updateCustomer, 
    setSelectedCustomer, 
    selectedCustomer 
  } = useCustomerStore()
  
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'form'>('list')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCurrentView('detail')
  }

  const handleAddCustomer = () => {
    setEditingCustomer(null)
    setCurrentView('form')
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setCurrentView('form')
  }

  const handleSaveCustomer = (customerData: CustomerFormData) => {
    if (editingCustomer) {
      // Update existing customer
      updateCustomer(editingCustomer.id, {
        ...customerData,
        address: {
          street: customerData.street,
          city: customerData.city,
          state: customerData.state,
          zipCode: customerData.zipCode
        }
      })
    } else {
      // Add new customer
      const newCustomer: Customer = {
        id: `cust_${Date.now()}`,
        type: customerData.type || 'individual',
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        companyName: customerData.companyName,
        ice: customerData.ice,
        email: customerData.email,
        phone: customerData.phone,
        address: {
          street: customerData.street,
          city: customerData.city,
          state: customerData.state,
          zipCode: customerData.zipCode
        },
        loyaltyCardNumber: customerData.loyaltyCardNumber,
        notes: customerData.notes,
        vehicles: [],
        totalSpent: 0,
        registrationDate: new Date().toISOString().split('T')[0]
      }
      addCustomer(newCustomer)
    }
    setCurrentView('list')
    setEditingCustomer(null)
  }

  const handleCancelForm = () => {
    setCurrentView('list')
    setEditingCustomer(null)
  }

  const handleBackFromDetail = () => {
    setCurrentView('list')
    setSelectedCustomer(null)
  }

  // Render different views based on currentView state
  if (currentView === 'detail' && selectedCustomer) {
    return (
      <CustomerDetail
        customer={selectedCustomer}
        onBack={handleBackFromDetail}
        onEdit={handleEditCustomer}
      />
    )
  }

  if (currentView === 'form') {
    return (
      <CustomerForm
        customer={editingCustomer}
        onSave={handleSaveCustomer}
        onCancel={handleCancelForm}
      />
    )
  }

  // Default to list view
  return (
    <CustomerList
      onSelectCustomer={handleSelectCustomer}
      onAddCustomer={handleAddCustomer}
      onEditCustomer={handleEditCustomer}
    />
  )
}

export default CustomerManagement