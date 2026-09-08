# Zustand Persistence Implementation Guide

## Overview
This document outlines the Zustand persistence implementation across all stores in the garage management application, including limitations, edge cases, and best practices.

## Implemented Stores

### 1. Customer Store (`src/stores/customerStore.ts`)
- **Storage Key**: `garage-customers-storage`
- **Persisted Data**: customers array
- **Excluded Data**: searchTerm, selectedCustomer, isLoading (temporary UI state)
- **Validation**: Comprehensive customer data validation with fallback to empty array
- **Version**: 1 (with migration support)

### 2. Inventory Store (`src/stores/inventoryStore.ts`)
- **Storage Key**: `garage-inventory-storage`
- **Persisted Data**: inventoryItems, suppliers, purchaseOrders, stockAlerts, locations, stockTransfers
- **Truncated Data**: stockMovements (last 1000), audits (last 100)
- **Validation**: Full inventory data validation with type checking
- **Version**: 1 (with migration support)

### 3. Estimate/Invoice Store (`src/stores/estimateStore.ts`)
- **Storage Key**: `garage-estimates-storage`
- **Persisted Data**: estimates, invoices, currentEstimate, currentInvoice, printSettings
- **Excluded Data**: searchTerm, selectedEstimate, selectedInvoice, isLoading
- **Validation**: Basic validation for estimates and invoices
- **Version**: 1

### 4. Job Order Store (`src/stores/jobOrderStore.ts`)
- **Storage Key**: `garage-job-orders-storage`
- **Persisted Data**: jobOrders, currentJobOrder, jobDescriptions, vehicleRepairs
- **Excluded Data**: searchTerm, selectedJobOrder, isLoading
- **Validation**: Job order and description validation
- **Version**: 1

### 5. Delivery Note Store (`src/stores/deliveryNoteStore.ts`)
- **Storage Key**: `delivery-note-storage`
- **Persisted Data**: deliveryNotes, currentDeliveryNote, printSettings
- **Excluded Data**: searchTerm, selectedDeliveryNote, isLoading
- **Validation**: Basic delivery note validation
- **Version**: 1

### 6. Job Description Store (`src/stores/jobDescriptionStore.ts`)
- **Storage Key**: `garage-job-descriptions-storage`
- **Persisted Data**: jobDescriptions array
- **Validation**: Job description data validation
- **Version**: 1

### 7. Vehicle Repair Store (`src/stores/vehicleRepairStore.ts`)
- **Storage Key**: `garage-vehicle-repairs-storage`
- **Persisted Data**: vehicleRepairs array
- **Validation**: Vehicle repair data validation
- **Version**: 1

### 8. Auth Store (`src/stores/authStore.ts`)
- **Storage Key**: `garage-auth-storage`
- **Persisted Data**: user, permissions, settings
- **Validation**: User and permissions validation
- **Version**: 1

### 9. Settings Store (`src/stores/settingsStore.ts`)
- **Storage Key**: `garage-settings-storage`
- **Persisted Data**: All settings (company info, preferences, notifications)
- **Validation**: Settings structure validation
- **Version**: 1

## Limitations

### 1. Browser Storage Quotas
- **LocalStorage Limit**: ~5-10MB per domain (varies by browser)
- **Impact**: Large datasets (especially inventory with many items) may exceed limits
- **Mitigation**: 
  - Data truncation for large arrays (stockMovements, audits)
  - Selective persistence (exclude temporary UI state)
  - Regular data cleanup

### 2. Data Serialization
- **JSON Limitations**: Functions, undefined, circular references cannot be serialized
- **Date Objects**: Automatically converted to ISO strings
- **Impact**: Complex objects may lose functionality
- **Mitigation**: Store only serializable data, reconstruct objects on load

### 3. Storage Availability
- **Private Browsing**: Some browsers block localStorage in private/incognito mode
- **User Settings**: Users can disable localStorage
- **Impact**: Data persistence fails silently
- **Mitigation**: Always implement fallback behavior

### 4. Cross-Tab Synchronization
- **Storage Events**: Changes in one tab don't automatically update other tabs
- **Impact**: Data inconsistency across multiple tabs
- **Mitigation**: Implement storage event listeners for critical data

### 5. Performance Impact
- **Large Datasets**: Initial load time increases with data size
- **Frequent Updates**: Continuous writes can impact performance
- **Impact**: UI responsiveness degradation
- **Mitigation**: 
  - Debounce storage updates
  - Implement data pagination
  - Use selective persistence

## Edge Cases

### 1. Data Corruption
```typescript
// Example: Handle corrupted storage data
onRehydrateStorage: () => (state) => {
  try {
    if (state?.customers) {
      state.customers = validateCustomerData(state.customers)
    }
  } catch (error) {
    console.error('Data corruption detected, resetting store')
    // Reset to initial state
    state.customers = []
  }
}
```

### 2. Storage Quota Exceeded
```typescript
// Example: Handle quota exceeded errors
try {
  localStorage.setItem('test', 'data')
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.warn('Storage quota exceeded, implementing cleanup')
    // Implement cleanup strategy
    cleanupOldData()
  }
}
```

### 3. Version Migrations
```typescript
// Example: Handle store version migrations
migrate: (persistedState, version) => {
  if (version === 0) {
    // Migrate from version 0 to 1
    return {
      ...persistedState,
      newField: defaultValue
    }
  }
  return persistedState
}
```

### 4. Browser Compatibility
- **Safari**: Stricter localStorage limits in private mode
- **Firefox**: May prompt users for storage permissions
- **Chrome**: Generally most permissive but has enterprise policies
- **Mobile Browsers**: More aggressive storage clearing

## Best Practices

### 1. Data Validation
Always validate persisted data on rehydration:
```typescript
const validateCustomerData = (data: any[]): Customer[] => {
  if (!Array.isArray(data)) return []
  
  return data.filter(customer => 
    customer && 
    typeof customer.id === 'string' &&
    typeof customer.name === 'string' &&
    customer.name.trim().length > 0
  ).map(customer => ({
    ...customer,
    // Ensure all required fields exist
    id: customer.id || generateId(),
    name: customer.name?.trim() || 'Unknown Customer'
  }))
}
```

### 2. Selective Persistence
Only persist essential data:
```typescript
partialize: (state) => ({
  customers: state.customers,
  // Don't persist temporary UI state
  searchTerm: '',
  selectedCustomer: null,
  isLoading: false
})
```

### 3. Error Handling
Implement comprehensive error handling:
```typescript
onRehydrateStorage: () => (state) => {
  try {
    if (state?.inventoryItems) {
      const validated = validateInventoryData(state)
      Object.assign(state, validated)
    }
  } catch (error) {
    console.error('Failed to rehydrate inventory store:', error)
    // Reset to safe defaults
    state.inventoryItems = []
  }
}
```

### 4. Data Truncation
For large datasets, implement truncation:
```typescript
partialize: (state) => ({
  ...state,
  stockMovements: state.stockMovements.slice(-1000), // Keep last 1000
  audits: state.audits.slice(-100) // Keep last 100
})
```

## Testing Checklist

### 1. Basic Persistence
- [ ] Add new data and verify it persists after page refresh
- [ ] Modify existing data and verify changes persist
- [ ] Delete data and verify removal persists

### 2. Error Scenarios
- [ ] Test with corrupted localStorage data
- [ ] Test with storage quota exceeded
- [ ] Test in private/incognito mode
- [ ] Test with localStorage disabled

### 3. Cross-Browser Testing
- [ ] Chrome (desktop and mobile)
- [ ] Firefox (desktop and mobile)
- [ ] Safari (desktop and mobile)
- [ ] Edge

### 4. Performance Testing
- [ ] Test with large datasets (1000+ items)
- [ ] Test frequent updates (rapid clicking)
- [ ] Test initial load time with substantial data

### 5. Migration Testing
- [ ] Test version upgrades with existing data
- [ ] Test downgrade scenarios
- [ ] Test with missing fields in persisted data

## Monitoring and Maintenance

### 1. Storage Usage Monitoring
```typescript
// Monitor storage usage
const checkStorageUsage = () => {
  const used = JSON.stringify(localStorage).length
  const limit = 5 * 1024 * 1024 // 5MB estimate
  const percentage = (used / limit) * 100
  
  if (percentage > 80) {
    console.warn(`Storage usage: ${percentage.toFixed(1)}%`)
    // Implement cleanup strategy
  }
}
```

### 2. Data Cleanup Strategies
- Implement automatic cleanup of old data
- Provide manual cleanup options in UI
- Archive old data to external storage if needed

### 3. Backup and Recovery
- Export functionality for critical data
- Import functionality for data recovery
- Regular data integrity checks

## Conclusion

The Zustand persistence implementation provides robust data persistence across all application stores while maintaining performance and reliability. By following these guidelines and best practices, the application ensures data consistency and prevents loss during page refreshes while handling edge cases gracefully.