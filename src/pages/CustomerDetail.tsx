import { useCustomerStore } from '../stores/customerStore'
import { Customer, Vehicle } from '../types/customer'
import { formatCurrency, formatDate } from '../utils/formatters'
import VehicleManagement from '../components/VehicleManagement'
import { 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Car,
  Edit,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Building,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import { t } from '../i18n'
import { useLangStore } from '../stores/langStore'

interface CustomerDetailProps {
  customer: Customer
  onBack: () => void
  onEdit: (customer: Customer) => void
}

const CustomerDetail = ({ customer: initialCustomer, onBack, onEdit }: CustomerDetailProps) => {
  const { 
    addVehicle, 
    updateVehicle, 
    deleteVehicle,
    selectedCustomer,
    getCustomerById
  } = useCustomerStore()
  useLangStore(state => state.language)

  // Use selectedCustomer from store if available, otherwise use the prop
  const customer = selectedCustomer || initialCustomer

  // Refresh customer data from store to ensure real-time updates
  const refreshCustomerData = () => {
    const updatedCustomer = getCustomerById(customer.id)
    return updatedCustomer || customer
  }

  // Get the most current customer data
  const currentCustomer = refreshCustomerData()

  const handleAddVehicle = (vehicleData: Omit<Vehicle, 'id' | 'serviceHistory' | 'invoices'>) => {
    try {
      // Check for duplicate vehicles (same VIN or registration)
      const isDuplicate = currentCustomer.vehicles.some(vehicle => 
        vehicle.vin.toLowerCase() === vehicleData.vin.toLowerCase() ||
        vehicle.registration.toLowerCase() === vehicleData.registration.toLowerCase()
      )

      if (isDuplicate) {
        toast.error(t('customerManagement.detail.toasts.vehicleExistsTitle'), {
          description: t('customerManagement.detail.toasts.vehicleExistsDescription'),
          icon: <AlertCircle className="w-5 h-5 text-red-500" />
        })
        return false
      }

      const newVehicle = {
        ...vehicleData,
        id: `v_${Date.now()}`,
        serviceHistory: [],
        invoices: []
      }
      
      addVehicle(currentCustomer.id, newVehicle)
      
      toast.success(t('customerManagement.detail.toasts.vehicleAddSuccessTitle'), {
        description: `${vehicleData.make} ${vehicleData.model} (${vehicleData.year}) ${t('customerManagement.detail.toasts.vehicleAddSuccessSuffix')}`,
        icon: <CheckCircle className="w-5 h-5 text-green-500" />
      })
      
      return true
    } catch (error) {
      console.error('Error adding vehicle:', error)
      toast.error(t('customerManagement.detail.toasts.vehicleAddErrorTitle'), {
        description: t('customerManagement.detail.toasts.vehicleAddErrorDescription'),
        icon: <AlertCircle className="w-5 h-5 text-red-500" />
      })
      return false
    }
  }

  const handleUpdateVehicle = (vehicleId: string, vehicleData: Partial<Vehicle>) => {
    try {
      updateVehicle(currentCustomer.id, vehicleId, vehicleData)
      toast.success(t('customerManagement.detail.toasts.vehicleUpdateSuccessTitle'), {
        description: t('customerManagement.detail.toasts.vehicleUpdateSuccessDescription'),
        icon: <CheckCircle className="w-5 h-5 text-green-500" />
      })
    } catch (error) {
      console.error('Error updating vehicle:', error)
      toast.error(t('customerManagement.detail.toasts.vehicleUpdateErrorTitle'), {
        description: t('customerManagement.detail.toasts.vehicleUpdateErrorDescription'),
        icon: <AlertCircle className="w-5 h-5 text-red-500" />
      })
    }
  }

  const handleDeleteVehicle = (vehicleId: string) => {
    try {
      const vehicle = currentCustomer.vehicles.find(v => v.id === vehicleId)
      if (vehicle && window.confirm(`${t('customerManagement.detail.toasts.vehicleDeleteConfirmPrefix')} ${vehicle.make} ${vehicle.model}${t('customerManagement.detail.toasts.vehicleDeleteConfirmSuffix')}`)) {
        deleteVehicle(currentCustomer.id, vehicleId)
        toast.success(t('customerManagement.detail.toasts.vehicleDeleteSuccessTitle'), {
          description: `${vehicle.make} ${vehicle.model} ${t('customerManagement.detail.toasts.vehicleDeleteSuccessSuffix')}`,
          icon: <CheckCircle className="w-5 h-5 text-green-500" />
        })
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      toast.error(t('customerManagement.detail.toasts.vehicleDeleteErrorTitle'), {
        description: t('customerManagement.detail.toasts.vehicleDeleteErrorDescription'),
        icon: <AlertCircle className="w-5 h-5 text-red-500" />
      })
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
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('customerManagement.detail.backToList')}</span>
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-2xl font-bold">
                  {getInitials(currentCustomer.firstName, currentCustomer.lastName, currentCustomer.companyName)}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  {currentCustomer.type === 'company' && <Building className="w-6 h-6 text-gray-500" />}
                  {currentCustomer.type === 'company' ? currentCustomer.companyName : `${currentCustomer.firstName} ${currentCustomer.lastName}`}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-gray-600 mt-2">
                  <span className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {currentCustomer.email}
                  </span>
                  <span className="flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {currentCustomer.phone}
                  </span>
                  {currentCustomer.type === 'company' && currentCustomer.ice && (
                      <span className="flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                          <Building className="w-4 h-4 mr-1" />
                          {t('customerManagement.shared.icePrefix')} {currentCustomer.ice}
                      </span>
                  )}
                  {currentCustomer.loyaltyCardNumber && (
                    <span className="flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                      <CreditCard className="w-4 h-4 mr-1" />
                      {t('customerManagement.shared.loyaltyPrefix')} {currentCustomer.loyaltyCardNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onEdit(currentCustomer)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>{t('customerManagement.detail.editCustomer')}</span>
              </button>
            </div>
          </div>

          {/* Customer Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{currentCustomer.vehicles.length}</div>
              <div className="text-sm text-gray-600">
                {t('customerManagement.detail.stats.vehicles')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentCustomer.vehicles.reduce((sum, v) => sum + v.serviceHistory.length, 0)}
              </div>
              <div className="text-sm text-gray-600">
                {t('customerManagement.detail.stats.serviceRecords')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentCustomer.vehicles.reduce((sum, v) => sum + v.invoices.length, 0)}
              </div>
              <div className="text-sm text-gray-600">
                {t('customerManagement.detail.stats.invoices')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(currentCustomer.totalSpent)}
              </div>
              <div className="text-sm text-gray-600">
                {t('customerManagement.detail.stats.totalSpent')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            {t('customerManagement.detail.contact.title')}
          </h2>
          <div className="space-y-3">
            {currentCustomer.type === 'company' && (
                <div className="flex items-center">
                    <User className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                        <p className="font-medium text-gray-900">
                          {t('customerManagement.detail.contact.contactPerson')}
                        </p>
                        <p className="text-gray-600">{currentCustomer.firstName} {currentCustomer.lastName}</p>
                    </div>
                </div>
            )}
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">
                  {t('customerManagement.detail.contact.email')}
                </p>
                <p className="text-gray-600">{currentCustomer.email}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">
                  {t('customerManagement.detail.contact.phone')}
                </p>
                <p className="text-gray-600">{currentCustomer.phone}</p>
              </div>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
              <div>
                <p className="font-medium text-gray-900">
                  {t('customerManagement.detail.contact.address')}
                </p>
                <p className="text-gray-600">
                  {currentCustomer.address.street}<br />
                  {currentCustomer.address.city}, {currentCustomer.address.state} {currentCustomer.address.zipCode}
                </p>
              </div>
            </div>
            {currentCustomer.loyaltyCardNumber && (
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {t('customerManagement.detail.contact.loyaltyCard')}
                  </p>
                  <p className="text-purple-600 font-medium">{currentCustomer.loyaltyCardNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            {t('customerManagement.detail.account.title')}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">
                  {t('customerManagement.detail.account.customerSince')}
                </p>
                <p className="text-gray-600">{formatDate(currentCustomer.registrationDate)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">
                  {t('customerManagement.detail.account.totalSpent')}
                </p>
                <p className="text-green-600 font-medium">{formatCurrency(currentCustomer.totalSpent)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Car className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">
                  {t('customerManagement.detail.account.totalVehicles')}
                </p>
                <p className="text-gray-600">
                  {currentCustomer.vehicles.length}{' '}
                  {currentCustomer.vehicles.length === 1
                    ? t('customerManagement.shared.vehicleSingular')
                    : t('customerManagement.shared.vehiclePlural')}
                </p>
              </div>
            </div>
          </div>
          {currentCustomer.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="font-medium text-gray-900 mb-2">
                {t('customerManagement.detail.notes')}
              </p>
              <p className="text-gray-600 text-sm">{currentCustomer.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Management */}
      <VehicleManagement
        vehicles={currentCustomer.vehicles}
        onAddVehicle={handleAddVehicle}
        onEditVehicle={handleUpdateVehicle}
        onDeleteVehicle={handleDeleteVehicle}
      />
    </div>
  )
}

export default CustomerDetail
