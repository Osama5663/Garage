import React from 'react'
import { useInventoryStore } from '../stores/inventoryStore'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { Package, AlertTriangle, TrendingDown, DollarSign, Users, Truck, BarChart3, Eye } from 'lucide-react'
import { ShipmentHistory } from './ShipmentHistory'
import { t } from '../i18n'
import { useLangStore } from '../stores/langStore'
import { Link } from 'react-router-dom'

export const InventoryDashboard: React.FC = () => {
  const { inventoryItems, suppliers, purchaseOrders, stockMovements } = useInventoryStore()
  const { getJobOrderById } = useJobOrderStore()
  const [showShipmentHistory, setShowShipmentHistory] = React.useState(false)

  // Debug: Track data synchronization and changes
  React.useEffect(() => {
    console.log('=== INVENTORY DASHBOARD DATA SYNC DEBUG ===')
    console.log('Dashboard - inventoryItems count:', inventoryItems.length)
    console.log('Dashboard - suppliers count:', suppliers.length)
    console.log('Dashboard - purchaseOrders count:', purchaseOrders.length)
    console.log('Dashboard - stockMovements count:', stockMovements.length)
    console.log('Dashboard - First 3 inventory items:', inventoryItems.slice(0, 3))
    console.log('Dashboard - First 3 suppliers:', suppliers.slice(0, 3))
    console.log('=== END DASHBOARD DEBUG ===')
  }, [inventoryItems, suppliers, purchaseOrders, stockMovements])

  React.useEffect(() => {
    const w = window as any
    w.__UI_SNAPSHOTS__ = w.__UI_SNAPSHOTS__ || {}
    w.__UI_SNAPSHOTS__.dashboard = {
      inventoryItems,
      suppliers,
      purchaseOrders,
      stockMovements,
      timestamp: Date.now()
    }
  }, [inventoryItems, suppliers, purchaseOrders, stockMovements])

  // Debug: Track showShipmentHistory state changes
  React.useEffect(() => {
    console.log('InventoryDashboard: showShipmentHistory changed to:', showShipmentHistory)
  }, [showShipmentHistory])
  
  // Use the variables to avoid TypeScript warnings
  if (showShipmentHistory) {
    // This will be used when shipment history is implemented
  }

  // Calculate statistics
  const stats = {
    totalItems: inventoryItems.length,
    totalValue: inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
    lowStockItems: inventoryItems.filter(item => item.status === 'low_stock').length,
    outOfStockItems: inventoryItems.filter(item => item.status === 'out_of_stock').length,
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter(s => s.status === 'active').length,
    totalOrders: purchaseOrders.length,
    pendingOrders: purchaseOrders.filter(order => ['pending', 'approved', 'ordered'].includes(order.status)).length,
    totalMovements: stockMovements.length,
    recentMovements: [...stockMovements]
      .sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime())
      .slice(0, 5)
  }

  // Category breakdown
  const categoryBreakdown = inventoryItems.reduce((acc, item) => {
    const key = item.category
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Recent low stock items
  const recentLowStock = inventoryItems
    .filter(item => item.status === 'low_stock')
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5)

  // Recent out of stock items
  const recentOutOfStock = inventoryItems
    .filter(item => item.status === 'out_of_stock')
    .slice(0, 5)

  const formatCurrency = (amount: number) => {
    const { locale, currency } = useLangStore.getState()
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const { locale } = useLangStore.getState()
    return new Date(dateString).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const unitLabel = (unit?: string, qty?: number) => {
    if (!unit) return ''
    const map: Record<string, { fr: string; en: string }> = {
      bottle: { fr: 'bouteille', en: 'bottle' },
      piece: { fr: 'pièce', en: 'piece' },
      set: { fr: 'ensemble', en: 'set' }
    }
    const { language } = useLangStore.getState()
    const base = map[unit]?.[language] || unit
    const plural = qty && qty > 1 ? (language === 'fr' ? base + 's' : base + 's') : base
    return plural
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'receive':
      case 'in':
        return <Package className="h-4 w-4 text-green-600" />
      case 'sale':
      case 'issue':
      case 'out':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'transfer':
        return <BarChart3 className="h-4 w-4 text-purple-600" />
      case 'adjustment':
      case 'stock_take':
        return <BarChart3 className="h-4 w-4 text-blue-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'receive':
      case 'in':
        return 'bg-green-100 text-green-800'
      case 'sale':
      case 'issue':
      case 'out':
        return 'bg-red-100 text-red-800'
      case 'transfer':
        return 'bg-purple-100 text-purple-800'
      case 'adjustment':
      case 'stock_take':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('inventoryDashboard.title')}</h2>
              <p className="text-gray-600 mt-1">{t('inventoryDashboard.subtitle')}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  console.log('InventoryDashboard: Opening shipment history')
                  setShowShipmentHistory(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Eye className="h-4 w-4 mr-2" />
                {t('inventoryDashboard.actions.viewShipmentHistory')}
              </button>
              <Link
                to="/inventory/manage?tab=delivery-notes"
                className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Truck className="h-4 w-4 mr-2" />
                {t('nav.deliveryNotes')}
              </Link>
              <Link
                to="/inventory/manage"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Package className="h-4 w-4 mr-2" />
                {t('inventoryDashboard.actions.manageInventory')}
              </Link>
            </div>
          </div>
        </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('inventoryDashboard.metrics.totalItems')}</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('inventoryDashboard.metrics.totalValue')}</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('inventoryDashboard.metrics.lowStockItems')}</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.lowStockItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('inventoryDashboard.metrics.outOfStock')}</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.outOfStockItems}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Suppliers & Orders */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">{t('inventoryDashboard.supplierOverview.title')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</div>
                <div className="text-sm text-gray-500">{t('inventoryDashboard.supplierOverview.totalSuppliers')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.activeSuppliers}</div>
                <div className="text-sm text-gray-500">{t('inventoryDashboard.supplierOverview.activeSuppliers')}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Truck className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">{t('inventoryDashboard.purchaseOrders.title')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
                <div className="text-sm text-gray-500">{t('inventoryDashboard.purchaseOrders.totalOrders')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
                <div className="text-sm text-gray-500">{t('inventoryDashboard.purchaseOrders.pendingOrders')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">{t('inventoryDashboard.itemsByCategory.title')}</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(categoryBreakdown).map(([key, count]) => (
              <Link
                key={key}
                to={`/inventory/manage?tab=inventory&category=${encodeURIComponent(key)}`}
                className="flex justify-between items-center px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
              >
                <span className="text-sm text-gray-600">
                  {t(`inventoryDashboard.categories.${key}`)}
                </span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Low Stock Alerts */}
        {recentLowStock.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">{t('inventoryDashboard.metrics.lowStockItems')}</h3>
            </div>
            <div className="space-y-3">
              {recentLowStock.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-yellow-600">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="text-xs text-gray-500">Min: {item.minimumStock}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Out of Stock */}
        {recentOutOfStock.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <TrendingDown className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">{t('inventoryDashboard.outOfStockItems.title')}</h3>
            </div>
            <div className="space-y-3">
              {recentOutOfStock.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {t('inventoryDashboard.outOfStockItems.badge')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Stock Movements */}
      {stats.recentMovements.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Package className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">{t('inventoryDashboard.recentMovements.title')}</h3>
          </div>
          <div className="space-y-3">
            {stats.recentMovements.map((movement) => {
              const item = inventoryItems.find(i => i.id === movement.inventoryItemId)
              const displayName = movement.itemName || item?.name || t('inventoryDashboard.unknownItem')
              const unit = item?.unit
              const sign =
                movement.type === 'purchase' ||
                movement.type === 'receive' ||
                movement.type === 'in'
                  ? '+'
                  : movement.type === 'sale' ||
                    movement.type === 'issue' ||
                    movement.type === 'out'
                  ? '-'
                  : ''
              const jobOrderId = movement.jobOrderId
              const jobOrder = jobOrderId ? getJobOrderById(jobOrderId) : undefined

              return (
                <Link
                  key={movement.id}
                  to={`/inventory/manage?tab=inventory&sku=${encodeURIComponent(movement.sku || item?.sku || '')}`}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center">
                    {getMovementIcon(movement.type)}
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{displayName}</div>
                      <div className="text-xs text-gray-500">{formatDate(movement.movementDate || movement.createdAt)}</div>
                      {jobOrder && (
                        <div className="text-xs text-blue-600">
                          {jobOrder.jobNumber}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.type)}`}>
                      {sign}
                      {Math.abs(movement.quantity)} {unitLabel(unit, Math.abs(movement.quantity))}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Shipment History Modal */}
      <ShipmentHistory 
        isOpen={showShipmentHistory} 
        onClose={() => setShowShipmentHistory(false)} 
      />
    </div>
  )
}
