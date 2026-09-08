import React, { useState, useMemo } from 'react'
import { useInventoryStore } from '../stores/inventoryStore'
import { Supplier, PurchaseOrder } from '../types/inventory'
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  User, 
  Calendar, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Truck,
  Eye,
  Plus,
  ArrowLeft
} from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

interface SupplierProfileProps {
  supplier: Supplier
  onBack: () => void
  onEditSupplier: (supplier: Supplier) => void
  onCreatePurchaseOrder: (supplierId: string) => void
  onViewPurchaseOrder: (order: PurchaseOrder) => void
}

export const SupplierProfile: React.FC<SupplierProfileProps> = ({
  supplier,
  onBack,
  onEditSupplier,
  onCreatePurchaseOrder,
  onViewPurchaseOrder
}) => {
  const { 
    purchaseOrders, 
    inventoryItems, 
    stockMovements 
  } = useInventoryStore()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'history' | 'parts'>('overview')

  // Filter supplier-specific data
  const supplierPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(order => order.supplierId === supplier.id)
  }, [purchaseOrders, supplier.id])

  const supplierStockMovements = useMemo(() => {
    return stockMovements.filter(movement => movement.supplierId === supplier.id)
  }, [stockMovements, supplier.id])

  const supplierParts = useMemo(() => {
    return inventoryItems.filter(item => item.supplierId === supplier.id)
  }, [inventoryItems, supplier.id])

  // Calculate supplier metrics
  const metrics = useMemo(() => {
    const totalOrders = supplierPurchaseOrders.length
    const completedOrders = supplierPurchaseOrders.filter(order => order.status === 'received').length
    const totalValue = supplierPurchaseOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const averageLeadTime = supplier.averageLeadTime || 0
    const reliability = supplier.reliability || 0

    return {
      totalOrders,
      completedOrders,
      totalValue,
      averageLeadTime,
      reliability,
      completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0
    }
  }, [supplierPurchaseOrders, supplier])

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'confirmed': return 'bg-yellow-100 text-yellow-800'
      case 'partially_received': return 'bg-purple-100 text-purple-800'
      case 'received': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft'
      case 'sent': return 'Sent'
      case 'confirmed': return 'Confirmed'
      case 'partially_received': return 'Partially Received'
      case 'received': return 'Received'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={onBack}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                    <p className="text-sm text-gray-500">Supplier Profile & Management</p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => onEditSupplier(supplier)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Edit Supplier
                </button>
                <button
                  onClick={() => onCreatePurchaseOrder(supplier.id)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Purchase Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.completedOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalValue)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Lead Time</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.averageLeadTime}d</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Building2 },
                { id: 'orders', label: 'Purchase Orders', icon: Package },
                { id: 'parts', label: 'Associated Parts', icon: Truck },
                { id: 'history', label: 'Supply History', icon: Calendar }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Contact Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Contact Person</p>
                        <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone</p>
                        <p className="text-sm text-gray-600">{supplier.phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{supplier.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-600">
                      {supplier.address}, {supplier.city}, {supplier.postcode} {supplier.country}
                    </p>
                  </div>
                </div>
                  </div>
                </div>

                {/* Business Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Payment Terms</span>
                      <span className="text-sm text-gray-600">{supplier.paymentTerms}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Delivery Time</span>
                      <span className="text-sm text-gray-600">{supplier.deliveryTime} days</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Minimum Order</span>
                      <span className="text-sm text-gray-600">{formatCurrency(supplier.minimumOrderValue || 0)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Rating</span>
                      <span className="text-sm text-gray-600">{supplier.rating}/5</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Reliability</span>
                      <span className="text-sm text-gray-600">{supplier.reliability}%</span>
                    </div>
                    
                    {supplier.website && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Website</span>
                        <a 
                          href={supplier.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Purchase Orders</h3>
                  <span className="text-sm text-gray-500">{supplierPurchaseOrders.length} orders</span>
                </div>

                <div className="space-y-4">
                  {supplierPurchaseOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No purchase orders</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No purchase orders found for this supplier.
                      </p>
                    </div>
                  ) : (
                    supplierPurchaseOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{order.orderNumber}</h4>
                            <p className="text-xs text-gray-500">
                              Created: {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                              {getOrderStatusLabel(order.status)}
                            </span>
                            <button
                              onClick={() => onViewPurchaseOrder(order)}
                              className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Items</p>
                            <p className="font-medium">{order.items.length}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Subtotal</p>
                            <p className="font-medium">{formatCurrency(order.subtotal)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total</p>
                            <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Associated Parts Tab */}
            {activeTab === 'parts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Associated Parts</h3>
                  <span className="text-sm text-gray-500">{supplierParts.length} parts</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supplierParts.length === 0 ? (
                    <div className="md:col-span-3 text-center py-12">
                      <Truck className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No associated parts</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No parts are currently associated with this supplier.
                      </p>
                    </div>
                  ) : (
                    supplierParts.map((part) => (
                      <div key={part.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{part.name}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            part.quantity <= 0 ? 'bg-red-100 text-red-800' :
                            part.quantity <= part.minimumStock ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {part.quantity} {part.unit}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">SKU: {part.sku}</p>
                        <p className="text-xs text-gray-500 mb-2">Category: {part.category.replace('_', ' ')}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(part.unitCost)}
                          </span>
                          <button className="text-xs text-blue-600 hover:text-blue-800">
                            Reorder
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Supply History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Supply History</h3>
                  <span className="text-sm text-gray-500">{supplierStockMovements.length} transactions</span>
                </div>

                <div className="space-y-4">
                  {supplierStockMovements.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No supply history</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No supply transactions found for this supplier.
                      </p>
                    </div>
                  ) : (
                    supplierStockMovements.map((movement) => {
                      const item = inventoryItems.find(i => i.id === movement.inventoryItemId)
                      return (
                        <div key={movement.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Package className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">
                                {item?.name || movement.itemName}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(movement.createdAt)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Type</p>
                              <p className="font-medium capitalize">{movement.type}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Quantity</p>
                              <p className="font-medium">{movement.quantity} {item?.unit}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Reference</p>
                              <p className="font-medium">{movement.reference || 'N/A'}</p>
                            </div>
                          </div>
                          
                          {movement.notes && (
                            <p className="text-xs text-gray-600 mt-2">{movement.notes}</p>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
