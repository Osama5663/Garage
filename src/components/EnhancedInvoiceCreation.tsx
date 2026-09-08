import React, { useState, useCallback } from 'react';
import { SupplierInvoiceFormData, SupplierInvoice } from '../types';
import { InvoiceGenerationService } from '../utils/invoiceGenerationService';
import { InvoiceValidator } from '../utils/invoiceValidation';
import { InvoiceOperationResult, InvoiceValidationResult } from '../types/invoice-monitoring';
import { formatCurrency } from '../utils/formatters';

interface EnhancedInvoiceCreationProps {
  inventoryStore: any;
  onSuccess?: (invoice: SupplierInvoice) => void;
  onError?: (error: any) => void;
  className?: string;
}

interface InvoiceCreationState {
  formData: SupplierInvoiceFormData;
  validationResult: InvoiceValidationResult | null;
  operationResult: InvoiceOperationResult | null;
  loading: boolean;
  currentStep: 'form' | 'validation' | 'creation' | 'result';
  monitoringEnabled: boolean;
}

export const EnhancedInvoiceCreation: React.FC<EnhancedInvoiceCreationProps> = ({
  inventoryStore,
  onSuccess,
  onError,
  className = ''
}) => {
  const [state, setState] = useState<InvoiceCreationState>({
    formData: {
      supplierId: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 0,
      status: 'pending',
      paymentStatus: 'pending',
      notes: ''
    },
    validationResult: null,
    operationResult: null,
    loading: false,
    currentStep: 'form',
    monitoringEnabled: true
  });

  const validateForm = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const validationResult = InvoiceValidator.validateInvoiceData(state.formData);
      setState(prev => ({
        ...prev,
        validationResult,
        loading: false,
        currentStep: 'validation'
      }));
      
      return validationResult.isValid;
    } catch (error) {
      console.error('Validation error:', error);
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [state.formData]);

  const createInvoice = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, currentStep: 'creation' }));
    
    try {
      const result = await InvoiceGenerationService.createInvoice(
        state.formData,
        inventoryStore
      );
      
      setState(prev => ({
        ...prev,
        operationResult: result,
        loading: false,
        currentStep: 'result'
      }));
      
      if (result.success && result.data) {
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        if (onError) {
          onError(result.error);
        }
      }
    } catch (error) {
      const errorResult: InvoiceOperationResult = {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'UNEXPECTED_ERROR',
          details: [],
          timestamp: new Date().toISOString()
        },
        operationId: `error_${Date.now()}`,
        duration: 0
      };
      
      setState(prev => ({
        ...prev,
        operationResult: errorResult,
        loading: false,
        currentStep: 'result'
      }));
      
      if (onError) {
        onError(errorResult.error);
      }
    }
  }, [state.formData, inventoryStore, onSuccess, onError]);

  const handleFormChange = useCallback((field: keyof SupplierInvoiceFormData, value: any) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value
      }
    }));
  }, []);

  const addItem = useCallback(() => {
    const newItem = {
      id: `item_${Date.now()}`,
      inventoryItemId: '',
      itemName: '',
      sku: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        items: [...prev.formData.items, newItem]
      }
    }));
  }, []);

  const updateItem = useCallback((index: number, field: string, value: any) => {
    setState(prev => {
      const updatedItems = [...prev.formData.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
      
      // Recalculate total for the item
      if (field === 'quantity' || field === 'unitPrice') {
        updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
      }
      
      // Recalculate invoice totals
      const subtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const total = subtotal + prev.formData.taxAmount - prev.formData.discountAmount;
      
      return {
        ...prev,
        formData: {
          ...prev.formData,
          items: updatedItems,
          subtotal,
          total
        }
      };
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setState(prev => {
      const updatedItems = prev.formData.items.filter((_, i) => i !== index);
      const subtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const total = subtotal + prev.formData.taxAmount - prev.formData.discountAmount;
      
      return {
        ...prev,
        formData: {
          ...prev.formData,
          items: updatedItems,
          subtotal,
          total
        }
      };
    });
  }, []);

  const resetForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'form',
      validationResult: null,
      operationResult: null,
      formData: {
        supplierId: '',
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        total: 0,
        status: 'pending',
        paymentStatus: 'pending',
        notes: ''
      }
    }));
  }, []);

  // Render different steps
  const renderFormStep = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-1">
            Supplier ID *
          </label>
          <input
            id="supplierId"
            type="text"
            value={state.formData.supplierId}
            onChange={(e) => handleFormChange('supplierId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter supplier ID"
          />
        </div>
        
        <div>
          <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Invoice Number *
          </label>
          <input
            id="invoiceNumber"
            type="text"
            value={state.formData.invoiceNumber}
            onChange={(e) => handleFormChange('invoiceNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter invoice number"
          />
        </div>
        
        <div>
          <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700 mb-1">
            Invoice Date *
          </label>
          <input
            id="invoiceDate"
            type="date"
            value={state.formData.invoiceDate}
            onChange={(e) => handleFormChange('invoiceDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
            Due Date *
          </label>
          <input
            id="dueDate"
            type="date"
            value={state.formData.dueDate}
            onChange={(e) => handleFormChange('dueDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Item
          </button>
        </div>
        
        {state.formData.items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No items added yet. Click "Add Item" to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.formData.items.map((item, index) => (
              <div key={item.id || index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label htmlFor={`itemName_${index}`} className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                    <input
                      id={`itemName_${index}`}
                      type="text"
                      value={item.itemName}
                      onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Item name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={`sku_${index}`} className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input
                      id={`sku_${index}`}
                      type="text"
                      value={item.sku}
                      onChange={(e) => updateItem(index, 'sku', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="SKU"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={`inventoryItemId_${index}`} className="block text-sm font-medium text-gray-700 mb-1">Inventory ID</label>
                    <input
                      id={`inventoryItemId_${index}`}
                      type="text"
                      value={item.inventoryItemId}
                      onChange={(e) => updateItem(index, 'inventoryItemId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Inventory ID"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={`quantity_${index}`} className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      id={`quantity_${index}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={`unitPrice_${index}`} className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input
                      id={`unitPrice_${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium">
                        {formatCurrency(item.total || 0)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="ml-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="taxAmount" className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
            <input
              id="taxAmount"
              type="number"
              step="0.01"
              min="0"
              value={state.formData.taxAmount}
              onChange={(e) => handleFormChange('taxAmount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="discountAmount" className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
            <input
              id="discountAmount"
              type="number"
              step="0.01"
              min="0"
              value={state.formData.discountAmount}
              onChange={(e) => handleFormChange('discountAmount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
            <div className="px-3 py-2 bg-blue-50 border border-blue-300 rounded-md text-lg font-bold text-blue-900">
              {formatCurrency(state.formData.total)}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          id="notes"
          value={state.formData.notes}
          onChange={(e) => handleFormChange('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Additional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={resetForm}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={validateForm}
          disabled={state.loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {state.loading ? 'Validating...' : 'Validate & Create'}
        </button>
      </div>
    </div>
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Validation Results</h3>
        
        {state.validationResult && (
          <div className="space-y-4">
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                state.validationResult.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {state.validationResult.isValid ? 'Valid' : 'Invalid'}
              </span>
              <span className="ml-2 text-sm text-gray-600">
                Duration: {state.validationResult.duration}ms
              </span>
            </div>
            
            {state.validationResult.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {state.validationResult.errors.map((error, index) => (
                    <li key={index}>• {error.message}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {state.validationResult.warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {state.validationResult.warnings.map((warning, index) => (
                    <li key={index}>• {warning.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => setState(prev => ({ ...prev, currentStep: 'form' }))}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Back to Form
        </button>
        {state.validationResult?.isValid && (
          <button
            type="button"
            onClick={createInvoice}
            disabled={state.loading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {state.loading ? 'Creating...' : 'Create Invoice'}
          </button>
        )}
      </div>
    </div>
  );

  const renderCreationStep = () => (
    <div className="text-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Creating Invoice...</h3>
      <p className="text-gray-600">Please wait while we process your invoice.</p>
    </div>
  );

  const renderResultStep = () => (
    <div className="space-y-6">
      {state.operationResult && (
        <div className={`border rounded-lg p-6 ${
          state.operationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center mb-4">
            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
              state.operationResult.success ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {state.operationResult.success ? (
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="ml-4">
              <h3 className={`text-lg font-medium ${
                state.operationResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {state.operationResult.success ? 'Invoice Created Successfully!' : 'Invoice Creation Failed'}
              </h3>
              <p className={`text-sm ${
                state.operationResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                Operation ID: {state.operationResult.operationId}
              </p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Duration:</span>
              <span>{state.operationResult.duration}ms</span>
            </div>
            
            {state.operationResult.success && state.operationResult.data && (
              <div className="flex justify-between">
                <span className="font-medium">Invoice ID:</span>
                <span>{state.operationResult.data.id}</span>
              </div>
            )}
            
            {!state.operationResult.success && state.operationResult.error && (
              <div className="mt-4 p-3 bg-white rounded border">
                <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
                <p className="text-red-700 mb-1">{state.operationResult.error.message}</p>
                <p className="text-red-600 text-xs">Code: {state.operationResult.error.code}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={resetForm}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Another Invoice
        </button>
      </div>
    </div>
  );

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Enhanced Invoice Creation</h2>
          <div className="flex items-center space-x-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.monitoringEnabled}
                onChange={(e) => setState(prev => ({ ...prev, monitoringEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">Enable Monitoring</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-6">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center">
            {['form', 'validation', 'creation', 'result'].map((step, index) => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  state.currentStep === step ? 'bg-blue-600 text-white' : 
                  ['validation', 'creation', 'result'].includes(state.currentStep) && index < ['validation', 'creation', 'result'].indexOf(state.currentStep) + 1 ? 
                  'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    ['validation', 'creation', 'result'].includes(state.currentStep) && index < ['validation', 'creation', 'result'].indexOf(state.currentStep) + 1 ? 
                    'bg-green-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Form</span>
            <span>Validation</span>
            <span>Creation</span>
            <span>Result</span>
          </div>
        </div>

        {/* Step Content */}
        {state.currentStep === 'form' && renderFormStep()}
        {state.currentStep === 'validation' && renderValidationStep()}
        {state.currentStep === 'creation' && renderCreationStep()}
        {state.currentStep === 'result' && renderResultStep()}
      </div>
    </div>
  );
};
