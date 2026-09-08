import React, { useState, useEffect } from 'react';
import { SupplierInvoice, InventoryItem } from '../types';
import { InvoiceGenerationService } from '../utils/invoiceGenerationService';
import { InvoiceDisplayStatus } from '../types/invoice-monitoring';
import { formatCurrency } from '../utils/formatters';

interface InvoiceDisplayProps {
  invoiceId: string;
  inventoryStore: any;
  onError?: (error: any) => void;
  className?: string;
}

interface InvoiceDisplayState {
  invoice: SupplierInvoice | null;
  displayStatus: InvoiceDisplayStatus | null;
  inventoryItems: InventoryItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export const InvoiceDisplay: React.FC<InvoiceDisplayProps> = ({
  invoiceId,
  inventoryStore,
  onError,
  className = ''
}) => {
  const [state, setState] = useState<InvoiceDisplayState>({
    invoice: null,
    displayStatus: null,
    inventoryItems: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId, inventoryStore]);

  const loadInvoiceData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check display status first
      const displayStatus = await InvoiceGenerationService.getInvoiceDisplayStatus(invoiceId, inventoryStore);
      
      if (!displayStatus.canDisplay && displayStatus.error) {
        const errorMessage = `Cannot display invoice: ${displayStatus.error.message}`;
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
          displayStatus
        }));
        
        if (onError) {
          onError(displayStatus.error);
        }
        return;
      }

      // Get invoice data
      const invoice = await getInvoiceById(invoiceId, inventoryStore);
      
      if (!invoice) {
        const errorMessage = `Invoice not found: ${invoiceId}`;
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));
        
        if (onError) {
          onError({ message: errorMessage });
        }
        return;
      }

      // Get inventory items for display
      const inventoryItems = getInventoryItems(invoice, inventoryStore);

      setState({
        invoice,
        displayStatus,
        inventoryItems,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load invoice';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      if (onError) {
        onError(error);
      }
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-600'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status: string): string => {
    const colors = {
      pending: 'bg-orange-100 text-orange-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (state.loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Failed to Load Invoice</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{state.error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadInvoiceData}
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!state.invoice) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Invoice Data</h3>
        <p className="mt-1 text-sm text-gray-500">Invoice data could not be loaded.</p>
      </div>
    );
  }

  const { invoice } = state;

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Invoice #{invoice.invoiceNumber}</h2>
            <p className="text-sm text-gray-500 mt-1">ID: {invoice.id}</p>
          </div>
          <div className="text-right">
            <div className="flex flex-col space-y-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                {invoice.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Invoice Information</h3>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Invoice Date:</dt>
                <dd className="text-sm text-gray-900">{formatDate(invoice.invoiceDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Due Date:</dt>
                <dd className="text-sm text-gray-900">{formatDate(invoice.dueDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created:</dt>
                <dd className="text-sm text-gray-900">{formatDate(invoice.createdAt)}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Supplier Information</h3>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Supplier ID:</dt>
                <dd className="text-sm text-gray-900">{invoice.supplierId}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-6 py-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Invoice Items</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="px-3 py-2 text-sm text-gray-900">{item.itemName}</td>
                  <td className="px-3 py-2 text-sm text-gray-500">{item.sku || 'N/A'}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(item.total || item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex justify-end">
          <div className="w-64">
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Subtotal:</dt>
                <dd className="text-sm text-gray-900">{formatCurrency(invoice.subtotal)}</dd>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Tax:</dt>
                  <dd className="text-sm text-gray-900">{formatCurrency(invoice.taxAmount)}</dd>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Discount:</dt>
                  <dd className="text-sm text-gray-900">-{formatCurrency(invoice.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <dt className="text-sm font-medium text-gray-900">Total:</dt>
                <dd className="text-sm font-medium text-gray-900">{formatCurrency(invoice.total)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
          <p className="text-sm text-gray-600">{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500">
        Last updated: {state.lastUpdated ? formatDate(state.lastUpdated) : 'N/A'}
        {state.displayStatus && (
          <span className="ml-4">
            Display check: {state.displayStatus.duration}ms
          </span>
        )}
      </div>
    </div>
  );
};

// Helper functions
function getInvoiceById(invoiceId: string, inventoryStore: any): Promise<SupplierInvoice | null> {
  return new Promise((resolve) => {
    try {
      if (inventoryStore.supplierInvoices) {
        if (Array.isArray(inventoryStore.supplierInvoices)) {
          const invoice = inventoryStore.supplierInvoices.find((inv: SupplierInvoice) => inv.id === invoiceId);
          resolve(invoice || null);
        } else if (typeof inventoryStore.supplierInvoices === 'object') {
          resolve(inventoryStore.supplierInvoices[invoiceId] || null);
        }
      }
      resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function getInventoryItems(invoice: SupplierInvoice, inventoryStore: any): InventoryItem[] {
  try {
    if (Array.isArray(inventoryStore.inventoryItems)) {
      return inventoryStore.inventoryItems.filter((item: InventoryItem) =>
        invoice.items.some(invoiceItem => invoiceItem.inventoryItemId === item.id)
      );
    }
    return [];
  } catch {
    return [];
  }
}
