import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Package, User, Calendar } from 'lucide-react';
import useSupplierDeliveryNoteStore from '../stores/supplierDeliveryNoteStore';
import { useSupplierStore } from '../stores/supplierStore';
import { formatCurrency } from '../utils/formatters';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import { PurchaseOrder } from '../types/inventory';

const CreateSupplierDeliveryNotePage: React.FC = () => {
  const navigate = useNavigate();
  const { createDeliveryNote, loading, error, clearError } = useSupplierDeliveryNoteStore();
  const { suppliers } = useSupplierStore();
  const { purchaseOrders } = usePurchaseOrders();

  const [formData, setFormData] = useState({
    supplierId: '',
    purchaseOrderId: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string; email?: string; phone?: string } | null>(null);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    // This would normally be called in the store, but we'll simulate it here
    console.log('Suppliers and purchase orders should be loaded');
  }, []);

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setSelectedSupplier(supplier || null);
    setFormData(prev => ({ ...prev, supplierId }));
    
    // Reset purchase order when supplier changes
    setSelectedPurchaseOrder(null);
    setFormData(prev => ({ ...prev, purchaseOrderId: '' }));
  };

  const handlePurchaseOrderChange = (purchaseOrderId: string) => {
    const po = purchaseOrders.find(po => po.id === purchaseOrderId);
    setSelectedPurchaseOrder(po || null);
    setFormData(prev => ({ ...prev, purchaseOrderId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierId) {
      alert('Please select a supplier');
      return;
    }

    try {
      const newNote = await createDeliveryNote({
        supplier_id: formData.supplierId,
        purchase_order_id: formData.purchaseOrderId || undefined,
        delivery_date: formData.deliveryDate,
        notes: formData.notes,
        items: [],
        tva_rate: 20
      });
      
      // Navigate to the newly created delivery note
      navigate(`/supplier-delivery-notes/${newNote.id}`);
    } catch (error) {
      console.error('Failed to create delivery note:', error);
      // Error is already set in the store
    }
  };

  const getSupplierPurchaseOrders = (): PurchaseOrder[] => {
    if (!selectedSupplier) return [];

    return purchaseOrders.filter((po: PurchaseOrder) => {
      const idMatch = po.supplierId === selectedSupplier.id;
      const nameMatch =
        po.supplierName &&
        selectedSupplier.name &&
        po.supplierName.toLowerCase() === selectedSupplier.name.toLowerCase();

      return idMatch || nameMatch;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/supplier-delivery-notes')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Delivery Notes
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Supplier Delivery Note</h1>
        <p className="text-gray-600">Create a new delivery note to record received goods from suppliers</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearError}
                className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100"
              >
                <span className="sr-only">Dismiss</span>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
        <div className="px-6 py-8 space-y-6">
          {/* Supplier Selection */}
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-2">
              Supplier *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                id="supplier"
                value={formData.supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
                required
              >
                <option value="">Select a supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedSupplier && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Contact:</strong> {selectedSupplier.email || 'N/A'}<br />
                  <strong>Phone:</strong> {selectedSupplier.phone || 'N/A'}
                </p>
              </div>
            )}
          </div>

          {/* Purchase Order Selection */}
          <div>
            <label htmlFor="purchaseOrder" className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Order (Optional)
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                id="purchaseOrder"
                value={formData.purchaseOrderId}
                onChange={(e) => handlePurchaseOrderChange(e.target.value)}
                className="pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
                disabled={!selectedSupplier}
              >
                <option value="">Select a purchase order</option>
                {getSupplierPurchaseOrders().map(po => (
                  <option key={po.id} value={po.id}>
                    {po.orderNumber} - {new Date(po.orderDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            {selectedPurchaseOrder && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Order Date:</strong> {new Date(selectedPurchaseOrder.orderDate).toLocaleDateString()}<br />
                  <strong>Status:</strong> {selectedPurchaseOrder.status}<br />
                  <strong>Total:</strong> {formatCurrency(selectedPurchaseOrder.totalAmount || 0)}
                </p>
              </div>
            )}
          </div>

          {/* Delivery Date */}
          <div>
            <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="date"
                id="deliveryDate"
                value={formData.deliveryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                className="pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
              placeholder="Additional notes about this delivery..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/supplier-delivery-notes')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Create Delivery Note
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateSupplierDeliveryNotePage;
