import React, { useState, useEffect } from 'react'
import { useInventoryStore } from '../stores/inventoryStore'
import ButtonTest from './ButtonTest'
import ButtonTestMinimal from './ButtonTestMinimal'
import { InventoryList } from './InventoryList'
import { InventoryForm } from './InventoryForm'
import { StockAlerts } from './StockAlerts'
import { SupplierManager } from './SupplierManager'
import { SupplierForm } from './SupplierForm'
import { SupplierProfile } from './SupplierProfile'
import { PurchaseOrderList } from './PurchaseOrderList'
import { InventoryItem, InventoryFormData, Supplier, SupplierFormData } from '../types/inventory'
import { Package, Users, Truck, Bell, Plus } from 'lucide-react'

const InventoryManager: React.FC = () => {
  const { 
    addInventoryItem, 
    updateInventoryItem, 
    addSupplier, 
    updateSupplier,
    createPurchaseOrder,
    fetchInventoryItems,
    fetchSuppliers
  } = useInventoryStore()

  useEffect(() => {
    fetchInventoryItems()
    fetchSuppliers()
  }, [])

  const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers' | 'orders' | 'alerts'>('inventory')
  const [showInventoryForm, setShowInventoryForm] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [showStockAlerts, setShowStockAlerts] = useState(false)
  const [showSupplierProfile, setShowSupplierProfile] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const handleAddInventoryItem = () => {
    setEditingItem(null)
    setShowInventoryForm(true)
  }

  const handleEditInventoryItem = (item: InventoryItem) => {
    setEditingItem(item)
    setShowInventoryForm(true)
  }

  const handleViewInventoryDetails = (item: InventoryItem) => {
    // This could open a detailed view modal
    console.log('View details for:', item)
  }

  const handleSaveInventoryItem = async (data: InventoryFormData) => {
    if (editingItem) {
      await updateInventoryItem(editingItem.id, data)
    } else {
      await addInventoryItem(data)
    }
    setShowInventoryForm(false)
    setEditingItem(null)
  }

  const handleAddSupplier = () => {
    setEditingSupplier(null)
    setShowSupplierForm(true)
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setShowSupplierForm(true)
  }

  const handleSaveSupplier = async (data: SupplierFormData) => {
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, data as any)
      } else {
        await addSupplier(data)
      }
      setShowSupplierForm(false)
      setEditingSupplier(null)
    } catch (error) {
      console.error('Failed to save supplier from inventory manager:', error)
    }
  }

  const handleAddPurchaseOrder = () => {
    // This would open the purchase order creation form
    console.log('Add purchase order')
  }

  const handleViewPurchaseOrder = (order: any) => {
    // This would open the purchase order details
    console.log('View purchase order:', order)
  }

  const handleEditPurchaseOrder = (order: any) => {
    // This would open the purchase order edit form
    console.log('Edit purchase order:', order)
  }

  const handleViewSupplierProfile = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowSupplierProfile(true)
  }

  const handleCloseSupplierProfile = () => {
    console.log('Closing supplier profile')
    setShowSupplierProfile(false)
    setSelectedSupplier(null)
  }

  const handleCloseStockAlerts = () => {
    console.log('Closing stock alerts modal')
    setShowStockAlerts(false)
  }

  // Debug effect for showStockAlerts
  useEffect(() => {
    console.log('showStockAlerts state changed:', showStockAlerts)
  }, [showStockAlerts])

  const handleCreatePurchaseOrder = (supplierId: string) => {
    // Create a new purchase order for the supplier
    const newOrderData = {
      orderNumber: `PO-${Date.now()}`,
      supplierId,
      items: [],
      subtotal: 0,
      shipping: 0,
      totalAmount: 0,
      status: 'draft' as const,
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      notes: ''
    }
    
    createPurchaseOrder(newOrderData)
    // Switch to orders tab to show the new order
    setActiveTab('orders')
    setShowSupplierProfile(false)
  }

  const tabs = [
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'orders', label: 'Purchase Orders', icon: Truck },
    { id: 'alerts', label: 'Stock Alerts', icon: Bell }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Button Test Components */}
        <ButtonTest />
        <ButtonTestMinimal />
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
              <p className="mt-2 text-gray-600">
                Track stock levels, manage suppliers, and handle purchase orders
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowStockAlerts(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Bell className="h-4 w-4 mr-2" />
                Stock Alerts
              </button>
              {activeTab === 'inventory' && (
                <button
                  onClick={handleAddInventoryItem}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              )}
              {activeTab === 'suppliers' && (
                <button
                  onClick={handleAddSupplier}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </button>
              )}
              {activeTab === 'orders' && (
                <button
                  onClick={handleAddPurchaseOrder}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Order
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className={`
                      h-5 w-5 mr-2
                      ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div>
          {/* Use CSS classes instead of conditional rendering to prevent re-mounting */}
          <div className={activeTab === 'inventory' ? 'block' : 'hidden'}>
            <InventoryList
              onAddItem={handleAddInventoryItem}
              onEditItem={handleEditInventoryItem}
              onViewDetails={handleViewInventoryDetails}
            />
          </div>
          
          <div className={activeTab === 'suppliers' ? 'block' : 'hidden'}>
            <SupplierManager
              onAddSupplier={handleAddSupplier}
              onEditSupplier={handleEditSupplier}
              onViewSupplierProfile={handleViewSupplierProfile}
            />
          </div>
          
          <div className={activeTab === 'orders' ? 'block' : 'hidden'}>
            <PurchaseOrderList
              onAddOrder={handleAddPurchaseOrder}
              onViewOrder={handleViewPurchaseOrder}
              onEditOrder={handleEditPurchaseOrder}
            />
          </div>
          
          <div className={activeTab === 'alerts' ? 'block' : 'hidden'}>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-6">
                <Bell className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Stock Alerts</h2>
              </div>
              <StockAlerts 
                isOpen={true} 
                onClose={() => {
                  console.log('StockAlerts in alerts tab onClose called, switching to inventory tab')
                  setActiveTab('inventory')
                }} 
              />
            </div>
          </div>
        </div>

        {/* Modals */}
        <InventoryForm
          item={editingItem}
          isOpen={showInventoryForm}
          onClose={() => {
            setShowInventoryForm(false)
            setEditingItem(null)
          }}
          onSave={handleSaveInventoryItem}
        />

        {showSupplierForm && (
          <SupplierForm
            supplier={editingSupplier || undefined}
            mode={editingSupplier ? 'edit' : 'add'}
            onClose={() => {
              setShowSupplierForm(false)
              setEditingSupplier(null)
            }}
            onSubmit={handleSaveSupplier}
          />
        )}

        <StockAlerts
          isOpen={showStockAlerts}
          onClose={handleCloseStockAlerts}
        />

        {selectedSupplier && (
          <div className={`fixed inset-0 z-50 ${showSupplierProfile ? 'block' : 'hidden'}`}>
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleCloseSupplierProfile} />
            <div className="absolute inset-0 overflow-hidden">
              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex sm:pl-16">
                <div className="w-screen max-w-4xl">
                  <SupplierProfile
                    supplier={selectedSupplier}
                    onBack={handleCloseSupplierProfile}
                    onEditSupplier={handleEditSupplier}
                    onCreatePurchaseOrder={handleCreatePurchaseOrder}
                    onViewPurchaseOrder={handleViewPurchaseOrder}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryManager
