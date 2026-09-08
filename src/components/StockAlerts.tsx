import React from 'react'
import { useInventoryStore } from '../stores/inventoryStore'
import { AlertTriangle, Package, TrendingDown, X } from 'lucide-react'
import { t } from '../i18n'
import { useLangStore } from '../stores/langStore'

interface StockAlertsProps {
  isOpen: boolean
  onClose: () => void
}

export const StockAlerts: React.FC<StockAlertsProps> = ({ isOpen, onClose }) => {
  console.log('StockAlerts component rendered, isOpen:', isOpen)
  const { stockAlerts, inventoryItems, dismissStockAlert } = useInventoryStore()
  useLangStore(state => state.language)
  
  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        console.log('ESC key pressed, closing modal')
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset' // Restore scrolling
    }
  }, [isOpen, onClose])

  const lowStockItems = inventoryItems.filter(item => item.status === 'low_stock')
  const outOfStockItems = inventoryItems.filter(item => item.status === 'out_of_stock')

  const allAlerts = [
    ...stockAlerts.map(alert => ({ ...alert, type: 'alert' as const })),
    ...lowStockItems.map(item => ({
      id: `low_${item.id}`,
      itemId: item.id,
      type: 'low_stock' as const,
      message: `${t('inventoryManagement.alerts.lowStockPrefix')} ${item.name} (${item.quantity} ${item.unit} ${t('inventoryManagement.alerts.remainingSuffix')})`,
      severity: 'warning' as const,
      createdAt: new Date().toISOString(),
      isRead: false
    })),
    ...outOfStockItems.map(item => ({
      id: `out_${item.id}`,
      itemId: item.id,
      type: 'out_of_stock' as const,
      message: `${t('inventoryManagement.alerts.outOfStockPrefix')} ${item.name}`,
      severity: 'critical' as const,
      createdAt: new Date().toISOString(),
      isRead: false
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <TrendingDown className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Package className="h-5 w-5 text-blue-500" />
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-blue-200 bg-blue-50'
    }
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

  if (!isOpen) {
    console.log('StockAlerts: isOpen is false, returning null')
    return null
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50"
      onClick={(e) => {
        console.log('Background overlay clicked')
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  {t('inventoryManagement.alerts.title')}
                </h3>
                <button
                  onClick={(e) => {
                    console.log('X button clicked in StockAlerts header')
                    e.preventDefault()
                    e.stopPropagation()
                    onClose()
                  }}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {allAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-green-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {t('inventoryManagement.alerts.emptyTitle')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {t('inventoryManagement.alerts.emptyDescription')}
                    </p>
                  </div>
                ) : (
                  allAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`border rounded-lg p-4 ${getAlertColor(alert.severity)}`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {getAlertIcon(alert.severity)}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(alert.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => dismissStockAlert(alert.id)}
                          className="ml-3 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {outOfStockItems.length}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('inventoryManagement.alerts.summaryOutOfStock')}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {lowStockItems.length}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('inventoryManagement.alerts.summaryLowStock')}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {allAlerts.length}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('inventoryManagement.alerts.summaryTotalAlerts')}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={(e) => {
                  console.log('Close button clicked in StockAlerts')
                  console.log('onClose function:', onClose)
                  e.preventDefault() // Prevent any default behavior
                  e.stopPropagation() // Stop event bubbling
                  onClose()
                }}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto"
              >
                {t('inventoryManagement.alerts.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
