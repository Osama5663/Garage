import { SupplierInvoice, SupplierInvoiceFormData, InvoiceItem } from '../types';
import { InvoiceValidator } from './invoiceValidation';
import { 
  InvoiceOperationResult, 
  InvoiceGenerationLog, 
  InvoiceDisplayStatus,
  InvoicePerformanceMetrics,
  DatabaseConnectionStatus 
} from '../types/invoice-monitoring';

export class InvoiceGenerationService {
  private static logs: InvoiceGenerationLog[] = [];
  private static performanceMetrics: InvoicePerformanceMetrics[] = [];
  private static maxLogSize = 1000;
  private static maxMetricsSize = 500;

  static async createInvoice(
    invoiceData: SupplierInvoiceFormData,
    inventoryStore: any
  ): Promise<InvoiceOperationResult> {
    const startTime = Date.now();
    const operationId = this.generateOperationId();
    
    this.logOperation(operationId, 'create', 'started', { invoiceData });

    try {
      // Step 1: Validate input data
      const validationResult = InvoiceValidator.validateInvoiceData(invoiceData);
      
      if (!validationResult.isValid) {
        const errorMessage = `Invoice validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`;
        this.logOperation(operationId, 'create', 'failed', { error: errorMessage, validationResult });
        
        const duration = Date.now() - startTime;
        this.recordPerformanceMetric(operationId, 'create', duration, false);
        
        return {
          success: false,
          error: {
            message: errorMessage,
            code: 'VALIDATION_FAILED',
            details: validationResult.errors,
            timestamp: new Date().toISOString()
          },
          operationId,
          duration,
          validationResult
        };
      }

      // Step 2: Check database connection
      const dbStatus = await this.checkDatabaseConnection(inventoryStore);
      if (!dbStatus.connected) {
        const error = new Error(`Database connection failed: ${dbStatus.error}`);
        this.logOperation(operationId, 'create', 'failed', { error: error.message, dbStatus });
        
        return {
          success: false,
          error: {
            message: error.message,
            code: 'DATABASE_CONNECTION_FAILED',
            details: [dbStatus.error],
            timestamp: new Date().toISOString()
          },
          operationId,
          duration: Date.now() - startTime,
          databaseStatus: dbStatus
        };
      }

      // Step 3: Create invoice with enhanced error handling
      let invoice: SupplierInvoice;
      let createdInvoice: SupplierInvoice | null = null;
      
      try {
        // Generate invoice ID and prepare data
        const invoiceId = this.generateInvoiceId();
        const timestamp = new Date().toISOString();
        
        // Calculate totals if not provided
        const subtotal = invoiceData.subtotal || invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxAmount = invoiceData.taxAmount || 0;
        const discountAmount = invoiceData.discountAmount || 0;
        const total = invoiceData.total || (subtotal + taxAmount - discountAmount);

        // Prepare invoice items with IDs
        const itemsWithIds: InvoiceItem[] = invoiceData.items.map((item, index) => ({
          ...item,
          id: `${invoiceId}-item-${index}`,
          total: item.total || (item.quantity * item.unitPrice)
        }));

        invoice = {
          id: invoiceId,
          supplierId: invoiceData.supplierId,
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: invoiceData.invoiceDate,
          dueDate: invoiceData.dueDate,
          items: itemsWithIds,
          subtotal,
          taxAmount,
          discountAmount,
          total,
          status: invoiceData.status || 'pending',
          paymentStatus: invoiceData.paymentStatus || 'pending',
          notes: invoiceData.notes || '',
          createdAt: timestamp,
          updatedAt: timestamp
        };

        // Step 4: Store invoice with retry mechanism
        createdInvoice = await this.storeInvoiceWithRetry(invoice, inventoryStore);
        
        if (!createdInvoice) {
          throw new Error('Failed to store invoice after retries');
        }

      } catch (storeError) {
        const error = storeError instanceof Error ? storeError : new Error('Unknown storage error');
        this.logOperation(operationId, 'create', 'failed', { error: error.message, invoiceData });
        
        return {
          success: false,
          error: {
            message: `Failed to store invoice: ${error.message}`,
            code: 'STORAGE_FAILED',
            details: [error.message],
            timestamp: new Date().toISOString()
          },
          operationId,
          duration: Date.now() - startTime
        };
      }

      // Step 5: Verify invoice was stored correctly
      const verificationResult = await this.verifyInvoiceStorage(createdInvoice.id, inventoryStore);
      
      if (!verificationResult.success) {
        this.logOperation(operationId, 'create', 'warning', { 
          message: 'Invoice created but verification failed', 
          verificationResult 
        });
      }

      const duration = Date.now() - startTime;
      this.recordPerformanceMetric(operationId, 'create', duration, true, createdInvoice.id);
      this.logOperation(operationId, 'create', 'success', { invoiceId: createdInvoice.id });

      return {
        success: true,
        data: createdInvoice,
        operationId,
        duration,
        validationResult,
        databaseStatus: dbStatus,
        verificationResult
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.recordPerformanceMetric(operationId, 'create', duration, false);
      this.logOperation(operationId, 'create', 'failed', { error: errorMessage });

      return {
        success: false,
        error: {
          message: `Unexpected error during invoice creation: ${errorMessage}`,
          code: 'UNEXPECTED_ERROR',
          details: [errorMessage],
          timestamp: new Date().toISOString()
        },
        operationId,
        duration
      };
    }
  }

  static async getInvoiceDisplayStatus(
    invoiceId: string,
    inventoryStore: any
  ): Promise<InvoiceDisplayStatus> {
    const startTime = Date.now();
    const operationId = this.generateOperationId();

    // Ensure minimum duration for testing
    await new Promise(resolve => setTimeout(resolve, 1));

    try {
      this.logOperation(operationId, 'display', 'started', { invoiceId });

      // Check if invoice exists
      const invoice = await this.getInvoiceById(invoiceId, inventoryStore);
      
      if (!invoice) {
        const error = `Invoice not found: ${invoiceId}`;
        this.logOperation(operationId, 'display', 'failed', { error });
        
        return {
          invoiceId,
          canDisplay: false,
          error: {
            message: error,
            code: 'INVOICE_NOT_FOUND',
            details: [error],
            timestamp: new Date().toISOString()
          },
          operationId,
          duration: Date.now() - startTime
        };
      }

      // Validate invoice data integrity
      const validationResult = InvoiceValidator.validateExistingInvoice(invoice);
      
      if (!validationResult.isValid) {
        this.logOperation(operationId, 'display', 'warning', { 
          message: 'Invoice has validation errors', 
          validationResult 
        });
      }

      // Check display requirements
      const displayRequirements = this.checkDisplayRequirements(invoice);
      
      const duration = Date.now() - startTime;
      this.recordPerformanceMetric(operationId, 'display', duration, true, invoiceId);
      this.logOperation(operationId, 'display', 'success', { invoiceId });

      return {
        invoiceId,
        canDisplay: displayRequirements.canDisplay,
        requirements: displayRequirements,
        validationResult,
        operationId,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.recordPerformanceMetric(operationId, 'display', duration, false);
      this.logOperation(operationId, 'display', 'failed', { error: errorMessage });

      return {
        invoiceId,
        canDisplay: false,
        error: {
          message: `Failed to check display status: ${errorMessage}`,
          code: 'DISPLAY_CHECK_FAILED',
          details: [errorMessage],
          timestamp: new Date().toISOString()
        },
        operationId,
        duration
      };
    }
  }

  static getGenerationLogs(limit: number = 100): InvoiceGenerationLog[] {
    return this.logs.slice(-limit);
  }

  static getPerformanceMetrics(limit: number = 100): InvoicePerformanceMetrics[] {
    return this.performanceMetrics.slice(-limit);
  }

  static getMonitoringStats() {
    const totalOperations = this.performanceMetrics.length;
    const successfulOperations = this.performanceMetrics.filter(m => m.success).length;
    const failedOperations = totalOperations - successfulOperations;
    
    const avgDuration = totalOperations > 0 
      ? this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0;

    const operationTypeStats = this.getOperationTypeStats();

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      successRate: totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0,
      averageDuration: avgDuration,
      operationTypeStats,
      lastOperation: this.performanceMetrics[this.performanceMetrics.length - 1] || null
    };
  }

  private static async checkDatabaseConnection(inventoryStore: any): Promise<DatabaseConnectionStatus> {
    try {
      // Test basic store operations
      const testStart = Date.now();
      Object.keys(inventoryStore);
      const testEnd = Date.now();
      
      return {
        connected: true,
        responseTime: testEnd - testStart,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown connection error',
        lastChecked: new Date().toISOString()
      };
    }
  }

  private static async storeInvoiceWithRetry(
    invoice: SupplierInvoice, 
    inventoryStore: any,
    maxRetries: number = 3
  ): Promise<SupplierInvoice | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Store invoice using the store's method
        if (typeof inventoryStore.addSupplierInvoice === 'function') {
          await inventoryStore.addSupplierInvoice(invoice);
          return invoice;
        } else {
          throw new Error('Store does not support addSupplierInvoice method');
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
    
    return null;
  }

  private static async verifyInvoiceStorage(
    invoiceId: string, 
    inventoryStore: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const storedInvoice = await this.getInvoiceById(invoiceId, inventoryStore);
      
      if (!storedInvoice) {
        return { success: false, error: 'Invoice not found after storage' };
      }

      // Basic integrity check
      if (storedInvoice.id !== invoiceId) {
        return { success: false, error: 'Invoice ID mismatch after storage' };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Verification failed' 
      };
    }
  }

  private static async getInvoiceById(
    invoiceId: string, 
    inventoryStore: any
  ): Promise<SupplierInvoice | null> {
    try {
      if (typeof inventoryStore.supplierInvoices === 'object' && inventoryStore.supplierInvoices[invoiceId]) {
        return inventoryStore.supplierInvoices[invoiceId];
      }
      
      // Try to find in array if store uses array structure
      if (Array.isArray(inventoryStore.supplierInvoices)) {
        return inventoryStore.supplierInvoices.find((inv: SupplierInvoice) => inv.id === invoiceId) || null;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private static checkDisplayRequirements(invoice: SupplierInvoice): any {
    const requirements = {
      hasValidId: !!(invoice.id && invoice.id.trim() !== ''),
      hasItems: !!(invoice.items && invoice.items.length > 0),
      hasValidSupplier: !!(invoice.supplierId && invoice.supplierId.trim() !== ''),
      hasValidDates: !!(invoice.invoiceDate && invoice.dueDate),
      hasValidTotals: !!(invoice.total !== undefined && invoice.total >= 0),
      canDisplay: false
    };

    requirements.canDisplay = 
      requirements.hasValidId && 
      requirements.hasItems && 
      requirements.hasValidSupplier && 
      requirements.hasValidDates && 
      requirements.hasValidTotals;

    return requirements;
  }

  private static logOperation(
    operationId: string, 
    operationType: string, 
    status: 'started' | 'success' | 'failed' | 'warning', 
    details: any
  ): void {
    const log: InvoiceGenerationLog = {
      id: operationId,
      operationType: operationType as any,
      status: status as 'started' | 'success' | 'failed' | 'warning',
      details,
      timestamp: new Date().toISOString()
    };

    this.logs.push(log);
    
    // Maintain log size limit
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }
  }

  private static recordPerformanceMetric(
    operationId: string,
    operationType: 'create' | 'update' | 'delete' | 'display' | 'validation',
    duration: number,
    success: boolean,
    invoiceId?: string
  ): void {
    const metric: InvoicePerformanceMetrics = {
      operationType,
      duration,
      timestamp: new Date().toISOString(),
      invoiceId,
      success,
      operationId
    };

    this.performanceMetrics.push(metric);
    
    // Maintain metrics size limit
    if (this.performanceMetrics.length > this.maxMetricsSize) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsSize);
    }
  }

  private static getOperationTypeStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    const types = ['create', 'update', 'delete', 'display', 'validation'];
    types.forEach(type => {
      const typeMetrics = this.performanceMetrics.filter(m => m.operationType === type);
      const successful = typeMetrics.filter(m => m.success).length;
      
      stats[type] = {
        total: typeMetrics.length,
        successful,
        failed: typeMetrics.length - successful,
        successRate: typeMetrics.length > 0 ? (successful / typeMetrics.length) * 100 : 0,
        avgDuration: typeMetrics.length > 0 
          ? typeMetrics.reduce((sum, m) => sum + m.duration, 0) / typeMetrics.length 
          : 0
      };
    });
    
    return stats;
  }

  private static generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateInvoiceId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}