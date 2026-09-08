import { useInventoryStore } from '../stores/inventoryStore'
import { InventoryFormData, StockOperationFormData, StockTransferFormData } from '../types/inventory'

// Test inventory management system functionality
export async function testInventorySystem() {
  console.log('🧪 Starting Inventory System Tests...\n')
  
  const store = useInventoryStore.getState()
  
  // Test 1: Add new inventory items
  console.log('📦 Test 1: Adding new inventory items')
  
  const testItem1: InventoryFormData = {
    sku: 'BRK-001',
    name: 'Brake Pads - Front',
    description: 'Premium ceramic brake pads for front wheels',
    category: 'brakes',
    quantity: 50,
    minimumStock: 10,
    maximumStock: 100,
    reorderPoint: 15,
    unitCost: 25.00,
    sellingPrice: 45.00,
    taxRate: 0.08,
    unit: 'set',
    supplierId: 'sup_001',
    location: 'A1-01',
    barcode: '1234567890123',
    manufacturer: 'BrakeTech',
    manufacturerWarrantyMonths: 12,
    leadTimeDays: 7,
    isTaxable: true,
    isTrackable: true
  }
  
  const testItem2: InventoryFormData = {
    sku: 'OIL-005',
    name: 'Engine Oil 5W-30',
    description: 'Synthetic motor oil 5W-30, 1 quart',
    category: 'fluids',
    quantity: 25,
    minimumStock: 15,
    maximumStock: 50,
    reorderPoint: 20,
    unitCost: 8.50,
    sellingPrice: 15.99,
    taxRate: 0.08,
    unit: 'liter',
    supplierId: 'sup_002',
    location: 'B2-03',
    barcode: '9876543210987',
    manufacturer: 'OilPro',
    manufacturerWarrantyMonths: 0,
    leadTimeDays: 3,
    isTaxable: true,
    isTrackable: true
  }
  
  try {
    const item1 = store.addInventoryItem(testItem1)
    const item2 = store.addInventoryItem(testItem2)
    console.log(`✅ Added item 1: ${item1.name} (ID: ${item1.id})`)
    console.log(`✅ Added item 2: ${item2.name} (ID: ${item2.id})`)
    console.log(`📊 Current inventory count: ${store.inventoryItems.length}\n`)
  } catch (error) {
    console.error('❌ Failed to add inventory items:', error)
    return
  }
  
  // Test 2: Stock operations
  console.log('📈 Test 2: Testing stock operations')
  
  const items = store.inventoryItems
  if (items.length >= 2) {
    const stockOperation: StockOperationFormData = {
      operationType: 'stock_in',
      operationDate: new Date().toISOString(),
      reason: 'Purchase Order #PO-2024-001',
      referenceType: 'purchase_order',
      referenceId: 'po_001',
      referenceNumber: 'PO-2024-001',
      supplierId: 'sup_001',
      items: [
        {
          inventoryItemId: items[0].id,
          itemName: items[0].name,
          sku: items[0].sku,
          quantity: 20,
          unitCost: 25.00,
          batchNumber: 'BATCH-001',
          fromLocation: 'A1-01',
          toLocation: 'A1-01'
        },
        {
          inventoryItemId: items[1].id,
          itemName: items[1].name,
          sku: items[1].sku,
          quantity: 10,
          unitCost: 8.50,
          batchNumber: 'BATCH-002',
          fromLocation: 'B2-03',
          toLocation: 'B2-03'
        }
      ]
    }
    
    try {
      store.performStockOperation(stockOperation)
      console.log(`✅ Stock operation completed successfully`)
      console.log(`📊 Updated quantities: Item 1: ${items[0].quantity}, Item 2: ${items[1].quantity}\n`)
    } catch (error) {
      console.error('❌ Stock operation failed:', error)
    }
  }
  
  // Test 3: Stock transfer
  console.log('🚚 Test 3: Testing stock transfer')
  
  if (items.length >= 2) {
    const transferData: StockTransferFormData = {
      items: [
        {
          inventoryItemId: items[0].id,
          quantity: 5,
          unitCost: 25.00,
          notes: 'Transfer to service bay'
        }
      ],
      fromLocation: 'A1-01',
      toLocation: 'C3-05',
      reason: 'Service bay restock',
      referenceNumber: 'TF-2024-001',
      requestedDate: new Date().toISOString(),
      requiresApproval: false,
      approvedBy: undefined,
      notes: 'Moving brake pads to service area'
    }
    
    try {
      const transfer = store.addStockTransfer(transferData)
      console.log(`✅ Stock transfer completed: ${transfer.transferNumber}`)
      console.log(`📍 From: ${transfer.fromLocation} → To: ${transfer.toLocation}\n`)
    } catch (error) {
      console.error('❌ Stock transfer failed:', error)
    }
  }
  
  // Test 4: Stock level monitoring
  console.log('⚠️ Test 4: Testing stock level monitoring')
  
  // Create an item with low stock
  const lowStockItem: InventoryFormData = {
    sku: 'FLT-001',
    name: 'Oil Filter',
    description: 'Standard oil filter',
    category: 'consumables',
    quantity: 3,
    minimumStock: 10,
    maximumStock: 50,
    reorderPoint: 8,
    unitCost: 5.00,
    sellingPrice: 12.99,
    taxRate: 0.08,
    unit: 'piece',
    supplierId: 'sup_002',
    location: 'D1-02',
    barcode: '5555555555555',
    manufacturer: 'FilterCo',
    manufacturerWarrantyMonths: 0,
    leadTimeDays: 5,
    isTaxable: true,
    isTrackable: true
  }
  
  try {
    const lowItem = store.addInventoryItem(lowStockItem)
    store.checkStockAlerts()
    console.log(`✅ Low stock item created: ${lowItem.name} (Qty: ${lowItem.quantity}, Min: ${lowItem.minimumStock})`)
    console.log(`🚨 Stock alerts: ${store.stockAlerts.length}`)
    store.stockAlerts.forEach(alert => {
      console.log(`   - ${alert.itemName}: ${alert.message}`)
    })
    console.log()
  } catch (error) {
    console.error('❌ Low stock test failed:', error)
  }
  
  // Test 5: Search and filtering
  console.log('🔍 Test 5: Testing search and filtering')
  
  store.setSearchTerm('brake')
  const searchResults = store.getFilteredItems()
  console.log(`✅ Search for 'brake': ${searchResults.length} results`)
  
  store.setFilters({ category: ['Brakes'] })
  const filteredResults = store.getFilteredItems()
  console.log(`✅ Filter by category 'Brakes': ${filteredResults.length} results`)
  
  store.setSort({ field: 'quantity', direction: 'desc' })
  const sortedResults = store.getFilteredItems()
  console.log(`✅ Sort by quantity (desc): First item has ${sortedResults[0]?.quantity} units\n`)
  
  // Reset filters
  store.setSearchTerm('')
  store.setFilters({ category: [] })
  store.setSort({ field: 'name', direction: 'asc' })
  
  // Test 6: Transaction history
  console.log('📋 Test 6: Testing transaction history')
  
  if (items.length > 0) {
    const history = store.getItemHistory(items[0].id)
    console.log(`✅ Transaction history for ${items[0].name}: ${history.length} movements`)
    history.slice(0, 3).forEach(movement => {
      console.log(`   - ${movement.type}: ${movement.quantity} units, Reason: ${movement.reason}`)
    })
    console.log()
  }
  
  // Test 7: Statistics
  console.log('📊 Test 7: Testing statistics')
  
  const stats = store.getInventoryStats()
  console.log('✅ Inventory Statistics:')
  console.log(`   - Total Items: ${stats.totalItems}`)
  console.log(`   - Total Value: $${stats.totalValue.toFixed(2)}`)
  console.log(`   - Low Stock Items: ${stats.lowStockItems}`)
  console.log(`   - Out of Stock Items: ${stats.outOfStockItems}`)
  console.log(`   - Expiring Items: ${stats.expiringItems}`)
  console.log(`   - Active Suppliers: ${stats.activeSuppliers}`)
  console.log(`   - Pending Orders: ${stats.pendingOrders}`)
  console.log()
  
  // Test 8: Delete protection
  console.log('🛡️ Test 8: Testing delete protection')
  
  if (items.length > 0) {
    const itemWithStock = items[0]
    const deleteResult = store.deleteInventoryItem(itemWithStock.id)
    console.log(`✅ Delete attempt for item with stock (${itemWithStock.name}): ${deleteResult ? 'SUCCESS' : 'BLOCKED (correct behavior)'}`)
    
    if (!deleteResult) {
      console.log(`   Reason: ${store.error}`)
    }
  }
  
  console.log('\n🎉 Inventory System Tests Completed!')
  console.log(`📈 Total items in system: ${store.inventoryItems.length}`)
  console.log(`📋 Total stock movements: ${store.stockMovements.length}`)
  console.log(`🚨 Active stock alerts: ${store.stockAlerts.length}`)
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Make test function available globally for browser testing
  (window as any).testInventorySystem = testInventorySystem
  console.log('🧪 Inventory test function available: testInventorySystem()')
}