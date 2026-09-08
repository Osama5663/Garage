import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvoiceValidator } from '../invoiceValidation';
import { InvoiceGenerationService } from '../invoiceGenerationService';
import { SupplierInvoiceFormData, SupplierInvoice, InvoiceItem } from '../../types';

// Mock the inventory store
const mockInventoryStore = {
  supplierInvoices: {},
  inventoryItems: [],
  addSupplierInvoice: vi.fn(),
  getSupplierInvoice: vi.fn()
};

describe('InvoiceValidator', () => {
  const validInvoiceData: SupplierInvoiceFormData = {
    supplierId: 'supplier-123',
    invoiceNumber: 'INV-001',
    invoiceDate: '2024-01-15',
    dueDate: '2024-02-15',
    items: [
      {
        inventoryItemId: 'item-1',
        itemName: 'Test Item',
        sku: 'SKU001',
        quantity: 5,
        unitPrice: 100,
        total: 500
      }
    ],
    subtotal: 500,
    taxAmount: 50,
    discountAmount: 0,
    total: 550,
    status: 'pending',
    paymentStatus: 'pending',
    notes: 'Test invoice'
  };

  describe('validateInvoiceData', () => {
    it('should validate a complete invoice successfully', () => {
      const result = InvoiceValidator.validateInvoiceData(validInvoiceData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(result.dataHash).toBeDefined();
    });

    it('should detect missing supplier ID', () => {
      const invalidData = { ...validInvoiceData, supplierId: '' };
      const result = InvoiceValidator.validateInvoiceData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'supplierId',
          message: 'Supplier ID is required',
          severity: 'error',
          code: 'SUPPLIER_REQUIRED'
        })
      );
    });

    it('should detect missing invoice number', () => {
      const invalidData = { ...validInvoiceData, invoiceNumber: '' };
      const result = InvoiceValidator.validateInvoiceData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'invoiceNumber',
          message: 'Invoice number is required',
          severity: 'error',
          code: 'INVOICE_NUMBER_REQUIRED'
        })
      );
    });

    it('should detect invalid date range', () => {
      const invalidData = { 
        ...validInvoiceData, 
        invoiceDate: '2024-02-15',
        dueDate: '2024-01-15'
      };
      const result = InvoiceValidator.validateInvoiceData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'dueDate',
          message: 'Due date cannot be before invoice date',
          severity: 'error',
          code: 'INVALID_DATE_RANGE'
        })
      );
    });

    it('should detect missing items', () => {
      const invalidData = { ...validInvoiceData, items: [] };
      const result = InvoiceValidator.validateInvoiceData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'items',
          message: 'At least one item is required',
          severity: 'error',
          code: 'ITEMS_REQUIRED'
        })
      );
    });

    it('should detect total calculation mismatch', () => {
      const invalidData = { ...validInvoiceData, total: 999 }; // Incorrect total
      const result = InvoiceValidator.validateInvoiceData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'total',
          message: expect.stringContaining('Total mismatch'),
          severity: 'error',
          code: 'TOTAL_MISMATCH'
        })
      );
    });

    it('should warn about subtotal mismatch', () => {
      const dataWithSubtotalMismatch = { ...validInvoiceData, subtotal: 999 }; // Incorrect subtotal
      const result = InvoiceValidator.validateInvoiceData(dataWithSubtotalMismatch);
      
      expect(result.isValid).toBe(true); // Still valid, just warning
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'subtotal',
          message: expect.stringContaining('Subtotal mismatch'),
          severity: 'warning',
          code: 'SUBTOTAL_MISMATCH'
        })
      );
    });
  });

  describe('validateInvoiceItem', () => {
    const validItem: InvoiceItem = {
      inventoryItemId: 'item-1',
      itemName: 'Test Item',
      sku: 'SKU001',
      quantity: 5,
      unitPrice: 100,
      total: 500
    };

    it('should validate a complete item successfully', () => {
      const result = InvoiceValidator.validateInvoiceItem(validItem);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should detect missing inventory item ID', () => {
      const invalidItem = { ...validItem, inventoryItemId: '' };
      const result = InvoiceValidator.validateInvoiceItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'inventoryItemId',
          message: 'Inventory item ID is required',
          severity: 'error',
          code: 'INVENTORY_ITEM_REQUIRED'
        })
      );
    });

    it('should detect invalid quantity', () => {
      const invalidItem = { ...validItem, quantity: 0 };
      const result = InvoiceValidator.validateInvoiceItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'quantity',
          message: 'Quantity must be greater than 0',
          severity: 'error',
          code: 'INVALID_QUANTITY'
        })
      );
    });

    it('should detect negative unit price', () => {
      const invalidItem = { ...validItem, unitPrice: -10 };
      const result = InvoiceValidator.validateInvoiceItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'unitPrice',
          message: 'Unit price cannot be negative',
          severity: 'error',
          code: 'NEGATIVE_PRICE'
        })
      );
    });

    it('should warn about zero unit price', () => {
      const itemWithZeroPrice = { ...validItem, unitPrice: 0, total: 0 };
      const result = InvoiceValidator.validateInvoiceItem(itemWithZeroPrice);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'unitPrice',
          message: 'Unit price is 0',
          severity: 'warning',
          code: 'ZERO_PRICE'
        })
      );
    });
  });

  describe('validateExistingInvoice', () => {
    const validInvoice: SupplierInvoice = {
      id: 'inv-123',
      supplierId: 'supplier-123',
      invoiceNumber: 'INV-001',
      invoiceDate: '2024-01-15',
      dueDate: '2024-02-15',
      items: [
        {
          id: 'item-1',
          inventoryItemId: 'inv-item-1',
          itemName: 'Test Item',
          sku: 'SKU001',
          quantity: 5,
          unitPrice: 100,
          total: 500
        }
      ],
      subtotal: 500,
      taxAmount: 50,
      discountAmount: 0,
      total: 550,
      status: 'pending',
      paymentStatus: 'pending',
      notes: 'Test invoice',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    };

    it('should validate an existing invoice successfully', () => {
      const result = InvoiceValidator.validateExistingInvoice(validInvoice);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing invoice ID', () => {
      const invalidInvoice = { ...validInvoice, id: '' };
      const result = InvoiceValidator.validateExistingInvoice(invalidInvoice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'id',
          message: 'Invoice ID is missing',
          severity: 'error',
          code: 'MISSING_INVOICE_ID'
        })
      );
    });

    it('should detect invalid status', () => {
      const invalidInvoice = { ...validInvoice, status: 'invalid-status' as any };
      const result = InvoiceValidator.validateExistingInvoice(invalidInvoice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'status',
          message: 'Invalid status: invalid-status',
          severity: 'error',
          code: 'INVALID_STATUS'
        })
      );
    });

    it('should warn about payment status inconsistency', () => {
      const inconsistentInvoice = { ...validInvoice, status: 'paid' as any, paymentStatus: 'pending' as any };
      const result = InvoiceValidator.validateExistingInvoice(inconsistentInvoice);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'paymentStatus',
          message: 'Payment status should be "paid" when invoice status is "paid"',
          severity: 'warning',
          code: 'PAYMENT_STATUS_INCONSISTENT'
        })
      );
    });
  });
});

describe('InvoiceGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the service's internal state
    (InvoiceGenerationService as any).logs = [];
    (InvoiceGenerationService as any).performanceMetrics = [];
  });

  describe('createInvoice', () => {
    const validInvoiceData: SupplierInvoiceFormData = {
      supplierId: 'supplier-123',
      invoiceNumber: 'INV-001',
      invoiceDate: '2024-01-15',
      dueDate: '2024-02-15',
      items: [
        {
          inventoryItemId: 'item-1',
          itemName: 'Test Item',
          sku: 'SKU001',
          quantity: 5,
          unitPrice: 100,
          total: 500
        }
      ],
      subtotal: 500,
      taxAmount: 50,
      discountAmount: 0,
      total: 550,
      status: 'pending',
      paymentStatus: 'pending',
      notes: 'Test invoice'
    };

    it('should create a valid invoice successfully', async () => {
      mockInventoryStore.addSupplierInvoice.mockResolvedValue(undefined);
      
      const result = await InvoiceGenerationService.createInvoice(validInvoiceData, mockInventoryStore);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBeDefined();
      expect(result.data?.invoiceNumber).toBe('INV-001');
      expect(result.validationResult?.isValid).toBe(true);
      expect(result.operationId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should fail validation for invalid invoice data', async () => {
      const invalidData = { ...validInvoiceData, supplierId: '' };
      
      const result = await InvoiceGenerationService.createInvoice(invalidData, mockInventoryStore);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_FAILED');
      expect(result.validationResult?.isValid).toBe(false);
    });

    it('should handle storage failures', async () => {
      mockInventoryStore.addSupplierInvoice.mockRejectedValue(new Error('Storage failed'));
      
      const result = await InvoiceGenerationService.createInvoice(validInvoiceData, mockInventoryStore);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_FAILED');
    });

    it('should log operations and metrics', async () => {
      mockInventoryStore.addSupplierInvoice.mockResolvedValue(undefined);
      
      const result = await InvoiceGenerationService.createInvoice(validInvoiceData, mockInventoryStore);
      
      // Verify the operation was successful first
      expect(result.success).toBe(true);
      
      // Then check the logs
      const logs = InvoiceGenerationService.getGenerationLogs(10);
      const metrics = InvoiceGenerationService.getPerformanceMetrics(10);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(metrics.length).toBeGreaterThan(0);
      
      // Check that we have both started and success logs
      const createLogs = logs.filter(log => log.operationType === 'create');
      expect(createLogs.length).toBeGreaterThan(0);
      
      // Should have at least a success log
      const successLog = createLogs.find(log => log.status === 'success');
      expect(successLog).toBeDefined();
      
      // Should have metrics for the successful operation
      const createMetrics = metrics.filter(m => m.operationType === 'create' && m.success);
      expect(createMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('getInvoiceDisplayStatus', () => {
    const mockInvoice: SupplierInvoice = {
      id: 'inv-123',
      supplierId: 'supplier-123',
      invoiceNumber: 'INV-001',
      invoiceDate: '2024-01-15',
      dueDate: '2024-02-15',
      items: [
        {
          id: 'item-1',
          inventoryItemId: 'inv-item-1',
          itemName: 'Test Item',
          sku: 'SKU001',
          quantity: 5,
          unitPrice: 100,
          total: 500
        }
      ],
      subtotal: 500,
      taxAmount: 50,
      discountAmount: 0,
      total: 550,
      status: 'pending',
      paymentStatus: 'pending',
      notes: 'Test invoice',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    };

    it('should return display status for existing invoice', async () => {
      // Mock the invoice retrieval
      const mockStoreWithInvoice = {
        ...mockInventoryStore,
        supplierInvoices: { 'inv-123': mockInvoice }
      };
      
      const result = await InvoiceGenerationService.getInvoiceDisplayStatus('inv-123', mockStoreWithInvoice);
      
      expect(result.canDisplay).toBe(true);
      expect(result.invoiceId).toBe('inv-123');
      expect(result.operationId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should return error for non-existent invoice', async () => {
      const result = await InvoiceGenerationService.getInvoiceDisplayStatus('non-existent', mockInventoryStore);
      
      expect(result.canDisplay).toBe(false);
      expect(result.error?.code).toBe('INVOICE_NOT_FOUND');
    });
  });

  describe('getMonitoringStats', () => {
    it('should return comprehensive statistics', async () => {
      // Create some test operations
      mockInventoryStore.addSupplierInvoice.mockResolvedValue(undefined);
      
      await InvoiceGenerationService.createInvoice({
        supplierId: 'supplier-1',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        items: [{
          inventoryItemId: 'item-1',
          itemName: 'Test Item',
          sku: 'SKU001',
          quantity: 1,
          unitPrice: 100,
          total: 100
        }],
        subtotal: 100,
        taxAmount: 0,
        discountAmount: 0,
        total: 100,
        status: 'pending',
        paymentStatus: 'pending'
      }, mockInventoryStore);
      
      const stats = InvoiceGenerationService.getMonitoringStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalOperations).toBeGreaterThan(0);
      expect(stats.successfulOperations).toBeGreaterThanOrEqual(0);
      expect(stats.failedOperations).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
      expect(stats.operationTypeStats).toBeDefined();
    });
  });

  describe('getGenerationLogs', () => {
    it('should return recent logs with limit', async () => {
      mockInventoryStore.addSupplierInvoice.mockResolvedValue(undefined);
      
      await InvoiceGenerationService.createInvoice({
        supplierId: 'supplier-1',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        items: [{
          inventoryItemId: 'item-1',
          itemName: 'Test Item',
          sku: 'SKU001',
          quantity: 1,
          unitPrice: 100,
          total: 100
        }],
        subtotal: 100,
        taxAmount: 0,
        discountAmount: 0,
        total: 100,
        status: 'pending',
        paymentStatus: 'pending'
      }, mockInventoryStore);
      
      const logs = InvoiceGenerationService.getGenerationLogs(5);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.length).toBeLessThanOrEqual(5);
      expect(logs[0]).toHaveProperty('id');
      expect(logs[0]).toHaveProperty('operationType');
      expect(logs[0]).toHaveProperty('status');
      expect(logs[0]).toHaveProperty('timestamp');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return recent performance metrics with limit', async () => {
      mockInventoryStore.addSupplierInvoice.mockResolvedValue(undefined);
      
      await InvoiceGenerationService.createInvoice({
        supplierId: 'supplier-1',
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        items: [{
          inventoryItemId: 'item-1',
          itemName: 'Test Item',
          sku: 'SKU001',
          quantity: 1,
          unitPrice: 100,
          total: 100
        }],
        subtotal: 100,
        taxAmount: 0,
        discountAmount: 0,
        total: 100,
        status: 'pending',
        paymentStatus: 'pending'
      }, mockInventoryStore);
      
      const metrics = InvoiceGenerationService.getPerformanceMetrics(5);
      
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.length).toBeLessThanOrEqual(5);
      expect(metrics[0]).toHaveProperty('operationType');
      expect(metrics[0]).toHaveProperty('duration');
      expect(metrics[0]).toHaveProperty('success');
      expect(metrics[0]).toHaveProperty('timestamp');
    });
  });
});
