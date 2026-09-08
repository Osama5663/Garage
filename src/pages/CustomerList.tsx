import { useState } from 'react'
import { useCustomerStore } from '../stores/customerStore'
import { Search, Plus, Edit, Trash2, Car, User, Building } from 'lucide-react'
import { Customer } from '../types/customer'
import { t } from '../i18n'
import { useLangStore } from '../stores/langStore'

interface CustomerListProps {
  onSelectCustomer: (customer: Customer) => void
  onAddCustomer: () => void
  onEditCustomer: (customer: Customer) => void
}

const CustomerList = ({ onSelectCustomer, onAddCustomer, onEditCustomer }: CustomerListProps) => {
  const { searchTerm, setSearchTerm, getFilteredCustomers, deleteCustomer } = useCustomerStore()
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  useLangStore(state => state.language)
  
  const filteredCustomers = getFilteredCustomers()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchTerm(localSearchTerm)
  }

  const handleDelete = (customerId: string) => {
    if (window.confirm(t('customerManagement.list.confirmDelete'))) {
      deleteCustomer(customerId)
    }
  }

  const getInitials = (firstName: string, lastName: string, companyName?: string) => {
    if (companyName) {
        return companyName.substring(0, 2).toUpperCase()
    }
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('customerManagement.list.header')}
            </h1>
            <p className="text-gray-600">
              {t('customerManagement.list.subtitle')}
            </p>
          </div>
          <button
            onClick={onAddCustomer}
            className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{t('customerManagement.list.addCustomer')}</span>
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder={t('customerManagement.list.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              {t('customerManagement.list.searchButton')}
            </button>
          </div>
        </form>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <User className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    {t('customerManagement.list.stats.totalCustomers')}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">{filteredCustomers.length}</p>
                </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Car className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    {t('customerManagement.list.stats.totalVehicles')}
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {filteredCustomers.reduce((sum, customer) => sum + customer.vehicles.length, 0)}
                  </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">L</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    {t('customerManagement.list.stats.loyaltyMembers')}
                  </p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredCustomers.filter(c => c.loyaltyCardNumber).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">
              {t('customerManagement.list.empty.title')}
            </p>
            <p className="text-sm">
              {t('customerManagement.list.empty.description')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {getInitials(customer.firstName, customer.lastName, customer.companyName)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {customer.type === 'company' && <Building className="w-4 h-4 text-gray-500" />}
                        {customer.type === 'company' ? customer.companyName : `${customer.firstName} ${customer.lastName}`}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-1">
                        {customer.type === 'company' && (
                            <span className="text-gray-500 italic">
                              {t('customerManagement.shared.contactPrefix')} {customer.firstName} {customer.lastName}
                            </span>
                        )}
                        <span>{customer.email}</span>
                        <span>{customer.phone}</span>
                        {customer.ice && (
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                              {t('customerManagement.shared.icePrefix')} {customer.ice}
                            </span>
                        )}
                        {customer.loyaltyCardNumber && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                            {t('customerManagement.shared.loyaltyPrefix')} {customer.loyaltyCardNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Car className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {customer.vehicles.length}{' '}
                          {customer.vehicles.length === 1
                            ? t('customerManagement.shared.vehicleSingular')
                            : t('customerManagement.shared.vehiclePlural')}
                        </span>
                        {customer.vehicles.length > 0 && (
                          <span className="text-sm text-gray-500">
                            • {customer.vehicles.map(v => `${v.make} ${v.model}`).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectCustomer(customer)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      {t('customerManagement.list.buttons.viewDetails')}
                    </button>
                    <button
                      onClick={() => onEditCustomer(customer)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded transition-colors"
                      title={t('customerManagement.list.buttons.editCustomer')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded transition-colors"
                      title={t('customerManagement.list.buttons.deleteCustomer')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomerList
