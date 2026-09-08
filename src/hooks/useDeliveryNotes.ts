import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useInventoryStore } from '../stores/inventoryStore';
import { deliveryNoteApi } from '../services/deliveryNoteApi';

export interface DeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  purchase_order_item_id?: string;
  item_reference: string;
  item_name: string;
  quantity_delivered: number;
  quantity_accepted: number;
  unit_price_ht: number;
  total_price_ht: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Join fields
  purchase_order_items?: {
    inventory_item_id?: string;
    quantity_ordered: number;
  };
}

export interface DeliveryNote {
  id: string;
  delivery_note_number: string;
  supplier_id: string;
  purchase_order_id: string;
  status: 'draft' | 'validated' | 'invoiced' | 'cancelled';
  delivery_date: string;
  expected_delivery_date?: string; // Not in schema but good to have in type if used in UI
  total_amount_ht: number;
  total_amount_ttc: number;
  tva_rate: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  validated_at?: string;
  validated_by?: string;
  // Relations
  suppliers?: {
    name: string;
    email?: string;
    contact_person?: string;
  };
  purchase_orders?: {
    po_number: string;
    order_date: string;
  };
  supplier_delivery_note_items?: DeliveryNoteItem[];
  delivery_note_invoices?: {
    invoice_id: string;
    allocated_amount_ttc?: number;
    invoices?: {
        invoice_number: string;
        status: string;
        invoice_date?: string;
    }
  }[];
}

export interface DeliveryNoteFilters {
  supplier_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface DeliveryNoteItemInput {
  purchase_order_item_id?: string;
  item_reference: string;
  item_name: string;
  quantity_delivered: number;
  quantity_accepted: number;
  unit_price_ht: number;
  total_price_ht: number;
  notes?: string;
}

export const useDeliveryNotes = (id?: string) => {
  const { user } = useAuth();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveryNotes = useCallback(async (filters?: DeliveryNoteFilters) => {
    setLoading(true);
    setError(null);

    try {
      const notes = await deliveryNoteApi.list(filters);

      const normalizedNotes = (notes as any[]).map((note) => ({
        ...note,
        supplier_delivery_note_items:
          (note as any).supplier_delivery_note_items ||
          (note as any).items ||
          [],
      }));

      setDeliveryNotes(normalizedNotes as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as any)?.message || 'Failed to fetch delivery notes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeliveryNoteById = useCallback(async (noteId: string) => {
    setLoading(true);
    setError(null);

    try {
      const note = await deliveryNoteApi.getById(noteId);

      const normalizedNote: any = {
        ...note,
        supplier_delivery_note_items:
          (note as any).supplier_delivery_note_items ||
          (note as any).items ||
          [],
      };

      setDeliveryNote(normalizedNote);
      return normalizedNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as any)?.message || 'Failed to fetch delivery note');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createDeliveryNote = useCallback(async (data: Partial<DeliveryNote> & { items?: DeliveryNoteItemInput[] }) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { items, ...noteData } = data;

      const delivery_note_number = noteData.delivery_note_number;
      const supplier_id = noteData.supplier_id;
      const purchase_order_id = noteData.purchase_order_id || undefined;
      const delivery_date = noteData.delivery_date;

      if (!supplier_id) {
        throw new Error('Supplier is required for delivery note');
      }
      if (!delivery_date) {
        throw new Error('Delivery date is required for delivery note');
      }
      if (!items || items.length === 0) {
        throw new Error('Please add at least one item to the delivery note');
      }

      const created = await deliveryNoteApi.create({
        delivery_note_number,
        supplier_id,
        purchase_order_id,
        delivery_date,
        notes: noteData.notes,
        items: items.map(item => ({
          purchase_order_item_id: item.purchase_order_item_id,
          item_reference: item.item_reference,
          item_name: item.item_name,
          quantity_delivered: item.quantity_delivered,
          quantity_accepted: item.quantity_accepted,
          unit_price_ht: item.unit_price_ht,
          total_price_ht: item.total_price_ht,
          notes: item.notes,
        })),
      });

      await fetchDeliveryNotes();
      return created as any;
    } catch (err) {
      console.error('Error creating delivery note:', err);
      const message = err instanceof Error ? err.message : (err as any)?.message || 'Failed to create delivery note';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, fetchDeliveryNotes]);

  const updateDeliveryNote = useCallback(async (noteId: string, data: Partial<DeliveryNote> & { items?: DeliveryNoteItemInput[] }) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      const { items, ...noteData } = data;

      if (items) {
        const total_amount_ht = items.reduce((sum, item) => sum + (item.total_price_ht || 0), 0);
        const tva_rate = noteData.tva_rate ?? 20;
        const total_amount_ttc = total_amount_ht * (1 + tva_rate / 100);
        noteData.total_amount_ht = total_amount_ht;
        noteData.total_amount_ttc = total_amount_ttc;
      }

      const updatedNote = await deliveryNoteApi.update(noteId, {
        delivery_note_number: noteData.delivery_note_number,
        supplier_id: noteData.supplier_id,
        purchase_order_id: noteData.purchase_order_id,
        delivery_date: noteData.delivery_date,
        status: noteData.status,
        notes: noteData.notes,
        items: data.items
          ? data.items.map(item => ({
              purchase_order_item_id: item.purchase_order_item_id,
              item_reference: item.item_reference,
              item_name: item.item_name,
              quantity_delivered: item.quantity_delivered,
              quantity_accepted: item.quantity_accepted,
              unit_price_ht: item.unit_price_ht,
              total_price_ht: item.total_price_ht,
              notes: item.notes,
            }))
          : undefined,
      });

      // Refresh the list and current note if it's the one being viewed
      await fetchDeliveryNotes();
      if (id === noteId) {
        await fetchDeliveryNoteById(noteId);
      }
      return updatedNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as any)?.message || 'Failed to update delivery note');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, id, fetchDeliveryNotes, fetchDeliveryNoteById]);

  // Delete delivery note
  const deleteDeliveryNote = useCallback(async (noteId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      await deliveryNoteApi.delete(noteId);

      // Refresh the list
      await fetchDeliveryNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete delivery note');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, fetchDeliveryNotes]);

  // Validate delivery note
  const validateDeliveryNote = useCallback(async (noteId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // First get the current note to calculate totals
      const currentNote = await fetchDeliveryNoteById(noteId);
      if (!currentNote) throw new Error('Delivery note not found');

      if (currentNote.status !== 'draft') {
        throw new Error('Delivery note is not in draft status');
      }

      const currentItems =
        (currentNote as any).supplier_delivery_note_items ||
        (currentNote as any).items ||
        [];

      if (!currentItems || currentItems.length === 0) {
        throw new Error('Cannot validate delivery note without items');
      }

      const seenItemKeys = new Set<string>();
      for (const item of currentItems) {
        const key = `${((item as any).item_reference || (item as any).itemReference || '').toLowerCase()}|${(
          (item as any).item_name || (item as any).itemName || ''
        ).toLowerCase()}`;
        if (seenItemKeys.has(key)) {
          throw new Error('Duplicate item reference and name in delivery note items');
        }
        seenItemKeys.add(key);
      }

      // Calculate totals
      const total_ht = currentItems.reduce(
        (sum: number, item: any) =>
          sum + ((item.total_price_ht ?? item.totalPriceHt) || 0),
        0
      );
      void total_ht;
      const tva_rate = (currentNote as any).tva_rate ?? (currentNote as any).tvaRate ?? 20;
      void tva_rate;

      const validatedNote = await deliveryNoteApi.validate(noteId);

      // Refresh the list and current note
      await fetchDeliveryNotes();
      if (id === noteId) {
        await fetchDeliveryNoteById(noteId);
      }

      const { receiveStock, addInventoryItem, fetchInventoryItems, config } = useInventoryStore.getState();
      const defaults = config.autoCreateDefaults;
      
      // Ensure we have the latest inventory items for matching
      await fetchInventoryItems();
      const updatedInventoryItems = useInventoryStore.getState().inventoryItems;

      if (currentItems && currentItems.length > 0) {
        console.log(`Processing ${currentItems.length} items for stock update...`);
        const stockReference =
          currentNote.delivery_note_number && currentNote.delivery_note_number.trim().length > 0
            ? `DN-${currentNote.delivery_note_number}-${currentNote.id}`
            : `DN-${currentNote.id}`;
        for (const item of currentItems) {
          const quantityAccepted =
            (item as any).quantity_accepted ?? (item as any).quantityAccepted ?? 0;
          const unitPriceHt =
            (item as any).unit_price_ht ?? (item as any).unitPriceHt ?? 0;

          if (quantityAccepted > 0) {
            // Use the inventory_item_id from the joined purchase_order_items if available
            // Note: item.purchase_order_items is an object, not array, based on query
            let inventoryItemId =
              (item as any).purchase_order_items?.inventory_item_id ||
              (item as any).purchaseOrderItem?.inventoryItemId;
            
            if (!inventoryItemId) {
              const reference = (
                (item as any).item_reference ||
                (item as any).itemReference ||
                ''
              ).trim();
              const name = (
                (item as any).item_name ||
                (item as any).itemName ||
                ''
              ).trim();
              const normalizedRef = reference.toLowerCase();
              const normalizedName = name.toLowerCase();
              const isGenericRef = !reference || normalizedRef === 'ref';

              console.log(`Searching for item in inventory: ${reference} / ${name}`);

              const matchedItem = updatedInventoryItems.find(inv => {
                const supplierId = currentNote.supplier_id;
                if (supplierId && inv.supplierId && inv.supplierId !== supplierId) return false;
                const sku = (inv.sku || '').toLowerCase();
                const invName = (inv.name || '').toLowerCase();
                const skuMatch = !isGenericRef && normalizedRef && sku === normalizedRef;
                const nameMatch = normalizedName && invName === normalizedName;
                return skuMatch || nameMatch;
              });

              if (matchedItem) {
                inventoryItemId = matchedItem.id;
                console.log(`Found matched item in inventory: ${matchedItem.name} (ID: ${inventoryItemId})`);
              }
            }
            
            if (!inventoryItemId) {
                console.log(`Item ${item.item_name} not found in inventory, creating new item...`);
                try {
                  const reference = (item.item_reference || '').trim();
                  const name = (item.item_name || '').trim();
                  const normalizedRef = reference.toLowerCase();
                  const isGenericRef = !reference || normalizedRef === 'ref';

                  let skuBase = !isGenericRef ? reference : name;
                  if (!skuBase) {
                    const base = name || 'ITEM';
                    skuBase = `AUTO-${base.substring(0, 5).toUpperCase()}-${Date.now().toString().slice(-4)}`;
                  }

                  const supplierId = currentNote.supplier_id;
                  
                  if (!supplierId) {
                    console.error(`Cannot create inventory item for ${item.item_name}: No supplier ID found in delivery note.`);
                    continue;
                  }

                  const newItem = await addInventoryItem({
                    sku: skuBase,
                    name: item.item_name,
                    description: item.item_name,
                    category: defaults.category as any,
                    quantity: 0,
                    unit: defaults.unit as any,
                    unitCost: item.unit_price_ht,
                    sellingPrice: item.unit_price_ht * (1 + defaults.markupPercentage / 100),
                    taxRate: defaults.taxRate,
                    minimumStock: defaults.minimumStock,
                    maximumStock: defaults.maximumStock,
                    reorderPoint: defaults.reorderPoint,
                    location: defaults.location,
                    supplierId: supplierId,
                    isTaxable: true,
                    isTrackable: true
                  });
                  inventoryItemId = newItem.id;
                  console.log(`Created new inventory item: ${newItem.name} (ID: ${inventoryItemId})`);
                } catch (err) {
                  console.error(`Failed to create inventory item for ${item.item_name}:`, err);
                }
              }

          if (inventoryItemId) {
                console.log(`Calling receiveStock for item ${inventoryItemId}, quantity: ${item.quantity_accepted}`);
                await receiveStock(
                  inventoryItemId,
                  quantityAccepted,
                  unitPriceHt,
                  stockReference,
                  undefined, // batchNumber
                  undefined  // expiryDate
                );
                console.log(`Successfully updated stock for item ${inventoryItemId}`);
              } else {
               console.warn(`Item ${item.item_name} has no linked inventory ID and could not be created, skipping stock update.`);
            }
          }
        }
      }

      return validatedNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate delivery note');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, id, fetchDeliveryNotes, fetchDeliveryNoteById]);

  // Cancel delivery note
  const cancelDeliveryNote = useCallback(async (noteId: string, reason?: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      void reason;
      const currentNote = await fetchDeliveryNoteById(noteId);
      if (!currentNote) throw new Error('Delivery note not found');

      if (currentNote.status === 'cancelled') {
        throw new Error('Delivery note is already cancelled');
      }

      if (currentNote.status === 'invoiced') {
        const links = (currentNote as any).delivery_note_invoices || []
        if (Array.isArray(links) && links.length > 0) {
          throw new Error('Cannot cancel invoiced delivery note')
        }
      }

      const cancelledNote = await deliveryNoteApi.cancel(noteId);

      // Refresh the list and current note
      await fetchDeliveryNotes();
      if (id === noteId) {
        await fetchDeliveryNoteById(noteId);
      }
      return cancelledNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel delivery note');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, id, fetchDeliveryNotes, fetchDeliveryNoteById]);

  // Get delivery notes ready for invoicing
  const getDeliveryNotesReadyForInvoicing = useCallback(async (supplierId?: string) => {
    if (!user) return [];

    setLoading(true);
    setError(null);

    try {
      const notes = await deliveryNoteApi.list({
        status: 'validated',
        ...(supplierId ? { supplier_id: supplierId } : {})
      });

      const normalizedNotes = (notes as any[]).map((note) => ({
        ...note,
        supplier_delivery_note_items:
          (note as any).supplier_delivery_note_items ||
          (note as any).items ||
          [],
      }));

      return normalizedNotes as any;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery notes ready for invoicing');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refetch function
  const refetch = useCallback(() => {
    if (id) {
      fetchDeliveryNoteById(id);
    } else {
      fetchDeliveryNotes();
    }
  }, [id, fetchDeliveryNoteById, fetchDeliveryNotes]);

  // Fetch delivery note if ID is provided
  useEffect(() => {
    if (id) {
      fetchDeliveryNoteById(id);
    }
  }, [id, fetchDeliveryNoteById]);

  return {
    deliveryNotes,
    deliveryNote,
    loading,
    error,
    fetchDeliveryNotes,
    fetchDeliveryNoteById,
    createDeliveryNote,
    updateDeliveryNote,
    deleteDeliveryNote,
    validateDeliveryNote,
    cancelDeliveryNote,
    getDeliveryNotesReadyForInvoicing,
    getDeliveryNoteById: fetchDeliveryNoteById,
    refetch
  };
};
