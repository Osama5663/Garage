import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ReturnOrderForm } from '../ReturnOrderForm';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useDeliveryNotes } from '../../hooks/useDeliveryNotes';
import { t } from '../../i18n';

vi.mock('../../stores/inventoryStore');
vi.mock('../../hooks/useDeliveryNotes');

describe('ReturnOrderForm - Delivery Note Based', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  
  const mockSuppliers = [
    {
      id: 'sup_1',
      name: 'Auto Parts Plus',
      contactPerson: 'John Smith',
      email: 'john@autoparts.com',
      phone: '+1-555-0101',
      address: '123 Industrial Ave, Detroit, MI 48201',
      paymentTerms: 'Net 30',
      deliveryTime: 5,
      category: 'Automotive Parts',
      taxId: '12-3456789',
      website: 'https://autopartplus.com',
      notes: 'Reliable supplier for engine components',
      minimumOrderValue: 500,
      isActive: true,
      rating: 4.5,
      reliability: 95,
      averageLeadTime: 5,
      isPreferred: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'system'
    }
  ];

  const mockInventoryItems = [
    {
      id: 'item_1',
      sku: 'ENG-OIL-5W30-1L',
      name: 'Engine Oil 5W-30 1L',
      description: 'High performance synthetic engine oil',
      category: 'Engine Parts',
      quantity: 50,
      unit: 'bottle',
      minimumStock: 10,
      maximumStock: 100,
      reorderPoint: 15,
      location: 'main-warehouse',
      supplierId: 'sup_1',
      supplierName: 'Auto Parts Plus',
      supplierSku: 'API-5W30-1L',
      unitCost: 12.50,
      sellingPrice: 24.99,
      taxRate: 0.08,
      manufacturer: 'AutoLube Pro',
      manufacturerPartNumber: 'AL-5W30-1L',
      barcode: '1234567890123',
      leadTimeDays: 5,
      isTaxable: true,
      isTrackable: true,
      notes: 'Popular item, fast moving',
      status: 'active',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      updatedBy: null,
      lastRestocked: '2024-01-01T00:00:00Z',
      lastUsed: null,
      usageRate: 0,
      monthsOfStock: 999,
      markupPercentage: 99.92,
      manufacturerWarrantyMonths: 0,
      expiryDate: null,
      specifications: null,
      compatibility: null,
      safetyInfo: null,
      storageRequirements: null
    },
    {
      id: 'item_2',
      sku: 'BRAKE-PAD-FRONT',
      name: 'Brake Pads Front Axle',
      description: 'Premium ceramic brake pads',
      category: 'Brake System',
      quantity: 15,
      unit: 'set',
      minimumStock: 5,
      maximumStock: 25,
      reorderPoint: 8,
      location: 'main-warehouse',
      supplierId: 'sup_1',
      supplierName: 'Auto Parts Plus',
      supplierSku: 'API-BP-FRONT',
      unitCost: 35.00,
      sellingPrice: 79.99,
      taxRate: 0.08,
      manufacturer: 'StopTech',
      manufacturerPartNumber: 'ST-FRONT-SET',
      barcode: '1234567890125',
      leadTimeDays: 7,
      isTaxable: true,
      isTrackable: true,
      notes: 'Good stock available',
      status: 'active',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      updatedBy: null,
      lastRestocked: '2024-01-01T00:00:00Z',
      lastUsed: null,
      usageRate: 0,
      monthsOfStock: 999,
      markupPercentage: 128.54,
      manufacturerWarrantyMonths: 0,
      expiryDate: null,
      specifications: null,
      compatibility: null,
      safetyInfo: null,
      storageRequirements: null
    }
  ];

  const mockPurchaseOrders = [
    {
      id: 'po_1',
      purchaseOrderNumber: 'PO-2024-001',
      supplierId: 'sup_1',
      supplierName: 'Auto Parts Plus',
      orderDate: '2024-01-15T00:00:00Z',
      expectedDeliveryDate: '2024-01-20T00:00:00Z',
      actualDeliveryDate: '2024-01-19T00:00:00Z',
      status: 'received',
      totalAmount: 1250.00,
      currency: 'USD',
      paymentTerms: 'Net 30',
      notes: 'Regular order for engine oil and brake pads',
      createdBy: 'user_1',
      approvedBy: 'manager_1',
      approvalDate: '2024-01-15T10:00:00Z',
      items: [
        {
          id: 'po_item_1',
          inventoryItemId: 'item_1',
          itemName: 'Engine Oil 5W-30 1L',
          sku: 'ENG-OIL-5W30-1L',
          quantityOrdered: 50,
          quantityReceived: 50,
          unitCost: 12.50,
          totalCost: 625.00,
          notes: 'Received in full'
        },
        {
          id: 'po_item_2',
          inventoryItemId: 'item_2',
          itemName: 'Brake Pads Front Axle',
          sku: 'BRAKE-PAD-FRONT',
          quantityOrdered: 20,
          quantityReceived: 20,
          unitCost: 35.00,
          totalCost: 700.00,
          notes: 'Received in full'
        }
      ],
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-19T00:00:00Z'
    }
  ];

  const mockDeliveryNotes = [
    {
      id: 'dn_1',
      delivery_note_number: 'BL-2024-001',
      supplier_id: 'sup_1',
      purchase_order_id: 'po_1',
      delivery_date: '2024-01-20T00:00:00Z',
      status: 'validated',
      total_amount_ttc: 1250.0,
      suppliers: {
        name: 'Auto Parts Plus'
      },
      purchase_orders: {
        po_number: 'PO-2024-001'
      },
      supplier_delivery_note_items: [
        {
          id: 'dn_item_1',
          item_name: 'Engine Oil 5W-30 1L',
          item_reference: 'ENG-OIL-5W30-1L',
          quantity_accepted: 50,
          unit_price_ht: 12.5,
          purchase_order_items: {
            inventory_item_id: 'item_1'
          }
        },
        {
          id: 'dn_item_2',
          item_name: 'Brake Pads Front Axle',
          item_reference: 'BRAKE-PAD-FRONT',
          quantity_accepted: 20,
          unit_price_ht: 35.0,
          purchase_order_items: {
            inventory_item_id: 'item_2'
          }
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useInventoryStore as vi.Mock).mockReturnValue({
      suppliers: mockSuppliers,
      inventoryItems: mockInventoryItems,
      purchaseOrders: mockPurchaseOrders,
      createReturnOrder: vi.fn()
    });

    (useDeliveryNotes as unknown as vi.Mock).mockReturnValue({
      deliveryNotes: mockDeliveryNotes,
      fetchDeliveryNotes: vi.fn()
    });
  });

  describe('Delivery note selection', () => {
    it('should display eligible delivery notes in the dropdown', () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      expect(dnSelect).toBeInTheDocument();
      
      expect(
        screen.getByText(/BL-2024-001 - Auto Parts Plus/)
      ).toBeInTheDocument();
    });

    it('should show delivery note details when one is selected', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      expect(screen.getByText('Auto Parts Plus')).toBeInTheDocument();
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('20/01/2024')).toBeInTheDocument();
    });

    it('should show no eligible notes message when none available', () => {
      (useDeliveryNotes as unknown as vi.Mock).mockReturnValue({
        deliveryNotes: [],
        fetchDeliveryNotes: vi.fn()
      });

      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      expect(screen.getByText(t('returnOrderForm.warnings.noEligibleNotes'))).toBeInTheDocument();
    });
  });

  describe('Item Selection and Quantities', () => {
    it('should display items from selected delivery note with available quantities', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      expect(screen.getByText('Engine Oil 5W-30 1L')).toBeInTheDocument();
      expect(screen.getByText('ENG-OIL-5W30-1L')).toBeInTheDocument();
      expect(
        screen.getByText(`50 ${t('returnOrderForm.labels.available').toLowerCase()}`)
      ).toBeInTheDocument();

      expect(screen.getByText('Brake Pads Front Axle')).toBeInTheDocument();
      expect(screen.getByText('BRAKE-PAD-FRONT')).toBeInTheDocument();
      expect(
        screen.getByText(`15 ${t('returnOrderForm.labels.available').toLowerCase()}`)
      ).toBeInTheDocument();
    });

    it('should allow setting return quantities', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      const quantityInputs = screen.getAllByRole('spinbutton');
      await userEvent.type(quantityInputs[0], '5');
      await userEvent.type(quantityInputs[1], '3');

      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(
          screen.getByText(content => content.includes('167') || content.includes('167,5'))
        ).toBeInTheDocument();
      });
    });

    it('should validate maximum quantities', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      const quantityInputs = screen.getAllByRole('spinbutton');
      await userEvent.clear(quantityInputs[0]);
      await userEvent.type(quantityInputs[0], '60');

      expect(
        screen.getByText(
          t('returnOrderForm.errors.cannotReturnMore').replace('{{max}}', '50')
        )
      ).toBeInTheDocument();
    });

    it('should show no items available message when delivery note has no stock', async () => {
      (useInventoryStore as vi.Mock).mockReturnValue({
        suppliers: mockSuppliers,
        inventoryItems: mockInventoryItems.map(item => ({ ...item, quantity: 0 })),
        purchaseOrders: mockPurchaseOrders,
        createReturnOrder: vi.fn()
      });

      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      expect(screen.getByText(t('returnOrderForm.warnings.noItemsAvailable'))).toBeInTheDocument();
    });
  });

  describe('Return Details and Submission', () => {
    it('should show return details section when items are selected', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      const quantityInputs = screen.getAllByRole('spinbutton');
      await userEvent.type(quantityInputs[0], '5');

      expect(screen.getByText(t('returnOrderForm.sections.returnDetails'))).toBeInTheDocument();
      expect(screen.getByText(t('returnOrderForm.labels.returnReason'))).toBeInTheDocument();
      expect(screen.getByText(t('returnOrderForm.labels.returnMethod'))).toBeInTheDocument();
    });

    it('should show return summary with correct totals', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      const quantityInputs = screen.getAllByRole('spinbutton');
      await userEvent.type(quantityInputs[0], '5');
      await userEvent.type(quantityInputs[1], '2');

      expect(screen.getByText('7')).toBeInTheDocument();
      expect(
        screen.getByText(content => content.includes('132') || content.includes('132,5'))
      ).toBeInTheDocument();

      const supplierElements = screen.getAllByText('Auto Parts Plus');
      expect(supplierElements.length).toBeGreaterThan(0);
    });

    it('should submit form with correct data', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      const quantityInputs = screen.getAllByRole('spinbutton');
      await userEvent.type(quantityInputs[0], '5');
      await userEvent.type(quantityInputs[1], '2');

      const returnReasonSelect = screen.getByLabelText(t('returnOrderForm.labels.returnReason'));
      await userEvent.selectOptions(returnReasonSelect, 'defective');

      const returnMethodSelect = screen.getByLabelText(t('returnOrderForm.labels.returnMethod'));
      await userEvent.selectOptions(returnMethodSelect, 'pickup');

      const submitButton = screen.getByText(t('returnOrderForm.labels.processReturn'));
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          supplierId: 'sup_1',
          purchaseOrderId: 'po_1',
          deliveryNoteId: 'dn_1',
          deliveryNoteNumber: 'BL-2024-001',
          items: expect.arrayContaining([
            expect.objectContaining({
              inventoryItemId: 'item_1',
              quantityReturned: 5,
              condition: 'new'
            }),
            expect.objectContaining({
              inventoryItemId: 'item_2',
              quantityReturned: 2,
              condition: 'new'
            })
          ]),
          returnReason: 'defective',
          returnReasonDetails: '',
          returnMethod: 'pickup',
          notes: ''
        });
      });
    });

    it('should disable submit button when no items selected', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      const disabledSubmit = screen.getByText(t('returnOrderForm.labels.processReturn'));
      expect(disabledSubmit).toBeDisabled();
    });

    it('should show validation errors for missing fields', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(screen.getByText(t('returnOrderForm.errors.deliveryNoteRequired'))).toBeInTheDocument();
    });
  });

  describe('Form Cancellation', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const dnSelect = screen.getByLabelText(t('returnOrderForm.labels.deliveryNoteNumber'));
      await userEvent.selectOptions(dnSelect, 'dn_1');

      const quantityInputs = screen.getAllByRole('spinbutton');
      await userEvent.type(quantityInputs[0], '5');

      const cancelButton = screen.getByText(t('returnOrderForm.labels.cancel'));
      await userEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when X button is clicked', async () => {
      render(
        <ReturnOrderForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );

      const closeButton = screen.getByRole('button', { name: '' });
      await userEvent.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
