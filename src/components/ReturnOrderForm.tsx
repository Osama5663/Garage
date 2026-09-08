import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Package, 
  FileText,
  AlertTriangle,
  Calculator,
  CheckCircle
} from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { ReturnOrderFormData, ReturnOrderItem, ReturnReason } from '../types/inventory';
import { useDeliveryNotes, DeliveryNote } from '../hooks/useDeliveryNotes';
import { t } from '../i18n';
import { formatCurrency } from '../utils/formatters';

interface ReturnOrderFormProps {
  onSubmit: (formData: ReturnOrderFormData) => void;
  onCancel: () => void;
  initialData?: ReturnOrderFormData;
  initialDeliveryNoteId?: string;
}

export const ReturnOrderForm: React.FC<ReturnOrderFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  initialDeliveryNoteId
}) => {
  const { inventoryItems, suppliers } = useInventoryStore();
  const { deliveryNotes, fetchDeliveryNotes } = useDeliveryNotes();

  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState<DeliveryNote | null>(null);
  const [noteItems, setNoteItems] = useState<ReturnOrderItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<ReturnOrderItem[]>([]);
  const [returnReason, setReturnReason] = useState<ReturnReason>('defective');
  const [returnReasonDetails, setReturnReasonDetails] = useState('');
  const [returnMethod, setReturnMethod] = useState<'pickup' | 'drop_off' | 'mail' | 'courier'>('pickup');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveSupplierIdFromDeliveryNote = (note: DeliveryNote | null): string => {
    if (!note) return '';

    const rawSupplierId: any = (note as any).supplier_id;

    let candidateId: string | null = null;

    if (typeof rawSupplierId === 'string') {
      candidateId = rawSupplierId;
    } else if (rawSupplierId && typeof rawSupplierId === 'object') {
      if (typeof rawSupplierId.id === 'string') {
        candidateId = rawSupplierId.id;
      } else if (typeof rawSupplierId._id === 'string') {
        candidateId = rawSupplierId._id;
      }
    }

    if (candidateId) {
      const directFromCandidate = suppliers.find(s => s.id === candidateId);
      if (directFromCandidate) {
        return directFromCandidate.id;
      }
    }

    const direct = suppliers.find(s => s.id === rawSupplierId);
    if (direct) {
      return direct.id;
    }

    const email = note.suppliers?.email ? String(note.suppliers.email).toLowerCase() : '';
    if (email) {
      const byEmail = suppliers.find(s => s.email && s.email.toLowerCase() === email);
      if (byEmail) {
        return byEmail.id;
      }
    }

    const name = note.suppliers?.name ? String(note.suppliers.name).toLowerCase() : '';
    if (name) {
      const byName = suppliers.find(s => s.name.toLowerCase() === name);
      if (byName) {
        return byName.id;
      }
    }

    const supplierIdStr = candidateId ?? (rawSupplierId != null ? String(rawSupplierId) : '');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supplierIdStr);
    if (!isUuid && supplierIdStr) {
      const byNonUuidId = suppliers.find(s => s.name.toLowerCase() === supplierIdStr.toLowerCase());
      if (byNonUuidId) {
        return byNonUuidId.id;
      }
    }

    return supplierIdStr;
  };

  useEffect(() => {
    fetchDeliveryNotes({ status: 'validated' });
  }, [fetchDeliveryNotes]);

  const eligibleDeliveryNotes = useMemo(() => {
    return deliveryNotes.filter(note => {
      const items = note.supplier_delivery_note_items || [];
      return note.status === 'validated' && items.length > 0;
    });
  }, [deliveryNotes]);

  useEffect(() => {
    if (!selectedDeliveryNote && initialDeliveryNoteId && deliveryNotes.length > 0) {
      const note = deliveryNotes.find(n => n.id === initialDeliveryNoteId);
      if (note) {
        setSelectedDeliveryNote(note);
      }
    }
  }, [initialDeliveryNoteId, deliveryNotes, selectedDeliveryNote]);

  // When delivery note is selected, prepare the items for return
  useEffect(() => {
    if (selectedDeliveryNote) {
      const preparedItems: ReturnOrderItem[] = (selectedDeliveryNote.supplier_delivery_note_items || [])
        .map((item) => {
          let inventoryItemId =
            (item as any).purchase_order_items?.inventory_item_id ||
            (item as any).purchase_order_items?.inventoryItemId;

          if (!inventoryItemId) {
            const reference = (item.item_reference || '').trim().toLowerCase();
            const name = (item.item_name || '').trim().toLowerCase();

            const matchedItem = inventoryItems.find(inv => {
              const sku = (inv.sku || '').trim().toLowerCase();
              const invName = (inv.name || '').trim().toLowerCase();
              const skuMatch = reference && sku === reference;
              const nameMatch = name && invName === name;
              return skuMatch || nameMatch;
            });

            if (matchedItem) {
              inventoryItemId = matchedItem.id;
            }
          }

          if (!inventoryItemId) return null;

          const inventoryItem = inventoryItems.find(inv => inv.id === inventoryItemId);
          if (!inventoryItem || inventoryItem.quantity <= 0 || !inventoryItem.isActive) {
            return null;
          }

          return {
            id: `temp_${item.id}`, // Temporary ID
            inventoryItemId: inventoryItemId,
            itemName: item.item_name || inventoryItem.name,
            sku: item.item_reference || inventoryItem.sku,
            quantityReturned: 0, // Start with 0, user will set the quantity
            maxQuantity: Math.min(item.quantity_accepted, inventoryItem.quantity), // Can't return more than delivered/accepted or current stock
            unitCost: item.unit_price_ht ?? 0,
            totalCost: 0,
            condition: 'new' as const, // Default, will be ignored by form logic unless needed
            status: 'pending' as const,
            notes: ''
          };
        })
        .filter(Boolean) as ReturnOrderItem[];
      
      setNoteItems(preparedItems);
      setSelectedItems([]);
    } else {
      setNoteItems([]);
      setSelectedItems([]);
    }
  }, [selectedDeliveryNote, inventoryItems]);

  // Calculate totals
  const calculateTotals = useMemo(() => {
    const subtotal = selectedItems.reduce((total, item) => {
      const unit = typeof item.unitCost === 'number' ? item.unitCost : 0;
      return total + (item.quantityReturned * unit);
    }, 0);
    
    const totalItems = selectedItems.reduce((total, item) => {
      return total + item.quantityReturned;
    }, 0);

    return {
      subtotal,
      totalItems,
      formattedSubtotal: subtotal.toFixed(2)
    };
  }, [selectedItems]);

  const handleItemQuantityChange = (itemId: string, quantity: number) => {
    if (quantity < 0) return;
    
    const item = noteItems.find(i => i.inventoryItemId === itemId);
    if (!item) return;
    
    const maxQ = item.maxQuantity ?? 0;
    if (quantity > maxQ) {
      setErrors({ ...errors, [`item_${itemId}`]: t('returnOrderForm.errors.cannotReturnMore').replace('{{max}}', maxQ.toString()) });
      return;
    }
    
    // Clear any existing error for this item
    const newErrors = { ...errors };
    delete newErrors[`item_${itemId}`];
    setErrors(newErrors);
    
    const updatedItem = { ...item, quantityReturned: quantity };
    
    setSelectedItems(prev => {
      const existing = prev.find(i => i.inventoryItemId === itemId);
      if (quantity === 0) {
        // Remove item if quantity is 0
        return prev.filter(i => i.inventoryItemId !== itemId);
      } else if (existing) {
        // Update existing item
        return prev.map(i => i.inventoryItemId === itemId ? updatedItem : i);
      } else {
        // Add new item
        return [...prev, updatedItem];
      }
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedDeliveryNote) {
      newErrors.deliveryNote = t('returnOrderForm.errors.deliveryNoteRequired');
    }

    if (selectedItems.length === 0) {
      newErrors.items = t('returnOrderForm.errors.itemsRequired');
    }

    // Check if any item has quantity > 0
    const hasValidQuantities = selectedItems.some(item => item.quantityReturned > 0);
    if (selectedItems.length > 0 && !hasValidQuantities) {
      newErrors.items = t('returnOrderForm.errors.quantitiesRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!selectedDeliveryNote) return;

      const supplierId = resolveSupplierIdFromDeliveryNote(selectedDeliveryNote);

      const formData: ReturnOrderFormData = {
        supplierId,
        purchaseOrderId: selectedDeliveryNote.purchase_order_id,
        deliveryNoteId: selectedDeliveryNote.id,
        deliveryNoteNumber: selectedDeliveryNote.delivery_note_number,
        items: selectedItems.map(item => ({
          inventoryItemId: item.inventoryItemId,
          quantityReturned: item.quantityReturned,
          condition: 'new', // Default
          conditionNotes: '',
          notes: ''
        })),
        returnReason,
        returnReasonDetails,
        returnMethod,
        notes
      };

      await onSubmit(formData);
      
    } catch (error) {
      console.error('Error creating return order:', error);
      setErrors({ submit: t('returnOrderForm.errors.submitFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {initialData ? t('returnOrderForm.header.edit') : t('returnOrderForm.header.create')}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Delivery Note */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {t('returnOrderForm.sections.selectDeliveryNote')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dn-select" className="block text-sm font-medium text-gray-700 mb-2">
                {t('returnOrderForm.labels.deliveryNoteNumber')}
              </label>
              <select
                id="dn-select"
                value={selectedDeliveryNote?.id || ''}
                onChange={(e) => {
                  const note = deliveryNotes.find(n => n.id === e.target.value);
                  setSelectedDeliveryNote(note || null);
                }}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.deliveryNote ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">{t('returnOrderForm.labels.selectDeliveryNote')}</option>
                {eligibleDeliveryNotes.map(note => (
                  <option key={note.id} value={note.id}>
                    {note.delivery_note_number} - {note.suppliers?.name || 'Unknown'} ({new Date(note.delivery_date).toLocaleDateString('fr-FR')})
                  </option>
                ))}
              </select>
              {errors.deliveryNote && (
                <p className="text-red-500 text-sm mt-1">{errors.deliveryNote}</p>
              )}
            </div>

            {selectedDeliveryNote && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">{t('returnOrderForm.labels.supplier')}</span>
                  <span className="ml-2 text-gray-900">{selectedDeliveryNote.suppliers?.name}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">{t('returnOrderForm.labels.poNumber')}</span>
                  <span className="ml-2 text-gray-900">{selectedDeliveryNote.purchase_orders?.po_number || 'N/A'}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">{t('returnOrderForm.labels.deliveryDate')}</span>
                  <span className="ml-2 text-gray-900">{new Date(selectedDeliveryNote.delivery_date).toLocaleDateString('fr-FR')}</span>
                </div>
              <div className="text-sm">
                <span className="font-medium text-gray-700">{t('returnOrderForm.labels.totalAmount')}</span>
                <span className="ml-2 text-gray-900">
                  {formatCurrency(selectedDeliveryNote.total_amount_ttc || 0)}
                </span>
              </div>
              </div>
            )}
          </div>

          {eligibleDeliveryNotes.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">{t('returnOrderForm.warnings.noEligibleNotes')}</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {t('returnOrderForm.warnings.noEligibleNotesDesc')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select Items and Quantities */}
        {selectedDeliveryNote && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {t('returnOrderForm.sections.selectItems')}
            </h3>

            {noteItems.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">{t('returnOrderForm.warnings.noItemsAvailable')}</h4>
                <p className="text-gray-600">
                  {t('returnOrderForm.warnings.noItemsAvailableDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
                  <div className="col-span-4">{t('returnOrderForm.labels.item')}</div>
                  <div className="col-span-2">{t('returnOrderForm.labels.sku')}</div>
                  <div className="col-span-2">{t('returnOrderForm.labels.unitCost')}</div>
                  <div className="col-span-2">{t('returnOrderForm.labels.available')}</div>
                  <div className="col-span-2">{t('returnOrderForm.labels.returnQty')}</div>
                </div>

                {noteItems.map((item) => (
                  <div key={item.inventoryItemId} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100">
                    <div className="col-span-4">
                      <div className="font-medium text-gray-900">{item.itemName}</div>
                    </div>
                <div className="col-span-2 text-sm text-gray-600">{item.sku}</div>
                <div className="col-span-2 text-sm text-gray-600">
                  {formatCurrency(Number(item.unitCost ?? 0))}
                </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        (item.maxQuantity ?? 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.maxQuantity ?? 0} {t('returnOrderForm.labels.available').toLowerCase()}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        max={item.maxQuantity ?? 0}
                        value={selectedItems.find(i => i.inventoryItemId === item.inventoryItemId)?.quantityReturned || 0}
                        onChange={(e) => handleItemQuantityChange(item.inventoryItemId, parseInt(e.target.value) || 0)}
                        className={`w-full px-2 py-1 border rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${item.inventoryItemId}`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        disabled={(item.maxQuantity ?? 0) === 0}
                      />
                      {errors[`item_${item.inventoryItemId}`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`item_${item.inventoryItemId}`]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {errors.items && (
              <p className="text-red-500 text-sm mt-4">{errors.items}</p>
            )}
          </div>
        )}

        {/* Step 3: Return Details */}
        {selectedDeliveryNote && noteItems.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              {t('returnOrderForm.sections.returnDetails')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="return-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('returnOrderForm.labels.returnReason')}
                </label>
                <select
                  id="return-reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="defective">{t('returnOrderForm.reasons.defective')}</option>
                  <option value="damaged">{t('returnOrderForm.reasons.damaged')}</option>
                  <option value="incorrect_item">{t('returnOrderForm.reasons.incorrect_item')}</option>
                  <option value="excess_inventory">{t('returnOrderForm.reasons.excess_inventory')}</option>
                  <option value="expired">{t('returnOrderForm.reasons.expired')}</option>
                  <option value="quality_issue">{t('returnOrderForm.reasons.quality_issue')}</option>
                  <option value="incorrect_order">{t('returnOrderForm.reasons.incorrect_order')}</option>
                  <option value="other">{t('returnOrderForm.reasons.other')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="return-method" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('returnOrderForm.labels.returnMethod')}
                </label>
                <select
                  id="return-method"
                  value={returnMethod}
                  onChange={(e) => setReturnMethod(e.target.value as 'pickup' | 'drop_off' | 'mail' | 'courier')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pickup">{t('returnOrderForm.methods.pickup')}</option>
                  <option value="drop_off">{t('returnOrderForm.methods.drop_off')}</option>
                  <option value="mail">{t('returnOrderForm.methods.mail')}</option>
                  <option value="courier">{t('returnOrderForm.methods.courier')}</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="return-reason-details" className="block text-sm font-medium text-gray-700 mb-2">
                {t('returnOrderForm.labels.reasonDetails')}
              </label>
              <textarea
                id="return-reason-details"
                value={returnReasonDetails}
                onChange={(e) => setReturnReasonDetails(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('returnOrderForm.labels.reasonDetailsPlaceholder')}
              />
            </div>

            <div className="mt-4">
              <label htmlFor="additional-notes" className="block text-sm font-medium text-gray-700 mb-2">
                {t('returnOrderForm.labels.additionalNotes')}
              </label>
              <textarea
                id="additional-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('returnOrderForm.labels.additionalNotesPlaceholder')}
              />
            </div>
          </div>
        )}

        {/* Action bar */}
        {selectedDeliveryNote && noteItems.length > 0 && selectedItems.length === 0 && (
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t('returnOrderForm.labels.cancel')}
            </button>
            <button
              type="submit"
              disabled={true}
              className="px-6 py-2 rounded-md text-white font-medium bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={t('returnOrderForm.errors.itemsRequired')}
            >
              {t('returnOrderForm.labels.processReturn')}
            </button>
          </div>
        )}

        {/* Summary and Submit */}
        {selectedDeliveryNote && selectedItems.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
              {t('returnOrderForm.sections.summary')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{calculateTotals.totalItems}</div>
                <div className="text-sm text-gray-600">{t('returnOrderForm.labels.itemsToReturn')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculateTotals.subtotal)}
                </div>
                <div className="text-sm text-gray-600">{t('returnOrderForm.labels.totalValue')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedDeliveryNote.suppliers?.name}</div>
                <div className="text-sm text-gray-600">{t('returnOrderForm.labels.supplier')}</div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {t('returnOrderForm.labels.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedItems.length === 0}
                className={`px-6 py-2 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isSubmitting || selectedItems.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? t('returnOrderForm.labels.processing') : t('returnOrderForm.labels.processReturn')}
              </button>
            </div>

            {errors.submit && (
              <p className="text-red-500 text-sm mt-4 text-center">{errors.submit}</p>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
