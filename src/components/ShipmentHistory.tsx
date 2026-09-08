import React, { useState, useMemo } from 'react'
import { useInventoryStore } from '../stores/inventoryStore'
import { Search, Package, ArrowUp, ArrowDown, Truck, Calendar } from 'lucide-react'
import { t } from '../i18n'
import { useLangStore } from '../stores/langStore'

interface ShipmentHistoryProps {
  isOpen: boolean
  onClose: () => void
}

export const ShipmentHistory: React.FC<ShipmentHistoryProps> = ({ isOpen, onClose }) => {
  const { stockMovements, inventoryItems, suppliers } = useInventoryStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  const filteredMovements = useMemo(() => {
    return stockMovements.filter(movement => {
      const item = inventoryItems.find(i => i.id === movement.inventoryItemId)
      const supplier = suppliers.find(s => s.id === movement.supplierId)
      
      const matchesSearch = item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = typeFilter === 'all' || movement.type === typeFilter
      
      const movementDate = new Date(movement.createdAt)
      const now = new Date()
      let matchesDate = true
      
      if (dateFilter === 'today') {
        matchesDate = movementDate.toDateString() === now.toDateString()
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesDate = movementDate >= weekAgo
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        matchesDate = movementDate >= monthAgo
      }
      
      return matchesSearch && matchesType && matchesDate
    })
  }, [stockMovements, inventoryItems, suppliers, searchTerm, typeFilter, dateFilter])

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'receive':
        return <ArrowUp className="h-4 w-4 text-green-600" />
      case 'sale':
      case 'issue':
        return <ArrowDown className="h-4 w-4 text-red-600" />
      case 'adjustment': return <Package className="h-4 w-4 text-blue-600" />
      case 'return': return <Truck className="h-4 w-4 text-yellow-600" />
      case 'transfer': return <Package className="h-4 w-4 text-purple-600" />
      default: return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'receive':
        return 'bg-green-50 text-green-800 border-green-200'
      case 'sale':
      case 'issue':
        return 'bg-red-50 text-red-800 border-red-200'
      case 'adjustment': return 'bg-blue-50 text-blue-800 border-blue-200'
      case 'return': return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'transfer': return 'bg-purple-50 text-purple-800 border-purple-200'
      default: return 'bg-gray-50 text-gray-800 border-gray-200'
    }
  }

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'purchase': return t('inventoryManagement.shipmentHistory.types.purchase')
      case 'sale': return t('inventoryManagement.shipmentHistory.types.sale')
      case 'adjustment': return t('inventoryManagement.shipmentHistory.types.adjustment')
      case 'return': return t('inventoryManagement.shipmentHistory.types.return')
      case 'transfer': return t('inventoryManagement.shipmentHistory.types.transfer')
      case 'receive': return t('inventoryManagement.shipmentHistory.types.receive')
      case 'issue': return t('inventoryManagement.shipmentHistory.types.issue')
      default: return type
    }
  }

  const formatDate = (dateString: string) => {
    const { locale } = useLangStore.getState()
    return new Date(dateString).toLocaleDateString(locale || 'fr-FR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const movementTypes = [
    { value: 'all', label: t('inventoryManagement.shipmentHistory.filters.type.all') },
    { value: 'purchase', label: t('inventoryManagement.shipmentHistory.filters.type.purchase') },
    { value: 'sale', label: t('inventoryManagement.shipmentHistory.filters.type.sale') },
    { value: 'adjustment', label: t('inventoryManagement.shipmentHistory.filters.type.adjustment') },
    { value: 'return', label: t('inventoryManagement.shipmentHistory.filters.type.return') },
    { value: 'transfer', label: t('inventoryManagement.shipmentHistory.filters.type.transfer') },
    { value: 'receive', label: t('inventoryManagement.shipmentHistory.filters.type.receive') },
    { value: 'issue', label: t('inventoryManagement.shipmentHistory.filters.type.issue') }
  ]

  const dateRanges = [
    { value: 'all', label: t('inventoryManagement.shipmentHistory.filters.date.all') },
    { value: 'today', label: t('inventoryManagement.shipmentHistory.filters.date.today') },
    { value: 'week', label: t('inventoryManagement.shipmentHistory.filters.date.week') },
    { value: 'month', label: t('inventoryManagement.shipmentHistory.filters.date.month') }
  ]

  // Don't render if not open
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  {t('inventoryManagement.shipmentHistory.title')}
                </h3>
                <button
                  onClick={() => {
                    console.log('ShipmentHistory: Close button clicked')
                    onClose()
                  }}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label={t('inventoryManagement.shipmentHistory.actions.close')}
                >
                  <Package className="h-6 w-6" />
                </button>
              </div>

              {/* Filters */}
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder={t('inventoryManagement.shipmentHistory.filters.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full"
                    />
                  </div>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {movementTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {dateRanges.map(range => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock Movements List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredMovements.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">{t('inventoryManagement.shipmentHistory.empty.title')}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || typeFilter !== 'all' || dateFilter !== 'all' 
                        ? t('inventoryManagement.shipmentHistory.empty.adjustFilters')
                        : t('inventoryManagement.shipmentHistory.empty.noMovements')}
                    </p>
                  </div>
                ) : (
                  filteredMovements.map((movement) => {
                    const item = inventoryItems.find(i => i.id === movement.inventoryItemId)
                    const supplier = suppliers.find(s => s.id === movement.supplierId)
                    
                    return (
                      <div key={movement.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0">
                              {getMovementIcon(movement.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {item?.name || t('inventoryDashboard.unknownItem')}
                                </h4>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getMovementColor(movement.type)}`}>
                                  {getMovementLabel(movement.type)}
                                </span>
                              </div>
                              
                              <div className="text-sm text-gray-500 space-y-1">
                                <div className="flex items-center">
                                  <span className="font-medium">{t('inventoryManagement.shipmentHistory.fields.sku')}:</span>
                                  <span className="ml-1">{item?.sku || t('inventoryManagement.shipmentHistory.fields.na')}</span>
                                </div>
                                
                                {supplier && (
                                  <div className="flex items-center">
                                    <span className="font-medium">{t('inventoryManagement.shipmentHistory.fields.supplier')}:</span>
                                    <span className="ml-1">{supplier.name}</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center">
                                  <span className="font-medium">{t('inventoryManagement.shipmentHistory.fields.quantity')}:</span>
                                  <span className={`ml-1 font-semibold ${
                                    movement.type === 'purchase' || movement.type === 'return' || movement.type === 'receive'
                                      ? 'text-green-600' 
                                      : 'text-red-600'
                                  }`}>
                                    {movement.type === 'purchase' || movement.type === 'return' || movement.type === 'receive' ? '+' : '-'}
                                    {movement.quantity} {item?.unit}
                                  </span>
                                </div>
                                
                                {movement.reference && (
                                  <div className="flex items-center">
                                    <span className="font-medium">{t('inventoryManagement.shipmentHistory.fields.reference')}:</span>
                                    <span className="ml-1">{movement.reference}</span>
                                  </div>
                                )}
                                
                                {movement.notes && (
                                  <div className="flex items-start">
                                    <span className="font-medium">{t('inventoryManagement.shipmentHistory.fields.notes')}:</span>
                                    <span className="ml-1">{movement.notes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 text-right">
                            <div className="text-sm text-gray-500">
                              <Calendar className="h-4 w-4 inline mr-1" />
                              {formatDate(movement.createdAt)}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {t('inventoryManagement.shipmentHistory.fields.stock')}: {movement.previousQuantity} → {movement.newQuantity}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={() => {
                  console.log('ShipmentHistory: Bottom Close button clicked')
                  onClose()
                }}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto"
              >
                {t('inventoryManagement.shipmentHistory.actions.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
