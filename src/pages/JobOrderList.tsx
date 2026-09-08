import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useMechanicStore } from '../stores/mechanicStore'
import { JobOrder } from '../types/jobOrder'
import { 
  Search, 
  Plus, 
  Edit, 
  Eye, 
  Calendar, 
  Clock, 
  User, 
  Car, 
  Wrench,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock3,
  Grid,
  List
} from 'lucide-react'
import { t } from '../i18n'
import { useLangStore } from '../stores/langStore'
import { useHasPermission } from '../stores/authStore'
import { useSystemTime } from '../stores/timeStore'

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return t('status.pending')
    case 'in-progress': return t('status.inProgress')
    case 'waiting-parts': return t('status.waitingParts')
    case 'completed': return t('status.completed')
    case 'cancelled': return t('status.cancelled')
    case 'transferred': return t('status.transferred')
    default: return status
  }
}

const getPriorityText = (priority: string) => {
  switch (priority) {
    case 'urgent': return t('jobOrders.filters.urgent')
    case 'high': return t('jobOrders.filters.high')
    case 'medium': return t('jobOrders.filters.medium')
    case 'low': return t('jobOrders.filters.low')
    default: return priority
  }
}

const textLimit = 10

const truncateText = (value: string, max: number) => {
  if (!value) return ''
  return value.length <= max ? value : `${value.slice(0, max)}…`
}

const JobOrderList = () => {
  const navigate = useNavigate()
  const { searchTerm, setSearchTerm, getFilteredJobOrders, initializeStore, isPersisted, deleteJobOrder } = useJobOrderStore()
  const { mechanics } = useMechanicStore()
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showDelete, setShowDelete] = useState<{ open: boolean; id?: string; job?: JobOrder }>({ open: false })
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const canCreate = useHasPermission('create', 'job-orders')
  const canUpdate = useHasPermission('update', 'job-orders')
  const canDelete = useHasPermission('delete', 'job-orders')

  // Initialize store on mount
  useEffect(() => {
    initializeStore()
    console.log('JobOrderList: Store initialized, job orders loaded:', getFilteredJobOrders().length)
  }, [initializeStore])
  
  const filteredJobOrders = getFilteredJobOrders()
  
  // Apply additional filters
  const finalFilteredJobOrders = filteredJobOrders.filter(jobOrder => {
    if (statusFilter !== 'all' && jobOrder.status !== statusFilter) return false
    if (priorityFilter !== 'all' && jobOrder.priority !== priorityFilter) return false
    return true
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchTerm(localSearchTerm)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'waiting-parts': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMechanicName = (mechanicId: string) => {
    const mechanic = mechanics.find(m => m.id === mechanicId)
    return mechanic ? mechanic.name : t('jobOrders.labels.unknownMechanic')
  }

  const { now } = useSystemTime()

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < now
  }


  const formatDate = (dateString: string) => {
    const { locale } = useLangStore.getState()
    return new Date(dateString).toLocaleDateString(locale)
  }

  

  const getJobStats = () => {
    const total = finalFilteredJobOrders.length
    const completed = finalFilteredJobOrders.filter(j => j.status === 'completed').length
    const inProgress = finalFilteredJobOrders.filter(j => j.status === 'in-progress').length
    const overdue = finalFilteredJobOrders.filter(j => isOverdue(j.deadline) && j.status !== 'completed').length
    
    return { total, completed, inProgress, overdue }
  }

  const stats = getJobStats()

  const totalPages = Math.ceil(finalFilteredJobOrders.length / pageSize) || 1
  const paginatedJobOrders = finalFilteredJobOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <div className="max-w-7xl mx-auto p-6">
      
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('jobOrders.title')}</h1>
              {isPersisted && (
                <div className="flex items-center space-x-1 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('persistence.persisted')}</span>
                </div>
              )}
            </div>
            <p className="text-gray-600">{t('jobOrders.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">{t('garageDashboard.list')}</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span className="text-sm font-medium">{t('garageDashboard.grid')}</span>
              </button>
            </div>
            {canCreate && (
            <button
              onClick={() => navigate('/job-orders/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{t('jobOrders.new')}</span>
            </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Wrench className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-600 font-medium">{t('jobOrders.stats.total')}</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-green-600 font-medium">{t('jobOrders.stats.completed')}</p>
                <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock3 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-600 font-medium">{t('jobOrders.stats.inProgress')}</p>
                <p className="text-2xl font-bold text-blue-900">{stats.inProgress}</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-red-600 font-medium">{t('jobOrders.stats.overdue')}</p>
                <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder={t('jobOrders.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              {t('jobOrders.searchButton')}
            </button>
          </div>
        </form>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('jobOrders.filters.allStatus')}</option>
              <option value="pending">{t('status.pending')}</option>
              <option value="in-progress">{t('status.inProgress')}</option>
              <option value="waiting-parts">{t('status.waitingParts')}</option>
              <option value="completed">{t('status.completed')}</option>
              <option value="cancelled">{t('status.cancelled')}</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-gray-500" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('jobOrders.filters.allPriority')}</option>
              <option value="urgent">{t('jobOrders.filters.urgent')}</option>
              <option value="high">{t('jobOrders.filters.high')}</option>
              <option value="medium">{t('jobOrders.filters.medium')}</option>
              <option value="low">{t('jobOrders.filters.low')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Job Orders Display */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {finalFilteredJobOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Wrench className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">{t('jobOrders.empty.title')}</p>
            <p className="text-sm">{t('jobOrders.empty.subtitle')}</p>
          </div>
        ) : (
          <div>
            {viewMode === 'grid' ? (
              // Grid View - Compact Cards
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                {paginatedJobOrders.map((jobOrder) => (
                  <JobOrderGridCard
                    key={jobOrder.id}
                    jobOrder={jobOrder}
                    onView={() => navigate(`/job-orders/${jobOrder.id}`)}
                    onEdit={() => navigate(`/job-orders/${jobOrder.id}?action=edit`)}
                    onDelete={() => setShowDelete({ open: true, id: jobOrder.id, job: jobOrder })}
                    getMechanicName={getMechanicName}
                    formatDate={formatDate}
                    isOverdue={isOverdue}
                    getStatusColor={getStatusColor}
                    getPriorityColor={getPriorityColor}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            ) : (
              // List View - Original Cards
              <div className="divide-y divide-gray-200">
                {paginatedJobOrders.map((jobOrder) => (
                  <JobOrderListCard
                    key={jobOrder.id}
                    jobOrder={jobOrder}
                    onView={() => navigate(`/job-orders/${jobOrder.id}`)}
                    onEdit={() => navigate(`/job-orders/${jobOrder.id}?action=edit`)}
                    onDelete={() => setShowDelete({ open: true, id: jobOrder.id, job: jobOrder })}
                    getMechanicName={getMechanicName}
                    formatDate={formatDate}
                    isOverdue={isOverdue}
                    getStatusColor={getStatusColor}
                    getPriorityColor={getPriorityColor}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {finalFilteredJobOrders.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, finalFilteredJobOrders.length)} of {finalFilteredJobOrders.length} job orders
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
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
            </button>
          </div>
        </div>
      )}
      {showDelete.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="jo-delete-title">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 id="jo-delete-title" className="text-lg font-semibold text-gray-900">{t('deliveryNotesList.confirm.deleteTitle')}</h2>
              <button onClick={() => setShowDelete({ open: false })} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">{t('deliveryNotesList.confirm.deleteText')}</p>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setShowDelete({ open: false })} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">{t('deliveryNotesList.confirm.cancel')}</button>
                <button
                  onClick={() => {
                    if (showDelete.id) deleteJobOrder(showDelete.id)
                    setShowDelete({ open: false })
                  }}
                  className="px-4 py-2 border border-red-600 text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  {t('deliveryNotesList.confirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface JobOrderListCardProps {
  jobOrder: JobOrder
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  getMechanicName: (id: string) => string
  formatDate: (dateString: string) => string
  isOverdue: (deadline: string) => boolean
  getStatusColor: (status: string) => string
  getPriorityColor: (priority: string) => string
  canUpdate: boolean
  canDelete: boolean
}

const JobOrderListCard = ({
  jobOrder,
  onView,
  onEdit,
  onDelete,
  getMechanicName,
  formatDate,
  isOverdue,
  getStatusColor,
  getPriorityColor,
  canUpdate,
  canDelete
}: JobOrderListCardProps) => {
  const nav = useNavigate()
  return (
    <div className="p-3 hover:bg-gray-50 transition-colors border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* Compact Header Row */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-semibold text-gray-900 text-sm">
              {jobOrder.jobNumber}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(jobOrder.priority)}`}>
              {getPriorityText(jobOrder.priority)}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(jobOrder.status)}`}>
              {getStatusText(jobOrder.status)}
            </span>
            {isOverdue(jobOrder.deadline) && jobOrder.status !== 'completed' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {t('jobOrders.badges.overdue')}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span>
                {jobOrder.customerName}
              </span>
            </div>
            <div
              className="flex items-center space-x-1"
            >
              <Car className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span>
                {jobOrder.vehicleInfo.make} {jobOrder.vehicleInfo.model} ({jobOrder.vehicleInfo.year})
              </span>
              {jobOrder.vehicleInfo.registration ? (
                <span className="text-gray-500">
                  {jobOrder.vehicleInfo.registration}
                </span>
              ) : null}
            </div>
            <div className="flex items-center space-x-1">
              <Wrench className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span>
                {getMechanicName(jobOrder.assignedMechanic)}
              </span>
            </div>
          </div>

          {/* Compact Details Row */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1" title={t('jobOrders.labels.deadline')}>
              <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className={isOverdue(jobOrder.deadline) && jobOrder.status !== 'completed' ? 'text-red-600 font-medium' : ''}>
                {formatDate(jobOrder.deadline)}
              </span>
            </div>
            <div className="flex items-center space-x-1" title={t('jobOrders.labels.estHours')}>
              <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span>{jobOrder.estimatedHours}h</span>
            </div>
            {/* Price hidden in repair process */}
          </div>

          <p className="text-xs text-gray-600 mt-2">
            {jobOrder.description}
          </p>
        </div>

        {/* Compact Actions */}
        <div className="flex items-center space-x-1 ml-3">
          <button
            onClick={onView}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
            title={t('jobOrders.tooltips.view')}
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={() => nav(`/job-orders/${jobOrder.id}?tab=overview&view=1`)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1 rounded transition-colors text-xs"
            title={t('jobOrders.tooltips.viewDetails')}
            aria-label={t('jobOrders.tooltips.view')}
          >
            {t('jobOrders.tooltips.view')}
          </button>
          {canUpdate && (
          <button
            onClick={onEdit}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1 rounded transition-colors text-xs"
            title={t('jobOrders.tooltips.edit')}
          >
            <Edit className="w-3 h-3" />
          </button>
          )}
          {canDelete && (
          <button
            onClick={onDelete}
            className="bg-red-50 hover:bg-red-100 text-red-700 p-1 rounded transition-colors text-xs"
            title={t('deliveryNotesList.actions.delete')}
          >
            {t('deliveryNotesList.actions.delete')}
          </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface JobOrderGridCardProps {
  jobOrder: JobOrder
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  getMechanicName: (id: string) => string
  formatDate: (dateString: string) => string
  isOverdue: (deadline: string) => boolean
  getStatusColor: (status: string) => string
  getPriorityColor: (priority: string) => string
  canUpdate: boolean
  canDelete: boolean
}

const JobOrderGridCard = ({
  jobOrder,
  onView,
  onEdit,
  onDelete,
  getMechanicName,
  formatDate,
  isOverdue,
  getStatusColor,
  getPriorityColor,
  canUpdate,
  canDelete
}: JobOrderGridCardProps) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Link
            to={`/job-orders/${jobOrder.id}`}
            className="font-bold text-blue-600 hover:underline text-sm"
            title={t('jobOrders.tooltips.viewDetails')}
          >
            {jobOrder.jobNumber}
          </Link>
          <Link
            to={`/job-orders/${jobOrder.id}`}
            className="text-xs text-blue-600 hover:underline"
            title={t('jobOrders.tooltips.viewDetails')}
          >
            {t('jobOrders.tooltips.viewDetails')}
          </Link>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(jobOrder.priority)}`}>
            {jobOrder.priority.toUpperCase()}
          </span>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(jobOrder.status)}`}>
          {jobOrder.status.replace('-', ' ').toUpperCase()}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center space-x-2">
          <User className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-700">
            {jobOrder.customerName}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Car className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-700">
            {jobOrder.vehicleInfo.make} {jobOrder.vehicleInfo.model} ({jobOrder.vehicleInfo.year})
          </span>
          {jobOrder.vehicleInfo.registration ? (
            <span className="text-xs text-gray-500">
              {jobOrder.vehicleInfo.registration}
            </span>
          ) : null}
        </div>
        <div className="flex items-center space-x-2">
          <Wrench className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-700">
            {getMechanicName(jobOrder.assignedMechanic)}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-600 mb-3">
        {jobOrder.description}
      </p>

      {/* Key Details - Compact */}
      <div className="space-y-1 mb-3 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">{t('jobOrders.labels.deadline')}:</span>
          <span className={`${isOverdue(jobOrder.deadline) && jobOrder.status !== 'completed' ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
            {formatDate(jobOrder.deadline)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('jobOrders.labels.estHours')}:</span>
          <span className="text-gray-700">{jobOrder.estimatedHours}h</span>
        </div>
        {/* Price hidden in repair process */}
      </div>

      {/* Overdue Warning */}
      {isOverdue(jobOrder.deadline) && jobOrder.status !== 'completed' && (
        <div className="mb-3 px-2 py-1 bg-red-50 border border-red-200 rounded">
          <span className="text-xs text-red-700 font-medium">OVERDUE</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex space-x-1">
        <button
          onClick={onView}
          className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          title={t('jobOrders.tooltips.viewDetails')}
        >
          {t('jobOrders.tooltips.viewDetails')}
        </button>
        {canUpdate && (
        <button
          onClick={onEdit}
          className="flex-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
          title={t('jobOrders.tooltips.edit')}
        >
          {t('jobOrders.tooltips.edit')}
        </button>
        )}
        {canDelete && (
        <button
          onClick={onDelete}
          className="flex-1 px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
          title={t('deliveryNotesList.actions.delete')}
        >
          {t('deliveryNotesList.actions.delete')}
        </button>
        )}
      </div>
    </div>
  )
}

export default JobOrderList
