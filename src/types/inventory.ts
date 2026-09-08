export interface InventoryItem {
  id: string
  sku: string // SKU/Code for inventory tracking
  name: string
  description: string
  category: 'engine_parts' | 'brakes' | 'suspension' | 'electrical' | 'body_parts' | 'fluids' | 'tools' | 'consumables' | 'safety_equipment' | 'other'
  quantity: number // Quantity in Stock
  unit: 'piece' | 'liter' | 'kg' | 'meter' | 'set' | 'box' | 'can' | 'bottle' | 'roll'
  minimumStock: number // Minimum Stock Level
  maximumStock: number // Maximum Stock Level
  reorderPoint: number // Reorder point
  
  // Location Management
  location: string // Primary storage location (rack/shelf)
  locationDetails?: {
    rack?: string
    shelf?: string
    bin?: string
    zone?: string
  }
  
  // Supplier Information
  supplierId: string
  supplierName?: string // Cached supplier name
  supplierSku?: string // Supplier's SKU/code
  supplierPartNumber?: string // Supplier part number
  
  // Pricing
  unitCost: number // Purchase Price (cost)
  sellingPrice: number // Sale Price
  taxRate: number // Tax Rate (percentage)
  markupPercentage?: number // Calculated markup
  
  // Product Details
  manufacturer: string
  manufacturerPartNumber?: string
  manufacturerWarrantyMonths?: number
  barcode?: string // Barcode for scanning
  imageUrl?: string
  
  // Dates and Tracking
  expiryDate?: string // For consumables with expiration
  lastRestocked?: string
  lastUsed?: string
  lastUpdated: string // Last Updated timestamp
  
  // Usage Analytics
  usageRate: number // Average usage per month
  leadTimeDays: number // Days to receive new stock
  monthsOfStock?: number // Estimated months of stock remaining
  
  // Status and Flags
  status: 'active' | 'discontinued' | 'out_of_stock' | 'low_stock' | 'overstock'
  isActive: boolean
  isTaxable: boolean
  isTrackable: boolean // Whether to track this item in detailed transactions
  
  // Audit Trail
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy?: string
  
  // Additional Fields
  notes?: string
  specifications?: string // Technical specifications
  compatibility?: string[] // Compatible vehicle models/parts
  safetyInfo?: string // Safety information for handling
  storageRequirements?: string // Special storage requirements
}

export interface Supplier {
  id: string
  _id?: string
  code?: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  city: string
  postcode?: string
  country: string
  
  // Payment terms
  paymentTerms: string // e.g., "Net 30", "COD"
  currency?: string
  taxId?: string
  
  // Performance
  rating: number // 1-5 stars
  reliability: number // Percentage of on-time deliveries
  averageLeadTime: number // Days
  minimumOrderValue: number
  
  // Status
  status?: 'active' | 'inactive' | 'suspended'
  isActive: boolean
  isPreferred: boolean
  
  // Additional fields
  website?: string
  deliveryTime?: number
  minimumOrder?: number
  notes?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
  
  // Order details
  items: PurchaseOrderItem[]
  subtotal: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  
  // Status and dates
  status: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled' | 'approved' | 'ordered' | 'pending'
  orderDate: string
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  expectedDate: string // For compatibility
  reference?: string // For compatibility
  
  // Payment
  paymentStatus: 'pending' | 'partially_paid' | 'paid' | 'overdue'
  paymentTerms: string
  
  // References
  referenceNumber?: string
  notes?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface PurchaseOrderItem {
  id: string
  itemId: string // For compatibility with components
  inventoryItemId: string
  itemName: string
  sku: string
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  totalCost: number
  
  // Receipt tracking
  receivedBatches: ReceivedBatch[]
  
  // Status
  status: 'pending' | 'partially_received' | 'received'
  name: string // For search functionality
}

export interface ReceivedBatch {
  id: string
  batchNumber?: string
  quantity: number
  unitCost: number
  receivedDate: string
  expiryDate?: string
  serialNumbers?: string[]
  qualityStatus: 'accepted' | 'rejected' | 'pending'
  notes?: string
  receivedBy: string
}

export interface StockMovement {
  id: string
  inventoryItemId: string
  itemName: string
  sku: string
  
  // Movement details
  type: 'in' | 'out' | 'adjustment' | 'transfer' | 'damage' | 'expired' | 'purchase' | 'sale' | 'return' | 'job_order' | 'stock_take' | 'receive' | 'issue' | 'initial-stock'
  quantity: number // Quantity changed (positive for in, negative for out)
  previousQuantity: number
  newQuantity: number
  
  // Reference tracking
  referenceType?: 'purchase_order' | 'job_order' | 'invoice' | 'adjustment' | 'transfer' | 'stock_take' | 'damage_report'
  reference?: string // For compatibility with components
  referenceId?: string // ID of the referenced document
  referenceNumber?: string // Human-readable reference number
  supplierId?: string
  jobOrderId?: string // Link to job orders for "where used" tracking
  
  // Location tracking for transfers
  fromLocation?: string
  toLocation?: string
  
  // Cost tracking
  unitCost?: number // Cost per unit at time of movement
  totalCost?: number // Total cost of movement
  sellingPrice?: number // Selling price for sales
  
  // Additional info
  reason: string // Reason for movement (required for audit)
  notes?: string
  batchNumber?: string // For tracking specific batches
  serialNumbers?: string[] // For serialized items
  
  // Audit trail
  movementDate: string // Date of the movement
  createdAt: string
  createdBy: string
  approvedBy?: string // For certain types of movements
  
  // Status tracking
  status: 'pending' | 'completed' | 'cancelled'
  isApproved: boolean
  
  // Job order specific fields for "where used" tracking
  customerName?: string
  quantityUsed?: number
  dateUsed?: string
  technicianName?: string
  jobOrderStatus?: string
}

export interface StockAlert {
  id: string
  inventoryItemId: string
  itemName: string
  sku: string
  
  // Alert details
  type: 'low_stock' | 'out_of_stock' | 'expiring' | 'overstock'
  severity: 'low' | 'medium' | 'high'
  message: string
  
  // Current status
  currentStock: number
  threshold: number
  
  // Status
  isRead: boolean
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  
  // Timestamps
  createdAt: string
  createdBy: string
}

export interface InventoryFormData {
  sku: string
  name: string
  description: string
  category: InventoryItem['category']
  quantity: number
  unit: InventoryItem['unit']
  unitCost: number
  sellingPrice: number
  taxRate: number
  minimumStock: number
  maximumStock: number
  reorderPoint: number
  
  // Location
  location: string
  locationDetails?: {
    rack?: string
    shelf?: string
    bin?: string
    zone?: string
  }
  
  supplierId: string
  supplierSku?: string
  supplierPartNumber?: string
  manufacturer?: string
  manufacturerPartNumber?: string
  manufacturerWarrantyMonths?: number
  
  // Dates
  expiryDate?: string
  leadTimeDays?: number
  
  // Identification
  barcode?: string
  
  // Flags
  isTaxable: boolean
  isTrackable: boolean
  
  // Additional info
  notes?: string
  specifications?: string
  compatibility?: string[]
  safetyInfo?: string
  storageRequirements?: string
}

export interface SupplierFormData {
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  city: string
  postcode: string
  country: string
  paymentTerms: string
  currency?: string
  taxId?: string
  minimumOrderValue?: number
  website?: string
  deliveryTime: number
  minimumOrder: number
  status: 'active' | 'inactive' | 'suspended'
  notes?: string
  state?: string
  zipCode?: string
}

export interface PurchaseOrderFormData {
  supplierId: string
  expectedDeliveryDate?: string
  referenceNumber?: string
  notes?: string
  items: {
    inventoryItemId: string
    itemName?: string
    sku?: string
    quantity: number
    unitCost: number
  }[]
}

export interface StockOperationFormData {
  operationType: 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'damage' | 'expired' | 'stock_take'
  
  // Single or multiple items
  items: {
    inventoryItemId: string
    sku: string
    itemName: string
    quantity: number // Positive for stock_in, negative for stock_out
    unitCost?: number
    unitPrice?: number
    fromLocation?: string
    toLocation?: string
    batchNumber?: string
    serialNumbers?: string[]
    expiryDate?: string
    notes?: string
  }[]
  
  // Operation details
  referenceType?: 'purchase_order' | 'job_order' | 'invoice' | 'adjustment' | 'transfer' | 'stock_take' | 'damage_report'
  referenceId?: string
  referenceNumber?: string
  
  // Location (for single location operations)
  location?: string
  fromLocation?: string // For transfers
  toLocation?: string // For transfers
  
  // Reason and approval
  reason: string // Required for audit trail
  notes?: string
  requiresApproval?: boolean
  approvedBy?: string
  
  // Dates
  operationDate?: string // Defaults to now if not specified
  
  // Additional info
  batchNumber?: string
  supplierId?: string
  jobOrderId?: string // For "where used" tracking
}

export interface StockTransferFormData {
  fromLocation: string
  toLocation: string
  
  items: {
    inventoryItemId: string
    quantity: number
    unitCost?: number
    notes?: string
  }[]
  
  reason: string
  referenceNumber?: string
  notes?: string
  requestedDate?: string
  
  // Approval
  requiresApproval?: boolean
  approvedBy?: string
}

export interface BarcodeScanData {
  barcode: string
  format: string
  action: 'lookup' | 'receive' | 'issue' | 'transfer' | 'adjust' | 'audit'
  quantity?: number
  location?: string
  reference?: string
  notes?: string
}

export interface InventoryFilter {
  searchTerm?: string
  category?: string[]
  supplier?: string[]
  location?: string[]
  status?: InventoryStatus[]
  stockLevel?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock'
  dateRange?: {
    from: string
    to: string
  }
  priceRange?: {
    min: number
    max: number
  }
  quantityRange?: {
    min: number
    max: number
  }
}

export interface InventorySort {
  field: 'sku' | 'name' | 'category' | 'quantity' | 'unitCost' | 'sellingPrice' | 'supplier' | 'location' | 'lastUpdated' | 'status'
  direction: 'asc' | 'desc'
}

export interface InventoryStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  expiringItems: number
  activeSuppliers: number
  pendingOrders: number
  overdueOrders: number
}

export interface InventoryReport {
  date: string
  totalItems: number
  totalValue: number
  itemsAdded: number
  itemsRemoved: number
  stockMovements: number
  purchaseOrders: number
  receivedShipments: number
}

export interface InventoryLocation {
  id: string
  code: string // Location code (e.g., "A-01-01")
  name: string // Location name (e.g., "Rack A, Shelf 1, Bin 1")
  type: 'rack' | 'shelf' | 'bin' | 'zone' | 'room'
  parentLocationId?: string // For hierarchical locations
  
  // Physical details
  dimensions?: {
    length: number
    width: number
    height: number
    unit: 'cm' | 'inch' | 'meter'
  }
  capacity?: number // Maximum number of items
  weightLimit?: number // Maximum weight capacity
  
  // Status
  isActive: boolean
  isRestricted: boolean // Requires special access
  
  // Organization
  zone?: string // Warehouse zone
  aisle?: string // Aisle identifier
  row?: string // Row identifier
  
  // Audit trail
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface StockTransfer {
  id: string
  transferNumber: string // Auto-generated transfer number
  
  // Items being transferred
  items: {
    inventoryItemId: string
    sku: string
    itemName: string
    quantity: number
    fromLocation: string
    toLocation: string
    unitCost?: number
    notes?: string
  }[]
  
  // Locations
  fromLocation: string
  toLocation: string
  fromLocationDetails?: InventoryLocation
  toLocationDetails?: InventoryLocation
  
  // Status tracking
  status: 'draft' | 'pending' | 'in_transit' | 'completed' | 'cancelled'
  requestedDate: string
  completedDate?: string
  
  // Personnel
  requestedBy: string
  approvedBy?: string
  transferredBy?: string
  receivedBy?: string
  
  // Reason and notes
  reason: string
  notes?: string
  
  // References
  referenceNumber?: string
  relatedDocuments?: string[] // IDs of related documents
  
  // Timestamps
  createdAt: string
  updatedAt: string
}

export interface InventoryAudit {
  id: string
  auditNumber: string
  title: string
  
  // Scope
  type: 'full' | 'cycle' | 'spot' | 'category' | 'location'
  scope?: {
    categories?: string[]
    locations?: string[]
    items?: string[] // Specific item IDs
  }
  
  // Status
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  startDate: string
  endDate?: string
  
  // Personnel
  assignedTo: string[]
  createdBy: string
  reviewedBy?: string
  approvedBy?: string
  
  // Results
  itemsCounted: number
  itemsDiscrepancy: number
  totalVariance: number // Financial impact
  accuracyPercentage: number
  
  // Findings
  findings?: {
    itemId: string
    sku: string
    itemName: string
    systemQuantity: number
    actualQuantity: number
    variance: number
    unitCost: number
    varianceValue: number
    reason?: string
    action?: string
  }[]
  
  // Notes and attachments
  notes?: string
  attachments?: string[] // File URLs
  
  // Timestamps
  createdAt: string
  updatedAt: string
}

export interface BarcodeData {
  barcode: string
  format: 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE' | 'CODE39' | 'CODE128' | 'QR' | 'DATAMATRIX'
  itemId?: string
  itemName?: string
  sku?: string
  
  // Scan details
  scanDate: string
  scanLocation?: string
  scannedBy: string
  
  // Device info
  deviceInfo?: {
    type: 'scanner' | 'mobile' | 'tablet'
    model?: string
    os?: string
  }
  
  // Result
  action: 'lookup' | 'receive' | 'issue' | 'transfer' | 'adjust' | 'audit'
  success: boolean
  error?: string
  
  // Additional data
  quantity?: number
  location?: string
  reference?: string
}

// Type aliases for compatibility
export type InventoryStatus = InventoryItem['status']
export type PurchaseOrderStatus = PurchaseOrder['status']
export type StockMovementType = StockMovement['type']

// Additional interfaces for missing types
export interface WhereUsedItem {
  jobOrderId: string
  customerName: string
  quantityUsed: number
  dateUsed: string
  technicianName: string
  jobOrderStatus: string
}
// Type aliases are not needed for interfaces that already exist

// Return Order Management
export interface ReturnOrder {
  id: string
  returnNumber: string // Auto-generated return number (e.g., RET-2024-001)
  
  // Basic information
  returnDate: string
  supplierId: string
  supplierName: string
  supplierContact?: string
  
  // Related documents
  purchaseOrderId?: string // Reference to original PO
  purchaseOrderNumber?: string
  supplierInvoiceId?: string // Reference to supplier invoice
  supplierInvoiceNumber?: string
  deliveryNoteId?: string // Reference to delivery note (Bon de Livraison)
  deliveryNoteNumber?: string
  
  // Items being returned
  items: ReturnOrderItem[]
  
  // Financial details
  subtotal: number
  taxAmount: number
  totalAmount: number
  
  // Return details
  returnReason: 'defective' | 'damaged' | 'wrong_item' | 'excess_inventory' | 'expired' | 'quality_issue' | 'incorrect_order' | 'other'
  returnReasonDetails?: string // Detailed explanation
  returnMethod: 'pickup' | 'drop_off' | 'mail' | 'courier'
  
  // Status tracking
  status: 'requested' | 'approved' | 'processed' | 'cancelled' | 'completed' | 'rejected'
  
  // Processing details
  approvedBy?: string
  processedBy?: string
  processedDate?: string
  completedDate?: string
  
  // Shipping and tracking
  trackingNumber?: string
  carrier?: string
  shippingCost?: number
  
  // Documents and attachments
  documents?: ReturnDocument[]
  
  // Notes and communication
  notes?: string
  supplierResponse?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ReturnOrderItem {
  id: string
  inventoryItemId: string
  itemName: string
  sku: string
  
  // Return details
  quantityReturned: number
  maxQuantity?: number
  quantityApproved?: number // May be different from requested
  unitCost: number
  totalCost: number
  
  // Item condition
  condition: 'new' | 'used' | 'damaged' | 'defective'
  conditionNotes?: string
  
  // Processing
  status: 'pending' | 'approved' | 'rejected' | 'processed'
  rejectionReason?: string
  
  // References
  originalPurchaseOrderItemId?: string
  batchNumber?: string
  serialNumbers?: string[]
  
  // Additional info
  notes?: string
  images?: string[] // URLs to images of returned items
}

export interface ReturnDocument {
  id: string
  name: string
  type: 'return_authorization' | 'shipping_label' | 'supplier_confirmation' | 'inspection_report' | 'image' | 'other'
  url: string
  size: number
  mimeType: string
  uploadedAt: string
  uploadedBy: string
}

export interface ReturnOrderFormData {
  supplierId: string
  purchaseOrderId?: string
  supplierInvoiceId?: string
  deliveryNoteId?: string
  deliveryNoteNumber?: string
  returnReason: ReturnOrder['returnReason']
  returnReasonDetails?: string
  returnMethod: ReturnOrder['returnMethod']
  expectedDate?: string
  notes?: string
  items: {
    inventoryItemId: string
    quantityReturned: number
    condition: ReturnOrderItem['condition']
    conditionNotes?: string
    notes?: string
  }[]
}

// Supplier Invoice Management
export interface SupplierInvoice {
  id: string
  invoiceNumber: string // Supplier's invoice number
  
  // Supplier information
  supplierId: string
  supplierName: string
  supplierContact?: string
  supplierAddress?: string
  
  // Invoice details
  invoiceDate: string
  dueDate: string
  
  // Related documents
  purchaseOrderIds: string[] // Multiple POs can be on one invoice
  purchaseOrderNumbers: string[]
  returnOrderIds?: string[] // For credit notes
  returnOrderNumbers?: string[]
  
  // Items and pricing
  items: SupplierInvoiceItem[]
  subtotal: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  
  // Currency
  currency: string // ISO currency code (e.g., 'USD', 'EUR')
  
  // Payment tracking
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'
  paidAmount: number
  remainingAmount: number
  
  // Payment details
  paymentTerms: string // e.g., "Net 30", "2/10 Net 30"
  paymentMethod?: string
  payments: InvoicePayment[]
  
  // Status and tracking
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'disputed'
  
  // Documents
  documents?: InvoiceDocument[]
  
  // Notes and communication
  notes?: string
  supplierNotes?: string
  internalNotes?: string
  
  // Approval workflow
  approvedBy?: string
  approvedDate?: string
  
  // Dispute handling
  isDisputed?: boolean
  disputeReason?: string
  disputeDate?: string
  disputeResolvedDate?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface SupplierInvoiceItem {
  id: string
  inventoryItemId: string
  itemName: string
  sku: string
  
  // Invoice details
  quantity: number
  unitPrice: number
  totalPrice: number
  
  // Tax information
  taxRate: number
  taxAmount: number
  
  // References
  purchaseOrderItemId?: string
  purchaseOrderNumber?: string
  
  // Additional info
  description?: string
  unit?: string
  
  // Validation
  matchedWithPO: boolean // Indicates if this matches a PO item
  variance?: number // Price variance from PO
}

export interface InvoicePayment {
  id: string
  paymentDate: string
  amount: number
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'other'
  referenceNumber?: string // Check number, transaction ID, etc.
  notes?: string
  
  // Bank details
  bankAccount?: string
  transactionId?: string
  
  // Status
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  
  // Timestamps
  createdAt: string
  createdBy: string
}

export interface InvoiceDocument {
  id: string
  name: string
  type: 'invoice' | 'credit_note' | 'receipt' | 'payment_confirmation' | 'other'
  url: string
  size: number
  mimeType: string
  uploadedAt: string
  uploadedBy: string
}

export interface SupplierInvoiceFormData {
  supplierId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  purchaseOrderIds: string[]
  returnOrderIds?: string[]
  currency?: string
  paymentTerms: string
  notes?: string
  items: {
    inventoryItemId: string
    quantity: number
    unitPrice: number
    taxRate: number
    description?: string
    deliveryNoteId?: string
    deliveryNoteNumber?: string
  }[]
  shippingCost?: number
  taxAmount?: number
  subtotal?: number
  totalAmount?: number
}

// Type aliases for new types
export type ReturnOrderStatus = ReturnOrder['status']
export type ReturnReason = ReturnOrder['returnReason']
export type InvoiceStatus = SupplierInvoice['status']
export type InvoicePaymentStatus = SupplierInvoice['paymentStatus']
export type DeliveryNoteStatus = SupplierDeliveryNote['status']

// Form data interfaces
export interface SupplierDeliveryNoteFormData {
  supplierId: string
  purchaseOrderId?: string
  deliveryDate: string
  notes?: string
  items: {
    purchaseOrderItemId?: string
    itemReference: string
    itemName: string
    quantityDelivered: number
    quantityAccepted: number
    unitPriceHt: number
    notes?: string
  }[]
}

export interface SupplierDeliveryNoteFilter {
  searchTerm?: string
  supplierId?: string
  purchaseOrderId?: string
  status?: DeliveryNoteStatus[]
  dateRange?: {
    from: string
    to: string
  }
  deliveryDateFrom?: string
  deliveryDateTo?: string
}

// Supplier Delivery Note Management (Bon de Livraison Fournisseur)
export interface SupplierDeliveryNote {
  id: string
  deliveryNoteNumber: string
  supplierId: string
  supplierName: string
  purchaseOrderId?: string
  purchaseOrderNumber?: string
  
  deliveryDate: string
  status: 'draft' | 'validated' | 'invoiced' | 'cancelled'
  
  totalAmountHt: number
  totalAmountTtc: number
  tvaRate: number
  
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  validatedAt?: string
  validatedBy?: string
  
  // Related data
  items?: SupplierDeliveryNoteItem[]
  supplier?: Supplier
  purchaseOrder?: PurchaseOrder
}

export interface SupplierDeliveryNoteItem {
  id: string
  deliveryNoteId: string
  purchaseOrderItemId?: string
  itemReference: string
  itemName: string
  quantityDelivered: number
  quantityAccepted: number
  unitPriceHt: number
  totalPriceHt: number
  notes?: string
  createdAt: string
  updatedAt: string
  
  // Related data
  purchaseOrderItem?: PurchaseOrderItem
}

import type { Invoice } from './estimate'

export interface DeliveryNoteInvoice {
  id: string
  deliveryNoteId: string
  invoiceId: string
  allocatedAmountHt: number
  allocatedAmountTtc: number
  createdAt: string
  
  // Related data
  deliveryNote?: SupplierDeliveryNote
  invoice?: Invoice
}

// Legacy interfaces for compatibility
export interface DeliveryNote {
  id: string
  supplierId: string
  supplierName: string
  purchaseOrderId?: string
  purchaseOrderNumber?: string
  
  blNumber: string
  date: string
  status: 'draft' | 'validated' | 'invoiced' | 'cancelled'
  
  lines: DeliveryNoteLine[]
  
  totalHt: number
  totalTtc: number
  taxAmount: number
  currency: string
  
  // File attachment (optional)
  documentPath?: string
  originalFilename?: string
  
  // Links
  invoiceId?: string
  invoiceNumber?: string
  
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface DeliveryNoteLine {
  id: string
  articleId: string // Inventory Item ID
  sku: string
  description: string
  quantityReceived: number
  unitPriceHt: number
  taxRate: number
  totalHt: number
}
