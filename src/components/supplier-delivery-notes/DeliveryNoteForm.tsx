import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Trash2, 
  Save, 
  X,
  Calendar,
  DollarSign,
  Tag,
  Hash,
  Check,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useDeliveryNotes } from '../../hooks/useDeliveryNotes';
import { useSuppliers } from '../../hooks/useSuppliers';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { formatCurrency } from '../../utils/formatters';

interface DeliveryNoteItem {
  id?: string;
  purchase_order_item_id?: string;
  item_reference: string;
  item_name: string;
  quantity_delivered: number;
  quantity_accepted: number;
  unit_price_ht: number;
  total_price_ht: number;
  notes?: string;
}

interface DeliveryNoteFormData {
  delivery_note_number?: string;
  supplier_id: string;
  purchase_order_id?: string;
  delivery_date: string;
  tva_rate: number;
  notes?: string;
  items: DeliveryNoteItem[];
}

const DeliveryNoteForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const { createDeliveryNote, updateDeliveryNote, getDeliveryNoteById } = useDeliveryNotes();
  const { suppliers, fetchSuppliers } = useSuppliers();
  const { purchaseOrders, loading: poLoading, error: poError, getPurchaseOrderItems, getPurchaseOrdersForSupplier } = usePurchaseOrders();

  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    supplier_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    tva_rate: 20,
    items: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [resolvedSuppliers, setResolvedSuppliers] = useState<any[]>([]);
  const [supplierPOs, setSupplierPOs] = useState<any[]>([]);

  useEffect(() => {
    fetchSuppliers();
    if (isEditing && id) {
      loadDeliveryNote();
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (selectedSupplier) {
      setFormData(prev => ({ 
        ...prev, 
        supplier_id: selectedSupplier,
        purchase_order_id: prev.supplier_id !== selectedSupplier ? '' : prev.purchase_order_id
      }));
    } else {
      setFormData(prev => ({ ...prev, supplier_id: '', purchase_order_id: '' }));
    }
  }, [selectedSupplier]);

  useEffect(() => {
    const updatePurchaseOrders = async () => {
      try {
        if (!selectedSupplier) {
          const active = purchaseOrders.filter(po => po.status !== 'cancelled');
          setSupplierPOs(active);
        } else {
          const result = await getPurchaseOrdersForSupplier(selectedSupplier);
          const active = result.filter(po => po.status !== 'cancelled');
          setSupplierPOs(active);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load purchase orders for supplier');
      }
    };

    updatePurchaseOrders();
  }, [selectedSupplier, purchaseOrders, getPurchaseOrdersForSupplier]);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const base = (suppliers || []).map((s: any) => ({ ...s, resolved_id: s?.id ?? s?._id }));

      if (!cancelled) setResolvedSuppliers(base);
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [suppliers]);

  const importItemsFromPO = async (poId: string, skipConfirmation = false) => {
    if (!skipConfirmation && !window.confirm('Do you want to import items from this Purchase Order?')) {
      return;
    }

    try {
      setLoading(true);
      const items = await getPurchaseOrderItems(poId);
      
      if (items && items.length > 0) {
        const deliveryItems: DeliveryNoteItem[] = items.map((item: any) => ({
          purchase_order_item_id: item.id,
          item_reference: item.item_reference || item.reference || '',
          item_name: item.item_name || item.description || '',
          quantity_delivered: item.quantity_ordered || item.quantity || 1,
          quantity_accepted: item.quantity_ordered || item.quantity || 1,
          unit_price_ht: item.unit_price_ht || item.unit_price || 0,
          total_price_ht: (item.quantity_ordered || item.quantity || 1) * (item.unit_price_ht || item.unit_price || 0),
          notes: ''
        }));

        setFormData(prev => ({
          ...prev,
          items: deliveryItems
        }));
      }
    } catch (err) {
      setError('Failed to import items from Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const poId = searchParams.get('po_id');

    if (poId && !isEditing && purchaseOrders.length > 0 && !formData.purchase_order_id) {
       const po = purchaseOrders.find(p => p.id === poId);
       if (po) {
         setSelectedSupplier(po.supplierId);
         setFormData(prev => ({ ...prev, purchase_order_id: poId }));
         importItemsFromPO(poId, true);
       }
    }
  }, [purchaseOrders, location.search, isEditing]);

  const handlePurchaseOrderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const poId = e.target.value;
    // Set to empty string if "No purchase order" is selected (value is "")
    setFormData(prev => ({ ...prev, purchase_order_id: poId || '' }));

    if (poId && !isEditing) {
      importItemsFromPO(poId);
    }
  };

  const loadDeliveryNote = async () => {
    try {
      setLoading(true);
      const note = await getDeliveryNoteById(id!);
      if (note) {
        setFormData({
          delivery_note_number: note.delivery_note_number,
          supplier_id: note.supplier_id,
          purchase_order_id: note.purchase_order_id || '',
          delivery_date: note.delivery_date,
          tva_rate: note.tva_rate || 20,
          notes: note.notes || '',
          items: note.supplier_delivery_note_items?.map((item: any) => ({
            id: item.id,
            purchase_order_item_id: item.purchase_order_item_id || '',
            item_reference: item.item_reference,
            item_name: item.item_name,
            quantity_delivered: item.quantity_delivered,
            quantity_accepted: item.quantity_accepted,
            unit_price_ht: parseFloat(item.unit_price_ht),
            total_price_ht: parseFloat(item.total_price_ht),
            notes: item.notes || ''
          })) || []
        });
        setSelectedSupplier(note.supplier_id);
      }
    } catch (err) {
      setError('Failed to load delivery note');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.supplier_id) {
      setError('Please select a supplier');
      return;
    }

    // Ensure purchase_order_id is undefined or null if empty string before sending
    // (though the hook now handles this, it's good practice to clean data here too)
    const dataToSubmit = {
      ...formData,
      purchase_order_id: formData.purchase_order_id === '' ? undefined : formData.purchase_order_id
    };

    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    // Validate items
    for (const item of formData.items) {
      if (!item.item_reference || !item.item_name) {
        setError('All items must have a reference and name');
        return;
      }
      if (item.quantity_delivered <= 0) {
        setError('Delivered quantity must be greater than 0');
        return;
      }
      if (item.quantity_accepted < 0) {
        setError('Accepted quantity cannot be negative');
        return;
      }
      if (item.quantity_accepted > item.quantity_delivered) {
        setError('Accepted quantity cannot exceed delivered quantity');
        return;
      }
      if (item.unit_price_ht < 0) {
        setError('Unit price cannot be negative');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('Submitting Delivery Note Form Data:', dataToSubmit);
      if (isEditing) {
        await updateDeliveryNote(id!, dataToSubmit);
      } else {
        await createDeliveryNote(dataToSubmit);
      }
      navigate('/supplier-delivery-notes');
    } catch (err) {
      console.error('Error saving delivery note:', err);
      setError(err instanceof Error ? err.message : (isEditing ? 'Failed to update delivery note' : 'Failed to create delivery note'));
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem: DeliveryNoteItem = {
      item_reference: '',
      item_name: '',
      quantity_delivered: 1,
      quantity_accepted: 1,
      unit_price_ht: 0,
      total_price_ht: 0
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof DeliveryNoteItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate total price
    if (field === 'quantity_accepted' || field === 'unit_price_ht') {
      const item = updatedItems[index];
      item.total_price_ht = item.quantity_accepted * item.unit_price_ht;
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const activePurchaseOrders = purchaseOrders.filter(po => po.status !== 'cancelled');
  const selectedPO = purchaseOrders.find(po => po.id === formData.purchase_order_id);
  const suppliersForSelect = (resolvedSuppliers.length ? resolvedSuppliers : (suppliers || []).map((s: any) => ({ ...s, resolved_id: s?.id ?? s?._id })));

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + item.total_price_ht, 0);
  };

  const getTotalAmountTTC = () => {
    return getTotalAmount() * (1 + formData.tva_rate / 100);
  };

  if (loading && isEditing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              {isEditing ? 'Edit Delivery Note' : 'New Delivery Note'}
            </h2>
            <button
              onClick={() => navigate('/supplier-delivery-notes')}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {selectedPO && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-blue-900 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Détails du Bon de Commande Sélectionné
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  selectedPO.status === 'received' 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-blue-100 text-blue-800 border-blue-200'
                }`}>
                  {selectedPO.status === 'received' ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <FileText className="h-3 w-3 mr-1" />
                  )}
                  {selectedPO.status.toUpperCase()}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-200">
                  <thead>
                    <tr className="text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                      <th className="px-3 py-2">N° Commande</th>
                      <th className="px-3 py-2">Fournisseur</th>
                      <th className="px-3 py-2">Date Commande</th>
                      <th className="px-3 py-2">Date Réception</th>
                      <th className="px-3 py-2 text-right">Montant Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    <tr className="text-sm text-blue-900">
                      <td className="px-3 py-2 font-medium">{selectedPO.orderNumber}</td>
                      <td className="px-3 py-2">
                        {selectedPO.supplierName ||
                          suppliersForSelect.find((s: any) => s.resolved_id === selectedSupplier)?.name ||
                          suppliersForSelect.find((s: any) => s.resolved_id === selectedPO.supplierId)?.name ||
                          ''}
                      </td>
                      <td className="px-3 py-2">{new Date(selectedPO.orderDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{new Date(selectedPO.updatedAt || selectedPO.orderDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right font-bold">{formatCurrency(selectedPO.totalAmount || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Liste des Articles</h4>
                <div className="bg-white rounded border border-blue-100 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-[10px] font-bold text-gray-500 uppercase">
                        <th className="px-3 py-2">Référence</th>
                        <th className="px-3 py-2">Désignation</th>
                        <th className="px-3 py-2 text-center">Qté Commandée</th>
                        <th className="px-3 py-2 text-center">Qté Reçue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedPO.items?.map((item, idx) => (
                        <tr key={idx} className="text-xs text-gray-700 hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono">{item.sku}</td>
                          <td className="px-3 py-2">{item.itemName}</td>
                          <td className="px-3 py-2 text-center font-medium">{item.quantityOrdered}</td>
                          <td className="px-3 py-2 text-center text-green-600 font-bold">{item.quantityReceived}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier *
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                disabled={isEditing}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                required
              >
                <option value="">Select a supplier</option>
                {suppliersForSelect.map((supplier: any, index: number) => (
                  <option
                    key={supplier.resolved_id || supplier.id || supplier._id || supplier.email || supplier.name || index}
                    value={supplier.resolved_id}
                  >
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Order
              </label>
              <select
                value={formData.purchase_order_id || ''}
                onChange={handlePurchaseOrderChange}
                disabled={supplierPOs.length === 0}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">No purchase order</option>
                {supplierPOs.map((po, index) => (
                  <option
                    key={po.id || po.orderNumber || index}
                    value={po.id}
                  >
                    {po.orderNumber} - {new Date(po.orderDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs">
                {poLoading ? (
                  <span className="text-gray-500">Loading purchase orders…</span>
                ) : poError ? (
                  <span className="text-red-600">{poError}</span>
                ) : (
                  <span className="text-gray-500">
                    Loaded: {activePurchaseOrders.length} active purchase orders
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Delivery Date *
              </label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline h-4 w-4 mr-1" />
                TVA Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tva_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, tva_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes..."
            />
          </div>

          {/* Items Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
            </div>

            {formData.items.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
                <p className="mt-1 text-sm text-gray-500">Add items to this delivery note.</p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </button>
                </div>
              </div>
            )}

            {formData.items.length > 0 && (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div
                    key={item.id || item.purchase_order_item_id || `${item.item_reference}-${index}`}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          <Tag className="inline h-3 w-3 mr-1" />
                          Reference *
                        </label>
                        <input
                          type="text"
                          value={item.item_reference}
                          onChange={(e) => updateItem(index, 'item_reference', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Item reference"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Item name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          <Hash className="inline h-3 w-3 mr-1" />
                          Delivered *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity_delivered}
                          onChange={(e) => updateItem(index, 'quantity_delivered', parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          <Check className="inline h-3 w-3 mr-1" />
                          Accepted *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity_delivered}
                          value={item.quantity_accepted}
                          onChange={(e) => updateItem(index, 'quantity_accepted', parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          <DollarSign className="inline h-3 w-3 mr-1" />
                          Unit Price *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price_ht}
                          onChange={(e) => updateItem(index, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-between items-center">
                      <div className="flex-1 mr-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Item notes..."
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          Total: {formatCurrency(item.total_price_ht)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="mt-1 text-red-600 hover:text-red-800 text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total HT:</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(getTotalAmount())}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-gray-700">TVA ({formData.tva_rate}%):</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(getTotalAmount() * (formData.tva_rate / 100))}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                <span className="text-base font-medium text-gray-900">Total TTC:</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(getTotalAmountTTC())}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/supplier-delivery-notes')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryNoteForm;
