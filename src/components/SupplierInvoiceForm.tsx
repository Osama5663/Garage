import React, { useState, useEffect, useMemo } from 'react';
import { SupplierInvoice, SupplierInvoiceFormData, PurchaseOrder, Supplier, InventoryItem } from '../types/inventory';
import { formatCurrency, formatDate } from '../utils/formatters';
import { X, Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface SupplierInvoiceFormProps {
  invoice?: SupplierInvoice;
  initialData?: Partial<SupplierInvoiceFormData>;
  onSubmit: (data: SupplierInvoiceFormData) => void;
  onCancel: () => void;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  deliveryNotes?: any[];
  inventoryItems: InventoryItem[];
}

export const SupplierInvoiceForm: React.FC<SupplierInvoiceFormProps> = ({
  invoice,
  initialData,
  onSubmit,
  onCancel,
  suppliers,
  deliveryNotes,
  inventoryItems
}) => {
  const [formData, setFormData] = useState<SupplierInvoiceFormData>({
    supplierId: invoice?.supplierId || initialData?.supplierId || '',
    invoiceNumber: invoice?.invoiceNumber || initialData?.invoiceNumber || '',
    invoiceDate: invoice?.invoiceDate || initialData?.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate || initialData?.dueDate || '',
    purchaseOrderIds: invoice?.purchaseOrderIds || initialData?.purchaseOrderIds || [],
    paymentTerms: invoice?.paymentTerms || initialData?.paymentTerms || 'Net 30',
    currency: invoice?.currency || initialData?.currency || 'USD',
    items: invoice?.items.map(item => ({
      inventoryItemId: item.inventoryItemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      description: item.description
    })) || initialData?.items || [],
    shippingCost: invoice?.shippingCost || initialData?.shippingCost || 0,
    notes: invoice?.notes || initialData?.notes || ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const resolveSupplierIdFromDeliveryNote = (note: any): string => {
    if (!note) return '';

    const direct = suppliers.find(s => s.id === note.supplier_id);
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

    return note.supplier_id;
  };

  const getSupplierNameFromDeliveryNote = (note: any): string => {
    if (!note) return '';
    if (note.suppliers?.name) {
      return note.suppliers.name;
    }
    const resolvedId = resolveSupplierIdFromDeliveryNote(note);
    const supplier = suppliers.find(s => s.id === resolvedId);
    return supplier?.name || 'Fournisseur inconnu';
  };

  // Auto-calculate totals when items change
  useEffect(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * 0.20;
    const totalAmount = subtotal + taxAmount;
    setFormData(prev => ({ ...prev, subtotal, taxAmount, totalAmount }));
  }, [formData.items]);

  // Update supplier info when supplier changes
  useEffect(() => {
    if (formData.supplierId) {
      const supplier = suppliers.find(s => s.id === formData.supplierId);
      if (supplier) {
        // Update form with supplier info if needed
      }
    }
  }, [formData.supplierId, suppliers]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Le numéro de facture est requis';
    }

    if (!formData.supplierId) {
      newErrors.supplierId = 'Le fournisseur est requis';
    }

    if (!formData.invoiceDate) {
      newErrors.invoiceDate = 'La date de la facture est requise';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'La date d\'échéance est requise';
    }

    if (new Date(formData.dueDate) < new Date(formData.invoiceDate)) {
      newErrors.dueDate = 'La date d\'échéance doit être après la date de la facture';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Au moins un article est requis';
    }

    // Validate items
    formData.items.forEach((item, index) => {
      // Relaxed validation: Inventory Item is NOT strictly required if description is present,
      // but strict validation still applies if an ID is provided.
      if (!item.inventoryItemId && !item.description) {
         newErrors[`item_${index}_desc`] = 'Une description ou un article d\'inventaire est requis';
      }

      if (item.inventoryItemId) {
        // Check if the item is in the allowed list (which is filtered by delivery note provenance)
        const isValidItem = inventoryItems.some(inv => inv.id === item.inventoryItemId);
        if (!isValidItem) {
           const msg = 'L\'article sélectionné n\'est pas valide (doit provenir d\'un bon de livraison)';
           newErrors[`item_${index}_inventory`] = msg;
           // Log validation attempt for audit purposes
           console.warn(`[AUDIT] Invoice Validation Failed: Attempted to reference unregistered/invalid item ${item.inventoryItemId} in invoice ${formData.invoiceNumber || 'NEW'}`);
        }
      }

      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'La quantité doit être supérieure à 0';
      }
      if (item.unitPrice <= 0) {
        newErrors[`item_${index}_price`] = 'Le prix unitaire doit être supérieur à 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    } else {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
    }
  };

  const addItem = () => {
    const newItem = {
      inventoryItemId: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0.20,
      description: ''
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    const currentItem = updatedItems[index];
    
    updatedItems[index] = {
      ...currentItem,
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleDNSelection = (noteId: string) => {
    if (!deliveryNotes) return;
    const note = deliveryNotes.find(n => n.id === noteId);
    if (note) {
      const dnItems = note.supplier_delivery_note_items.map((dnItem: any) => {
        let invItemId = dnItem.purchase_order_items?.inventory_item_id || '';

        if (invItemId) {
          const direct = inventoryItems.find(i => i.id === invItemId);
          if (!direct) {
            invItemId = '';
          }
        }

        if (!invItemId) {
          const skuToFind = (dnItem.item_reference || '').trim().toLowerCase();
          const nameToFind = (dnItem.item_name || '').trim().toLowerCase();

          const found = inventoryItems.find(i =>
            (i.sku && i.sku.trim().toLowerCase() === skuToFind) ||
            (i.name && i.name.trim().toLowerCase() === nameToFind)
          );

          if (found) {
            invItemId = found.id;
          } else {
            console.warn(`Could not find inventory item for SKU: ${dnItem.item_reference} or Name: ${dnItem.item_name}`);
          }
        }

        return {
          inventoryItemId: invItemId,
          quantity: dnItem.quantity_accepted,
          unitPrice: dnItem.unit_price_ht,
          taxRate: 0.20,
          description: dnItem.item_name || dnItem.item_reference || '',
          deliveryNoteId: note.id,
          deliveryNoteNumber: note.delivery_note_number
        };
      });

      setFormData(prev => ({
        ...prev,
        // We might want to track linked delivery notes if the backend supports it, 
        // currently mapped via notes or we can repurpose purchaseOrderIds if needed,
        // but for now we just populate items.
        // Also auto-select supplier if not selected
        supplierId: prev.supplierId || resolveSupplierIdFromDeliveryNote(note),
        items: [...prev.items, ...dnItems],
        notes: prev.notes ? `${prev.notes}\nCréé à partir du bon de livraison: ${note.delivery_note_number}` : `Créé à partir du bon de livraison: ${note.delivery_note_number}`
      }));
    }
  };

  const groupedItems = useMemo(() => {
    const groups: { key: string; label: string; itemIndices: number[] }[] = [];
    const byKey = new Map<string, { key: string; label: string; itemIndices: number[] }>();

    formData.items.forEach((item, index) => {
      const dnNumber = (item as any).deliveryNoteNumber as string | undefined;
      const key = dnNumber || 'NO_BL';
      const label = dnNumber ? `BL ${dnNumber}` : 'Sans BL';

      const existing = byKey.get(key);
      if (existing) {
        existing.itemIndices.push(index);
      } else {
        const group = { key, label, itemIndices: [index] };
        byKey.set(key, group);
        groups.push(group);
      }
    });

    return groups;
  }, [formData.items]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {invoice ? 'Modifier la facture fournisseur' : 'Créer une facture fournisseur'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de facture *
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.invoiceNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="FA-2024-001"
              />
              {errors.invoiceNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.invoiceNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fournisseur *
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.supplierId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
              {errors.supplierId && (
                <p className="text-red-500 text-xs mt-1">{errors.supplierId}</p>
              )}
            </div>


          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de la facture *
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.invoiceDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.invoiceDate && (
                <p className="text-red-500 text-xs mt-1">{errors.invoiceDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'échéance *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dueDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.dueDate && (
                <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conditions de paiement
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Net 30"
              />
            </div>
          </div>

          {/* Delivery Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lier à un bon de livraison (Recommandé)
            </label>
            <select
              onChange={(e) => e.target.value && handleDNSelection(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="">Sélectionner un bon de livraison pour ajouter des articles</option>
              {deliveryNotes && deliveryNotes
                .filter(note => {
                  if (!formData.supplierId) return true;
                  const resolvedId = resolveSupplierIdFromDeliveryNote(note);
                  return resolvedId === formData.supplierId;
                })
                .map(note => (
                  <option key={note.id} value={note.id}>
                    {note.delivery_note_number} - {formatDate(note.delivery_date)} - {getSupplierNameFromDeliveryNote(note)}
                  </option>
                ))}
            </select>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Détails de la facture</h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter un article</span>
              </button>
            </div>

            {errors.items && (
              <p className="text-red-600 text-xs mb-2" role="alert">{errors.items}</p>
            )}

            <div className="bg-white border rounded-md divide-y">
              {formData.items.length > 0 ? (
                groupedItems.map(group => (
                  <div key={group.key}>
                    <div className="px-3 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-600">
                      {group.label}
                    </div>
                    {group.itemIndices.map(index => {
                      const item = formData.items[index];
                      return (
                        <div key={index} className="p-3">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-4">
                        <label className="sr-only" htmlFor={`desc-${index}`}>Description *</label>
                        <input
                          id={`desc-${index}`}
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className={`w-full border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            !item.description ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Description / Référence de l'article"
                        />
                        
                        {/* Hidden Inventory ID or Small Badge */}
                        {item.inventoryItemId && (
                           <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                             <span className="w-2 h-2 rounded-full bg-green-500"></span>
                             Lié à l'inventaire
                           </div>
                        )}
                        
                        {/* Optional Inventory Selection (Hidden by default unless needed) */}
                        {!item.inventoryItemId && (
                          <div className="mt-1">
                             <select
                              value={item.inventoryItemId}
                              onChange={(e) => updateItem(index, 'inventoryItemId', e.target.value)}
                              className="text-xs w-full border border-gray-200 rounded px-1 py-0.5 text-gray-500"
                            >
                              <option value="">(Optionnel) Lier à un article d'inventaire...</option>
                              {inventoryItems.map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="sr-only" htmlFor={`qty-${index}`}>Quantité *</label>
                        <input
                          id={`qty-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className={`w-full border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          aria-invalid={!!errors[`item_${index}_quantity`]}
                          aria-describedby={errors[`item_${index}_quantity`] ? `qty-${index}-error` : undefined}
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p id={`qty-${index}-error`} className="text-red-600 text-xs mt-1">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="sr-only" htmlFor={`price-${index}`}>Prix unitaire *</label>
                        <input
                          id={`price-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className={`w-full border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          aria-invalid={!!errors[`item_${index}_price`]}
                          aria-describedby={errors[`item_${index}_price`] ? `price-${index}-error` : undefined}
                        />
                        {errors[`item_${index}_price`] && (
                          <p id={`price-${index}-error`} className="text-red-600 text-xs mt-1">{errors[`item_${index}_price`]}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="sr-only" htmlFor={`tax-${index}`}>Taux de taxe</label>
                        <input
                          id={`tax-${index}`}
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.10"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="sr-only" htmlFor={`total-${index}`}>Total</label>
                        <input
                          id={`total-${index}`}
                          type="text"
                          value={formatCurrency(item.quantity * item.unitPrice)}
                          readOnly
                          className="w-full border border-gray-300 rounded-md px-2 py-1 bg-gray-50"
                        />
                      </div>

                      <div className="md:col-span-1 flex items-center justify-end md:justify-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Supprimer l'article"
                          aria-label="Supprimer l'article"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>Il n'y a aucun article sur cette facture.</p>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarques</label>
                <input
                  type="text"
                  value={formatCurrency(formData.subtotal || 0)}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxe (20%)</label>
                <input
                  type="text"
                  value={formatCurrency(formData.taxAmount || 0)}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant total</label>
                <input
                  type="text"
                  value={formatCurrency(formData.totalAmount || 0)}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Remarques supplémentaires..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {invoice ? 'Mettre à jour la facture' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
