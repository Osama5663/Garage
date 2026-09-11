import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useMechanicStore } from '../stores/mechanicStore'
import { useCustomerStore } from '../stores/customerStore'
import { JobOrder } from '../types/jobOrder'
import { 
  Car, 
  User,
  Wrench, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  Filter,
  ChevronDown,
  Grid,
  List,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'



const GarageDashboard = () => {
  const { getVisibleJobOrders, updateJobStatus } = useJobOrderStore()
  const { mechanics } = useMechanicStore()
  const { customers } = useCustomerStore()
  
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [mechanicFilter, setMechanicFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const vehiclesPerPage = 10
  const textLimit = 10

  // Mock garage locations - in a real app, this would come from settings
  const garageLocations = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Outdoor Bay']



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting-parts': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'waiting-approval': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'

      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting-parts': return t('status.waitingParts')
      case 'waiting-approval': return t('status.waitingApproval')
      case 'in-progress': return t('status.inProgress')
      case 'completed': return t('status.completed')
      case 'pending': return t('status.pending')
      case 'transferred': return t('status.transferred')
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting-parts': return <Clock className="w-4 h-4" />
      case 'waiting-approval': return <AlertTriangle className="w-4 h-4" />
      case 'in-progress': return <Wrench className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />

      default: return <Clock className="w-4 h-4" />
    }
  }

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    return customer ? `${customer.firstName} ${customer.lastName}` : t('garageDashboard.unknownCustomer')
  }

  const getMechanicName = (mechanicId: string) => {
    const mechanic = mechanics.find(m => m.id === mechanicId)
    return mechanic ? mechanic.name : t('jobOrders.labels.unknownMechanic')
  }

  const truncateText = (value: string, max: number) => {
    if (!value) return ''
    return value.length <= max ? value : `${value.slice(0, max)}…`
  }



  const getEstimatedCompletion = (deadline: string, status: string) => {
    if (status === 'completed' || status === 'ready-pickup') return t('status.completed')
    
    const deadlineDate = new Date(deadline)
    const now = new Date()
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return t('status.overdue')
    if (diffDays === 0) return t('common.today')
    if (diffDays === 1) return t('common.tomorrow')
    return `${diffDays} ${diffDays > 1 ? t('garageDashboard.days') : t('garageDashboard.day')}`
  }

  const handleStatusChange = (jobId: string, newStatus: JobOrder['status']) => {
    updateJobStatus(jobId, newStatus, `Statut changé en ${newStatus} via tableau de bord`)
  }

  const formatLocation = (location: string) => {
    const key = location.toLowerCase().replace(/\s+(\d+)/g, '$1').replace(/\s+([a-z])/g, (_, c) => c.toUpperCase())
    const v = t(`garageDashboard.locations.${key}`)
    return v === `garageDashboard.locations.${key}` ? location : v
  }



  // Filter job orders to only show active vehicles in the garage
  const activeJobs = getVisibleJobOrders().filter(job => 
    job.status !== 'cancelled' && job.status !== 'completed'
  )

  // Apply filters
  const filteredJobs = activeJobs.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false
    if (mechanicFilter !== 'all' && job.assignedMechanic !== mechanicFilter) return false
    if (locationFilter !== 'all') {
      // For now, we'll assign locations based on job ID hash
      const assignedLocation = garageLocations[parseInt(job.id.slice(-1)) % garageLocations.length]
      if (assignedLocation !== locationFilter) return false
    }
    return true
  })



  const availableMechanics = Array.from(new Set(activeJobs.map(job => job.assignedMechanic)))

  // Status summary calculations
  const statusSummary = useMemo(() => {
    const summary = {
      pending: 0,
      'in-progress': 0,
      'waiting-parts': 0,
      'waiting-approval': 0,
      overdue: 0
    }
    
    filteredJobs.forEach(job => {
      summary[job.status as keyof typeof summary]++
      
      // Check if job is overdue
      const deadlineDate = new Date(job.deadline)
      const now = new Date()
      if (deadlineDate < now && job.status !== 'completed') {
        summary.overdue++
      }
    })
    
    return summary
  }, [filteredJobs])

  // Reset pagination when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [statusFilter, mechanicFilter, locationFilter])

  // Pagination logic
  const totalPages = Math.ceil(filteredJobs.length / vehiclesPerPage)
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * vehiclesPerPage
    return filteredJobs.slice(startIndex, startIndex + vehiclesPerPage)
  }, [filteredJobs, currentPage])

  // Toggle notes expansion
  const toggleNotesExpansion = (jobId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Status Summary Bar */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{t('status.pending')}: {statusSummary.pending}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{t('status.inProgress')}: {statusSummary['in-progress']}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{t('status.waitingParts')}: {statusSummary['waiting-parts']}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{t('status.waitingApproval')}: {statusSummary['waiting-approval']}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{t('status.overdue')}: {statusSummary.overdue}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {filteredJobs.length} {t('garageDashboard.vehicles')}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">


        {/* Header with View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('garageDashboard.title')}</h2>
            <p className="text-gray-600">{t('garageDashboard.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span className="text-sm font-medium">{t('garageDashboard.grid')}</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">{t('garageDashboard.list')}</span>
              </button>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>{t('garageDashboard.filters')}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

      {/* Compact Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('garageDashboard.filtersPanel.status')}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('garageDashboard.filtersPanel.all')}</option>
                <option value="pending">{t('status.pending')}</option>
                <option value="waiting-parts">{t('status.waitingParts')}</option>
                <option value="waiting-approval">{t('status.waitingApproval')}</option>
                <option value="in-progress">{t('status.inProgress')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('garageDashboard.filtersPanel.mechanic')}</label>
              <select
                value={mechanicFilter}
                onChange={(e) => setMechanicFilter(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('garageDashboard.filtersPanel.all')}</option>
                {availableMechanics.map(mechanicId => (
                  <option key={mechanicId} value={mechanicId}>
                    {getMechanicName(mechanicId)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('garageDashboard.filtersPanel.location')}</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('garageDashboard.filtersPanel.all')}</option>
                {garageLocations.map(location => (
                  <option key={location} value={location}>{formatLocation(location)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setMechanicFilter('all')
                  setLocationFilter('all')
                }}
                className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
              >
                {t('garageDashboard.filtersPanel.clear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Display */}
      {paginatedJobs.length > 0 ? (
        <div className="space-y-6">
          {viewMode === 'grid' ? (
            // Grid View - Compact Cards
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginatedJobs.map((job) => {
                const customerName = getCustomerName(job.customerId)
                const mechanicName = getMechanicName(job.assignedMechanic)
                const completionText = getEstimatedCompletion(job.deadline, job.status)
                const isOverdue = completionText === t('status.overdue')
                const isNotesExpanded = expandedNotes.has(job.id)
                
                return (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
                    {/* Compact Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Car className="w-4 h-4 text-gray-600" />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {job.vehicleInfo.make} {job.vehicleInfo.model}
                          </h4>
                          <p className="text-xs text-gray-600 truncate">
                            {job.vehicleInfo.year} • {job.vehicleInfo.registration}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Link to={`/job-orders/${job.id}`} className="text-xs text-blue-600 hover:underline" title={t('jobOrders.tooltips.viewDetails')}>
                              {job.jobNumber}
                            </Link>
                            <Link to={`/job-orders/${job.id}`} className="text-xs text-blue-600 hover:underline" title={t('jobOrders.tooltips.viewDetails')}>
                              {t('jobOrders.tooltips.viewDetails')}
                            </Link>
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(job.status)}
                          <span className="hidden sm:inline">{getStatusText(job.status)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Key Info */}
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center text-xs">
                        <User className="w-3 h-3 mr-1 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{customerName}</span>
                      </div>
                      <div className="flex items-center text-xs">
                        <Wrench className="w-3 h-3 mr-1 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{mechanicName}</span>
                      </div>
                      <div className="flex items-center text-xs">
                        <Calendar className="w-3 h-3 mr-1 text-gray-500 flex-shrink-0" />
                        <span className={`${isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'} truncate`}>
                          {completionText}
                        </span>
                      </div>
                    </div>

                    {/* Notes - Expandable */}
                    {job.notes && (
                      <div className="mb-2">
                        <button
                          onClick={() => toggleNotesExpansion(job.id)}
                          className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <Info className="w-3 h-3" />
                          <span>{isNotesExpanded ? t('garageDashboard.hideNotes') : t('garageDashboard.showNotes')}</span>
                        </button>
                        {isNotesExpanded && (
                          <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                            {job.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex space-x-1">
                      {job.status !== 'waiting-parts' && (
                        <button
                          onClick={() => handleStatusChange(job.id, 'waiting-parts')}
                          className="flex-1 px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                          title={t('status.waitingParts')}
                        >
                          {t('garageDashboard.button.parts')}
                        </button>
                      )}
                      {job.status !== 'in-progress' && (
                        <button
                          onClick={() => handleStatusChange(job.id, 'in-progress')}
                          className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          title={t('status.inProgress')}
                        >
                          {t('garageDashboard.button.work')}
                        </button>
                      )}
                      {job.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusChange(job.id, 'completed')}
                          className="flex-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                          title={t('status.pending')}
                        >
                          {t('garageDashboard.button.done')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('garageDashboard.table.vehicle')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('garageDashboard.table.customer')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('garageDashboard.table.mechanic')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('garageDashboard.table.status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.due')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('garageDashboard.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedJobs.map((job) => {
                    const customerName = getCustomerName(job.customerId)
                    const mechanicName = getMechanicName(job.assignedMechanic)
                    const completionText = getEstimatedCompletion(job.deadline, job.status)
                    const vehicleLabel = `${job.vehicleInfo.make} ${job.vehicleInfo.model}`
                    const isOverdue = completionText === t('status.overdue')
                    
                    return (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-normal">
                          <div className="flex items-center">
                            <Car className="w-4 h-4 mr-2 text-gray-600" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                <span title={vehicleLabel} className="break-words">{vehicleLabel}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                <span title={`${job.vehicleInfo.year} • ${job.vehicleInfo.registration}`} className="break-words">
                                  {job.vehicleInfo.year} • {job.vehicleInfo.registration}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <span title={customerName}>{truncateText(customerName, textLimit)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <span title={mechanicName}>{truncateText(mechanicName, textLimit)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(job.status)}
                              <span title={getStatusText(job.status)}>
                                {truncateText(getStatusText(job.status), textLimit)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                            <span title={completionText}>{truncateText(completionText, textLimit)}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex space-x-1">
                            {job.status !== 'waiting-parts' && (
                              <button
                                onClick={() => handleStatusChange(job.id, 'waiting-parts')}
                                className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                title={t('status.waitingParts')}
                              >
                                {t('garageDashboard.button.parts')}
                              </button>
                            )}
                            {job.status !== 'in-progress' && (
                              <button
                                onClick={() => handleStatusChange(job.id, 'in-progress')}
                                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                title={t('status.inProgress')}
                              >
                                {t('garageDashboard.button.work')}
                              </button>
                            )}
                            {job.status !== 'completed' && (
                              <button
                                onClick={() => handleStatusChange(job.id, 'completed')}
                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                title={t('status.pending')}
                              >
                                {t('garageDashboard.button.done')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * vehiclesPerPage) + 1} to {Math.min(currentPage * vehiclesPerPage, filteredJobs.length)} of {filteredJobs.length} vehicles
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1
                    const isActive = page === currentPage
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded-md border ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Car className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg text-gray-500 mb-2">No vehicles in the garage</p>
          <p className="text-sm text-gray-400">Active jobs will appear here</p>
        </div>
      )}
      </div>
    </div>
  )
}

export default GarageDashboard
