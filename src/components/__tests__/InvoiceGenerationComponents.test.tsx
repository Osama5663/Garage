import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceDisplay } from '../InvoiceDisplay';
import { InvoiceMonitoringDashboard } from '../InvoiceMonitoringDashboard';
import { EnhancedInvoiceCreation } from '../EnhancedInvoiceCreation';
import { InvoiceGenerationService } from '../../utils/invoiceGenerationService';

// Mock the InvoiceGenerationService
vi.mock('../../utils/invoiceGenerationService', () => ({
  InvoiceGenerationService: {
    getInvoiceDisplayStatus: vi.fn(),
    getGenerationLogs: vi.fn(),
    getPerformanceMetrics: vi.fn(),
    getMonitoringStats: vi.fn(),
    createInvoice: vi.fn()
  }
}));

const mockInvoice = {
  id: 'inv-123',
  supplierId: 'supplier-456',
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

const mockInventoryStore = {
  supplierInvoices: { 'inv-123': mockInvoice },
  inventoryItems: []
};

describe('InvoiceDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    (InvoiceGenerationService.getInvoiceDisplayStatus as any).mockResolvedValue({
      canDisplay: true,
      invoiceId: 'inv-123',
      operationId: 'op-123',
      duration: 100
    });

    render(
      <InvoiceDisplay 
        invoiceId="inv-123" 
        inventoryStore={mockInventoryStore}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display invoice data when loaded successfully', async () => {
    (InvoiceGenerationService.getInvoiceDisplayStatus as any).mockResolvedValue({
      canDisplay: true,
      invoiceId: 'inv-123',
      operationId: 'op-123',
      duration: 100
    });

    render(
      <InvoiceDisplay 
        invoiceId="inv-123" 
        inventoryStore={mockInventoryStore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(`Invoice #${mockInvoice.invoiceNumber}`)).toBeInTheDocument();
      expect(screen.getByText(`ID: ${mockInvoice.id}`)).toBeInTheDocument();
      expect(screen.getByText('Test Item')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
    });
  });

  it('should display error state when invoice cannot be displayed', async () => {
    (InvoiceGenerationService.getInvoiceDisplayStatus as any).mockResolvedValue({
      canDisplay: false,
      invoiceId: 'inv-123',
      error: {
        message: 'Invoice not found',
        code: 'INVOICE_NOT_FOUND',
        details: ['Invoice not found'],
        timestamp: '2024-01-15T10:00:00Z'
      },
      operationId: 'op-123',
      duration: 100
    });

    render(
      <InvoiceDisplay 
        invoiceId="inv-123" 
        inventoryStore={mockInventoryStore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load invoice/i)).toBeInTheDocument();
      expect(screen.getByText('Invoice not found')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should call onError callback when error occurs', async () => {
    const mockOnError = vi.fn();
    const errorData = {
      message: 'Invoice not found',
      code: 'INVOICE_NOT_FOUND',
      details: ['Invoice not found'],
      timestamp: '2024-01-15T10:00:00Z'
    };

    (InvoiceGenerationService.getInvoiceDisplayStatus as any).mockResolvedValue({
      canDisplay: false,
      invoiceId: 'inv-123',
      error: errorData,
      operationId: 'op-123',
      duration: 100
    });

    render(
      <InvoiceDisplay 
        invoiceId="inv-123" 
        inventoryStore={mockInventoryStore}
        onError={mockOnError}
      />
    );

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(errorData);
    });
  });

  it('should retry loading when Try Again button is clicked', async () => {
    (InvoiceGenerationService.getInvoiceDisplayStatus as any)
      .mockResolvedValueOnce({
        canDisplay: false,
        invoiceId: 'inv-123',
        error: {
          message: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
          details: ['Invoice not found'],
          timestamp: '2024-01-15T10:00:00Z'
        },
        operationId: 'op-123',
        duration: 100
      })
      .mockResolvedValueOnce({
        canDisplay: true,
        invoiceId: 'inv-123',
        operationId: 'op-124',
        duration: 100
      });

    render(
      <InvoiceDisplay 
        invoiceId="inv-123" 
        inventoryStore={mockInventoryStore}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Try Again'));

    await waitFor(() => {
      expect(InvoiceGenerationService.getInvoiceDisplayStatus).toHaveBeenCalledTimes(2);
    });
  });
});

describe('InvoiceMonitoringDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (InvoiceGenerationService.getGenerationLogs as any).mockReturnValue([
      {
        id: 'log-1',
        operationType: 'create',
        status: 'success',
        details: { invoiceId: 'inv-123' },
        timestamp: '2024-01-15T10:00:00Z'
      },
      {
        id: 'log-2',
        operationType: 'display',
        status: 'failed',
        details: { error: 'Invoice not found' },
        timestamp: '2024-01-15T10:01:00Z'
      }
    ]);

    (InvoiceGenerationService.getPerformanceMetrics as any).mockReturnValue([
      {
        operationType: 'create',
        duration: 150,
        timestamp: '2024-01-15T10:00:00Z',
        invoiceId: 'inv-123',
        success: true,
        operationId: 'op-123'
      }
    ]);

    (InvoiceGenerationService.getMonitoringStats as any).mockReturnValue({
      totalOperations: 10,
      successfulOperations: 8,
      failedOperations: 2,
      successRate: 80,
      averageDuration: 120,
      operationTypeStats: {
        create: { total: 5, successful: 4, failed: 1, successRate: 80, avgDuration: 100 },
        display: { total: 5, successful: 4, failed: 1, successRate: 80, avgDuration: 140 }
      },
      lastOperation: null
    });
  });

  it('should display monitoring statistics', async () => {
    render(<InvoiceMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('80.0%')).toBeInTheDocument();
      expect(screen.getByText('Average Duration: 120ms')).toBeInTheDocument();
    });
  });

  it('should display operation type performance', async () => {
    render(<InvoiceMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('create')).toBeInTheDocument();
      expect(screen.getByText('display')).toBeInTheDocument();
      expect(screen.getByText('Total: 5')).toBeInTheDocument();
      expect(screen.getByText('Success: 4')).toBeInTheDocument();
      expect(screen.getByText('Rate: 80.0%')).toBeInTheDocument();
      expect(screen.getByText('Avg: 100ms')).toBeInTheDocument();
    });
  });

  it('should display recent operations log', async () => {
    render(<InvoiceMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Operations')).toBeInTheDocument();
      expect(screen.getByText('create')).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
      expect(screen.getByText('display')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  it('should display performance metrics', async () => {
    render(<InvoiceMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('create')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Duration: 150ms')).toBeInTheDocument();
      expect(screen.getByText('Invoice: inv-123')).toBeInTheDocument();
    });
  });

  it('should handle auto-refresh functionality', async () => {
    render(<InvoiceMonitoringDashboard />);

    const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh (5s)');
    
    expect(autoRefreshCheckbox).not.toBeChecked();
    
    fireEvent.click(autoRefreshCheckbox);
    
    expect(autoRefreshCheckbox).toBeChecked();
    
    // Wait for potential refresh cycle
    await waitFor(() => {
      expect(InvoiceGenerationService.getGenerationLogs).toHaveBeenCalled();
    }, { timeout: 6000 });
  });

  it('should handle refresh button click', async () => {
    render(<InvoiceMonitoringDashboard />);

    const refreshButton = screen.getByText('Refresh');
    
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(InvoiceGenerationService.getGenerationLogs).toHaveBeenCalledTimes(2);
      expect(InvoiceGenerationService.getPerformanceMetrics).toHaveBeenCalledTimes(2);
      expect(InvoiceGenerationService.getMonitoringStats).toHaveBeenCalledTimes(2);
    });
  });

  it('should display empty state when no data available', async () => {
    (InvoiceGenerationService.getGenerationLogs as any).mockReturnValue([]);
    (InvoiceGenerationService.getPerformanceMetrics as any).mockReturnValue([]);
    (InvoiceGenerationService.getMonitoringStats as any).mockReturnValue({
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      successRate: 0,
      averageDuration: 0,
      operationTypeStats: {},
      lastOperation: null
    });

    render(<InvoiceMonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No operations logged yet')).toBeInTheDocument();
    });
  });
});

describe('EnhancedInvoiceCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (InvoiceGenerationService.createInvoice as any).mockResolvedValue({
      success: true,
      data: mockInvoice,
      operationId: 'op-123',
      duration: 200,
      validationResult: { isValid: true, errors: [], warnings: [] }
    });
  });

  it('should render the form initially', () => {
    render(
      <EnhancedInvoiceCreation 
        inventoryStore={mockInventoryStore}
      />
    );

    expect(screen.getByText('Enhanced Invoice Creation')).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier ID *')).toBeInTheDocument();
    expect(screen.getByLabelText('Invoice Number *')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('should allow form input and validation', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedInvoiceCreation 
        inventoryStore={mockInventoryStore}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText('Supplier ID *'), 'supplier-123');
    await user.type(screen.getByLabelText('Invoice Number *'), 'INV-001');
    
    // Add an item
    await user.click(screen.getByText('Add Item'));
    
    // Fill in item details
    const itemNameInput = screen.getAllByPlaceholderText('Item name')[0];
    await user.type(itemNameInput, 'Test Item');
    
    const skuInput = screen.getAllByPlaceholderText('SKU')[0];
    await user.type(skuInput, 'SKU001');
    
    const inventoryIdInput = screen.getAllByPlaceholderText('Inventory ID')[0];
    await user.type(inventoryIdInput, 'inv-item-1');
    
    // Click validate and create
    await user.click(screen.getByText('Validate & Create'));
    
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
  });

  it('should show validation errors for invalid form data', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedInvoiceCreation 
        inventoryStore={mockInventoryStore}
      />
    );

    // Click validate without filling required fields
    await user.click(screen.getByText('Validate & Create'));
    
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
      expect(screen.getByText('Errors:')).toBeInTheDocument();
    });
  });

  it('should handle successful invoice creation', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    
    render(
      <EnhancedInvoiceCreation 
        inventoryStore={mockInventoryStore}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText('Supplier ID *'), 'supplier-123');
    await user.type(screen.getByLabelText('Invoice Number *'), 'INV-001');
    
    // Add and fill item
    await user.click(screen.getByText('Add Item'));
    await user.type(screen.getAllByPlaceholderText('Item name')[0], 'Test Item');
    await user.type(screen.getAllByPlaceholderText('SKU')[0], 'SKU001');
    await user.type(screen.getAllByPlaceholderText('Inventory ID')[0], 'inv-item-1');
    
    // Validate and create
    await user.click(screen.getByText('Validate & Create'));
    
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Create Invoice'));
    
    await waitFor(() => {
      expect(screen.getByText('Invoice Created Successfully!')).toBeInTheDocument();
      expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({
        invoiceNumber: 'INV-001'
      }));
    });
  });

  it('should handle invoice creation failure', async () => {
    (InvoiceGenerationService.createInvoice as any).mockResolvedValue({
      success: false,
      error: {
        message: 'Database connection failed',
        code: 'DATABASE_CONNECTION_FAILED',
        details: ['Connection timeout'],
        timestamp: '2024-01-15T10:00:00Z'
      },
      operationId: 'op-456',
      duration: 150
    });
    
    const user = userEvent.setup();
    const mockOnError = vi.fn();
    
    render(
      <EnhancedInvoiceCreation 
        inventoryStore={mockInventoryStore}
        onError={mockOnError}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText('Supplier ID *'), 'supplier-123');
    await user.type(screen.getByLabelText('Invoice Number *'), 'INV-001');
    
    // Add and fill item
    await user.click(screen.getByText('Add Item'));
    await user.type(screen.getAllByPlaceholderText('Item name')[0], 'Test Item');
    await user.type(screen.getAllByPlaceholderText('SKU')[0], 'SKU001');
    await user.type(screen.getAllByPlaceholderText('Inventory ID')[0], 'inv-item-1');
    
    // Validate and create
    await user.click(screen.getByText('Validate & Create'));
    
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Create Invoice'));
    
    await waitFor(() => {
      expect(screen.getByText('Invoice Creation Failed')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  it('should allow creating another invoice after success', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedInvoiceCreation 
        inventoryStore={mockInventoryStore}
      />
    );

    // Fill in required fields and create invoice
    await user.type(screen.getByLabelText('Supplier ID *'), 'supplier-123');
    await user.type(screen.getByLabelText('Invoice Number *'), 'INV-001');
    
    await user.click(screen.getByText('Add Item'));
    await user.type(screen.getAllByPlaceholderText('Item name')[0], 'Test Item');
    await user.type(screen.getAllByPlaceholderText('SKU')[0], 'SKU001');
    await user.type(screen.getAllByPlaceholderText('Inventory ID')[0], 'inv-item-1');
    
    await user.click(screen.getByText('Validate & Create'));
    
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Create Invoice'));
    
    await waitFor(() => {
      expect(screen.getByText('Invoice Created Successfully!')).toBeInTheDocument();
    });
    
    // Click to create another invoice
    await user.click(screen.getByText('Create Another Invoice'));
    
    await waitFor(() => {
      expect(screen.getByText('Enhanced Invoice Creation')).toBeInTheDocument();
      expect(screen.getByLabelText('Supplier ID *')).toHaveValue('');
    });
  });
});