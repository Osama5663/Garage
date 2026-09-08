import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import supplierDeliveryNoteApi, { DeliveryNote, DeliveryNoteFilters } from '../services/supplierDeliveryNoteApi';
import { useAuthStore } from './authStore';
import { useInventoryStore } from './inventoryStore';

interface SupplierDeliveryNoteState {
  deliveryNotes: DeliveryNote[];
  currentDeliveryNote: DeliveryNote | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: DeliveryNoteFilters;
}

interface SupplierDeliveryNoteActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: DeliveryNoteFilters) => void;
  setPagination: (pagination: Partial<SupplierDeliveryNoteState['pagination']>) => void;
  
  // CRUD operations
  fetchDeliveryNotes: () => Promise<void>;
  fetchDeliveryNote: (id: string) => Promise<void>;
  createDeliveryNote: (deliveryNote: Omit<DeliveryNote, 'id' | 'delivery_note_number' | 'status' | 'total_amount_ht' | 'total_amount_ttc' | 'created_at' | 'updated_at'>) => Promise<DeliveryNote>;
  updateDeliveryNote: (id: string, deliveryNote: Omit<DeliveryNote, 'id' | 'delivery_note_number' | 'status' | 'total_amount_ht' | 'total_amount_ttc' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDeliveryNoteStatus: (id: string, status: 'draft' | 'validated' | 'invoiced' | 'cancelled') => Promise<void>;
  deleteDeliveryNote: (id: string) => Promise<void>;
  
  // Specialized operations
  fetchDeliveryNotesByPurchaseOrder: (poId: string) => Promise<DeliveryNote[]>;
  fetchDeliveryNotesReadyForInvoice: (supplierId: string, startDate?: string, endDate?: string) => Promise<DeliveryNote[]>;
  
  // Utility
  clearCurrentDeliveryNote: () => void;
  clearError: () => void;
}

const useSupplierDeliveryNoteStore = create<SupplierDeliveryNoteState & SupplierDeliveryNoteActions>()(
  devtools(
    (set, get) => ({
      // Initial state
      deliveryNotes: [],
      currentDeliveryNote: null,
      loading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
      },
      filters: {},

      // Actions
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setFilters: (filters) => set({ filters }),
      
      setPagination: (pagination) => set((state) => ({
        pagination: { ...state.pagination, ...pagination }
      })),

      // Fetch all delivery notes
      fetchDeliveryNotes: async () => {
        const { filters, pagination } = get();
        set({ loading: true, error: null });
        
        try {
          const response = await supplierDeliveryNoteApi.getDeliveryNotes({
            ...filters,
            page: pagination.page,
            limit: pagination.limit
          });
          
          set({
            deliveryNotes: response.data,
            pagination: response.pagination || get().pagination,
            loading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch delivery notes',
            loading: false
          });
        }
      },

      // Fetch single delivery note
      fetchDeliveryNote: async (id: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await supplierDeliveryNoteApi.getDeliveryNote(id);
          set({
            currentDeliveryNote: response.data,
            loading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch delivery note',
            loading: false
          });
        }
      },

      // Create delivery note
      createDeliveryNote: async (deliveryNote) => {
        set({ loading: true, error: null });
        
        try {
          const response = await supplierDeliveryNoteApi.createDeliveryNote(deliveryNote);
          const created = response.data;
          const authState = useAuthStore.getState();
          const number = created.delivery_note_number || created.reference || created.id;

          set((state) => ({
            deliveryNotes: [created, ...state.deliveryNotes],
            loading: false
          }));

          authState.logActivity(
            'DOCUMENT_CREATED',
            {
              documentType: 'supplier_delivery_note',
              documentNumber: number,
              supplierDeliveryNoteId: created.id,
              supplierName: created.supplier_name
            },
            'documents',
            created.id
          );

          return created;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create delivery note',
            loading: false
          });
          throw error;
        }
      },

      // Update delivery note
      updateDeliveryNote: async (id, deliveryNote) => {
        set({ loading: true, error: null });
        
        try {
          const response = await supplierDeliveryNoteApi.updateDeliveryNote(id, deliveryNote);
          const updated = response.data;
          const authState = useAuthStore.getState();
          const number = updated.delivery_note_number || updated.reference || updated.id;

          set((state) => ({
            deliveryNotes: state.deliveryNotes.map(dn => 
              dn.id === id ? updated : dn
            ),
            currentDeliveryNote: state.currentDeliveryNote?.id === id ? updated : state.currentDeliveryNote,
            loading: false
          }));

          authState.logActivity(
            'DOCUMENT_UPDATED',
            {
              documentType: 'supplier_delivery_note',
              documentNumber: number,
              supplierDeliveryNoteId: id
            },
            'documents',
            id
          );
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update delivery note',
            loading: false
          });
          throw error;
        }
      },

      // Update delivery note status
      updateDeliveryNoteStatus: async (id, status) => {
        set({ loading: true, error: null });
        
        try {
          const before =
            get().deliveryNotes.find(dn => dn.id === id) ||
            get().currentDeliveryNote;
          const wasValidated = before?.status === 'validated';

          const response = await supplierDeliveryNoteApi.updateDeliveryNoteStatus(id, status);
          const updated = response.data;
          set((state) => ({
            deliveryNotes: state.deliveryNotes.map(dn => 
              dn.id === id ? updated : dn
            ),
            currentDeliveryNote: state.currentDeliveryNote?.id === id ? updated : state.currentDeliveryNote,
            loading: false
          }));

          if (status === 'validated' && !wasValidated) {
            const hydrated = updated?.items?.length
              ? updated
              : (await supplierDeliveryNoteApi.getDeliveryNote(id)).data;

            const { receiveStock, addInventoryItem, fetchInventoryItems, config } = useInventoryStore.getState();
            const defaults = config.autoCreateDefaults;
            await fetchInventoryItems();
            const updatedInventoryItems = useInventoryStore.getState().inventoryItems;

            const noteId = hydrated.id || id;
            const noteNumber = (hydrated.delivery_note_number || hydrated.reference || '').trim();
            const stockReference = noteNumber.length > 0 ? `DN-${noteNumber}-${noteId}` : `DN-${noteId}`;
            const supplierId = hydrated.supplier_id;

            for (const item of hydrated.items || []) {
              const quantityAccepted = item.quantity_accepted ?? 0;
              const unitPriceHt = item.unit_price_ht ?? 0;
              if (quantityAccepted <= 0) continue;

              const reference = (item.item_reference || '').trim();
              const name = (item.item_name || '').trim();
              const normalizedRef = reference.toLowerCase();
              const normalizedName = name.toLowerCase();
              const isGenericRef = !reference || normalizedRef === 'ref';

              let inventoryItemId: string | undefined;
              const matchedItem = updatedInventoryItems.find(inv => {
                if (supplierId && inv.supplierId && inv.supplierId !== supplierId) return false;
                const sku = (inv.sku || '').toLowerCase();
                const invName = (inv.name || '').toLowerCase();
                const skuMatch = !isGenericRef && normalizedRef && sku === normalizedRef;
                const nameMatch = normalizedName && invName === normalizedName;
                return skuMatch || nameMatch;
              });

              if (matchedItem) {
                inventoryItemId = matchedItem.id;
              }

              if (!inventoryItemId) {
                if (supplierId) {
                  let skuBase = !isGenericRef ? reference : name;
                  if (!skuBase) {
                    const base = name || 'ITEM';
                    skuBase = `AUTO-${base.substring(0, 5).toUpperCase()}-${Date.now().toString().slice(-4)}`;
                  }

                  const newItem = await addInventoryItem({
                    sku: skuBase,
                    name: name || reference || 'Item',
                    description: name || reference || 'Item',
                    category: defaults.category as any,
                    quantity: 0,
                    unit: defaults.unit as any,
                    unitCost: unitPriceHt,
                    sellingPrice: unitPriceHt * (1 + defaults.markupPercentage / 100),
                    taxRate: defaults.taxRate,
                    minimumStock: defaults.minimumStock,
                    maximumStock: defaults.maximumStock,
                    reorderPoint: defaults.reorderPoint,
                    location: defaults.location,
                    supplierId,
                    isTaxable: true,
                    isTrackable: true
                  });

                  inventoryItemId = newItem.id;
                }
              }

              if (inventoryItemId) {
                await receiveStock(inventoryItemId, quantityAccepted, unitPriceHt, stockReference);
              }
            }
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update delivery note status',
            loading: false
          });
          throw error;
        }
      },

      // Delete delivery note
      deleteDeliveryNote: async (id: string) => {
        set({ loading: true, error: null });
        
        try {
          const existing = get().deliveryNotes.find(dn => dn.id === id) || get().currentDeliveryNote;

          await supplierDeliveryNoteApi.deleteDeliveryNote(id);

          const authState = useAuthStore.getState();
          const number = existing?.delivery_note_number || existing?.reference || id;

          set((state) => ({
            deliveryNotes: state.deliveryNotes.filter(dn => dn.id !== id),
            currentDeliveryNote: state.currentDeliveryNote?.id === id ? null : state.currentDeliveryNote,
            loading: false
          }));

          if (existing) {
            authState.logActivity(
              'DOCUMENT_DELETED',
              {
                documentType: 'supplier_delivery_note',
                documentNumber: number,
                supplierDeliveryNoteId: id
              },
              'documents',
              id
            );
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete delivery note',
            loading: false
          });
          throw error;
        }
      },

      // Fetch delivery notes by purchase order
      fetchDeliveryNotesByPurchaseOrder: async (poId: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await supplierDeliveryNoteApi.getDeliveryNotesByPurchaseOrder(poId);
          set({ loading: false });
          return response.data;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch delivery notes by purchase order',
            loading: false
          });
          throw error;
        }
      },

      // Fetch delivery notes ready for invoice
      fetchDeliveryNotesReadyForInvoice: async (supplierId: string, startDate?: string, endDate?: string) => {
        set({ loading: true, error: null });
        
        try {
          const response = await supplierDeliveryNoteApi.getDeliveryNotesReadyForInvoice(supplierId, startDate, endDate);
          set({ loading: false });
          return response.data;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch delivery notes ready for invoice',
            loading: false
          });
          throw error;
        }
      },

      // Utility functions
      clearCurrentDeliveryNote: () => set({ currentDeliveryNote: null }),
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'supplier-delivery-note-store'
    }
  )
);

export default useSupplierDeliveryNoteStore;
