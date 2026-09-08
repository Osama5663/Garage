import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid';
import { DeliveryNote, DeliveryNotePart, DeliveryNoteLabor, DeliveryNoteConversionData, DeliveryNoteFormData } from '../types/deliveryNote'
import {
  calculateTotals,
  updatePartQuantityBL,
  computePartsFromJobOrder,
  computeLaborFromJobOrder,
  validateDeliveryNoteInput
} from '../services/deliveryNoteBL.js'
import { registerStore, getStore } from './storeRegistry';
import { useAuthStore } from './authStore';
import { useJobOrderStore } from './jobOrderStore';
import { createServerStateStorage } from '../services/api'

// Define a proper filter type for delivery notes
export interface DeliveryNoteFilter {
  searchTerm?: string
  status?: DeliveryNote['status'][]
  customerId?: string
  jobOrderId?: string
  dateFrom?: string
  dateTo?: string
  supplier_id?: string
}

interface DeliveryNoteState {
  deliveryNotes: DeliveryNote[]
  selectedDeliveryNote: DeliveryNote | null
  loading: boolean
  error: string | null
  filters: DeliveryNoteFilter
  auditLogs: any[] // Added for tracking
  versionHistory: Record<string, Partial<DeliveryNote>[]> // Added for versioning
  
  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: DeliveryNoteFilter) => void
  setSelectedDeliveryNote: (deliveryNote: DeliveryNote | null) => void
  
  // CRUD operations
  fetchDeliveryNotes: () => Promise<DeliveryNote[] | undefined>
  fetchDeliveryNote: (id: string) => Promise<void>
  createDeliveryNote: (data: DeliveryNoteFormData, jobOrderData: any) => Promise<DeliveryNote | undefined>
  updateDeliveryNote: (id: string, data: Partial<DeliveryNote>, reason?: string) => Promise<void>
  deleteDeliveryNote: (id: string) => Promise<void>
  softDeleteDeliveryNotes: (ids: string[]) => { success: boolean, deleted: string[] }
  restoreDeliveryNote: (id: string) => { success: boolean }
  
  // Status and Workflow
  updateDeliveryNoteStatus: (id: string, status: DeliveryNote['status'], reason?: string) => Promise<void>
  updateDeliveryNoteValidated: (id: string, data: Partial<DeliveryNote>) => { success: boolean, errors?: string[] }
  validateDeliveryNote: (id: string) => Promise<void>
  cancelDeliveryNote: (id: string) => Promise<void>
  convertToInvoice: (id: string, options?: DeliveryNoteConversionData) => Promise<string | undefined>

  // Part & Labor Management
  addPartToDeliveryNote: (id: string, part: DeliveryNotePart) => Promise<void>
  removePartFromDeliveryNote: (id: string, partId: string) => Promise<void>
  updatePartQuantity: (id: string, partId: string, quantity: number) => Promise<void>
  updateLaborItem: (id: string, labor: DeliveryNoteLabor) => Promise<void>
  syncDeliveryNoteFromJobOrder: (jobOrderId: string) => Promise<void>
  
  // Signature & Printing
  addSignature: (id: string, signatureType: 'customer' | 'technician' | 'authorizedBy', signature: { name: string; date: string; signature: string }) => Promise<void>
  markAsPrinted: (id: string) => Promise<void>

  // Computed values
  getDeliveryNoteById: (id: string) => DeliveryNote | undefined
  getDeliveryNotesByStatus: (status: DeliveryNote['status']) => DeliveryNote[]
  getDeliveryNotesByCustomer: (customerId: string) => DeliveryNote[]
}

export const useDeliveryNoteStore = create<DeliveryNoteState>()(
  devtools(
    persist(
    (set, get) => ({
      deliveryNotes: [],
      selectedDeliveryNote: null,
      loading: false,
      error: null,
      filters: {},
      auditLogs: [],
      versionHistory: {},

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters }),
      setSelectedDeliveryNote: (deliveryNote) => set({ selectedDeliveryNote: deliveryNote }),

      fetchDeliveryNotes: async () => {
        get().setLoading(true);
        try {
          // Simulate API fetch with filtering
          const allNotes = get().deliveryNotes;
          const { searchTerm, status, customerId } = get().filters;
          
          let filtered = [...allNotes];
          if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(n => 
              n.blNumber.toLowerCase().includes(search) || 
              n.customerName.toLowerCase().includes(search)
            );
          }
          if (status && status.length > 0) {
            filtered = filtered.filter(n => status.includes(n.status));
          }
          if (customerId) {
            filtered = filtered.filter(n => n.customerId === customerId);
          }
          
          set({ loading: false });
          return filtered;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch delivery notes';
          set({ error: errorMessage, loading: false });
        }
      },

      fetchDeliveryNote: async (id: string) => {
        get().setLoading(true);
        const note = get().deliveryNotes.find(dn => dn.id === id);
        if (note) {
          set({ selectedDeliveryNote: note, loading: false });
        } else {
          set({ error: 'Delivery note not found', loading: false });
        }
      },

      createDeliveryNote: async (data, jobOrderData) => {
        const { valid, errors } = validateDeliveryNoteInput(data, jobOrderData);
        if (!valid) {
          const errorMessage = `Invalid delivery note data: ${errors.join(', ')}`;
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }

        const parts = computePartsFromJobOrder(jobOrderData.partsUsed);
        const labor = computeLaborFromJobOrder(jobOrderData.laborItems);
        const totals = calculateTotals(parts, labor);

        const authState = useAuthStore.getState();
        const currentUser = authState.currentUser;

        const existingNotes = get().deliveryNotes;
        const now = new Date();
        const year = now.getFullYear().toString();
        const notesThisYear = existingNotes.filter(note => note.issueDate.startsWith(year));
        const nextSequence = notesThisYear.length + 1;
        const generatedBlNumber = `BL-${year}-${String(nextSequence).padStart(4, '0')}`;
        const blNumber = data.documentNumber || generatedBlNumber;
        const documentNumber = data.documentNumber || generatedBlNumber;

        const newDeliveryNote: DeliveryNote = {
          id: uuidv4(),
          blNumber,
          jobOrderId: data.jobOrderId,
          customerId: data.customerId,
          customerName: jobOrderData.customerName,
          customerContact: jobOrderData.customerContact,
          vehicleInfo: jobOrderData.vehicleInfo,
          issueDate: new Date().toISOString(),
          status: 'draft',
          jobsPerformed: [],
          parts,
          laborItems: labor,
          ...totals,
          totalParts: parts.length,
          technicians: [],
          documentNumber,
          version: '1',
          signatures: {},
          isSigned: false,
          isPrinted: false,
          printCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: currentUser?.username || 'system',
          notes: data.notes,
          auditLogs: [],
          versionHistory: {}
        };

        const auditLog = {
          id: uuidv4(),
          action: 'create',
          entityType: 'delivery_note',
          entityId: newDeliveryNote.id,
          userId: 'system',
          userName: 'System User',
          timestamp: new Date().toISOString(),
          details: 'Delivery note created from job order'
        };

        set(state => ({
          deliveryNotes: [...state.deliveryNotes, newDeliveryNote],
          auditLogs: [...state.auditLogs, auditLog]
        }));

        authState.logActivity(
          'DOCUMENT_CREATED',
          {
            documentType: 'delivery_note',
            deliveryNoteId: newDeliveryNote.id,
            blNumber: newDeliveryNote.blNumber,
            customerName: newDeliveryNote.customerName
          },
          'documents',
          newDeliveryNote.id
        );

        return newDeliveryNote;
      },

      updateDeliveryNote: async (id, data, reason) => {
        const oldNote = get().getDeliveryNoteById(id);
        if (!oldNote) return;

        const auditLog = {
          id: uuidv4(),
          action: 'update',
          entityType: 'delivery_note',
          entityId: id,
          userId: 'system',
          userName: 'System User',
          timestamp: new Date().toISOString(),
          details: reason || 'Delivery note updated'
        };

        const authState = useAuthStore.getState();

        set(state => {
          const history = state.versionHistory[id] || [];
          return {
            deliveryNotes: state.deliveryNotes.map(note => 
              note.id === id ? { ...note, ...data, updatedAt: new Date().toISOString(), version: (parseInt(note.version) + 1).toString() } : note
            ),
            auditLogs: [...state.auditLogs, auditLog],
            versionHistory: {
              ...state.versionHistory,
              [id]: [...history, oldNote]
            }
          };
        });

        authState.logActivity(
          'DOCUMENT_UPDATED',
          {
            documentType: 'delivery_note',
            deliveryNoteId: id,
            blNumber: oldNote.blNumber,
            reason: reason || 'Delivery note updated'
          },
          'documents',
          id
        );
      },

      softDeleteDeliveryNotes: (ids) => {
        const deleted: string[] = [];
        const jobOrderStore = useJobOrderStore.getState();
        set(state => ({
          deliveryNotes: state.deliveryNotes.map(note => {
            if (ids.includes(note.id)) {
              deleted.push(note.id);
              if (note.jobOrderId) {
                jobOrderStore.resetJobOrderTransfer(note.jobOrderId);
              }
              return { ...note, status: 'cancelled' as any, updatedAt: new Date().toISOString() };
            }
            return note;
          })
        }));
        return { success: true, deleted };
      },

      restoreDeliveryNote: (id) => {
        set(state => ({
          deliveryNotes: state.deliveryNotes.map(note =>
            note.id === id ? { ...note, status: 'draft' as any, updatedAt: new Date().toISOString() } : note
          )
        }));
        return { success: true };
      },

      updateDeliveryNoteValidated: (id, data) => {
        const note = get().getDeliveryNoteById(id);
        if (!note) return { success: false, errors: ['Note not found'] };
        
        // Custom validation logic here
        const errors: string[] = [];
        if (!data.customerName && !note.customerName) errors.push('Customer name is required');
        
        if (errors.length > 0) return { success: false, errors };
        
        get().updateDeliveryNote(id, data, 'Validated update');
        return { success: true };
      },

      deleteDeliveryNote: async (id) => {
        const note = get().getDeliveryNoteById(id);

        set(state => ({
          deliveryNotes: state.deliveryNotes.filter(note => note.id !== id),
          auditLogs: state.auditLogs.filter(log => log.entityId !== id)
        }));

        if (note?.jobOrderId) {
          const jobOrderStore = useJobOrderStore.getState();
          jobOrderStore.resetJobOrderTransfer(note.jobOrderId);
        }

        const authState = useAuthStore.getState();
        authState.logActivity(
          'DOCUMENT_DELETED',
          {
            documentType: 'delivery_note',
            deliveryNoteId: id,
            blNumber: note?.blNumber
          },
          'documents',
          id
        );
      },
      
      updateDeliveryNoteStatus: async (id, status, reason) => {
        const oldNote = get().getDeliveryNoteById(id);
        if (!oldNote) return;

        const auditLog = {
          id: uuidv4(),
          action: 'status_change',
          entityType: 'delivery_note',
          entityId: id,
          userId: 'system',
          userName: 'System User',
          timestamp: new Date().toISOString(),
          details: reason || `Status changed from ${oldNote.status} to ${status}`
        };

        set(state => ({
          deliveryNotes: state.deliveryNotes.map(note =>
            note.id === id ? { ...note, status, updatedAt: new Date().toISOString() } : note
          ),
          auditLogs: [...state.auditLogs, auditLog]
        }));
      },

      addPartToDeliveryNote: async (id, part) => {
        const note = get().getDeliveryNoteById(id);
        if (!note) return;

        const updatedParts = [...note.parts, part];
        const totals = calculateTotals(updatedParts, note.laborItems);
        
        get().updateDeliveryNote(id, { parts: updatedParts, ...totals });
      },

      removePartFromDeliveryNote: async (id, partId) => {
        const note = get().getDeliveryNoteById(id);
        if (!note) return;

        const updatedParts = note.parts.filter(p => p.id !== partId);
        const totals = calculateTotals(updatedParts, note.laborItems);

        get().updateDeliveryNote(id, { parts: updatedParts, ...totals });
      },

      updatePartQuantity: async (id, partId, quantity) => {
        const note = get().getDeliveryNoteById(id);
        if (!note) return;

        const { ok, parts, totals } = updatePartQuantityBL(note.parts, partId, quantity);
        if (ok && parts && totals) {
          get().updateDeliveryNote(id, { parts, ...totals });
        }
      },
      
      updateLaborItem: async (id, labor) => {
        const note = get().getDeliveryNoteById(id);
        if (!note) return;
        
        const updatedLabor = note.laborItems.map(l => l.id === labor.id ? labor : l);
        const totals = calculateTotals(note.parts, updatedLabor);

        get().updateDeliveryNote(id, { laborItems: updatedLabor, ...totals });
      },

      convertToInvoice: async (id) => {
        const note = get().getDeliveryNoteById(id);
        if (!note) {
          throw new Error("Delivery note not found");
        }
        if (note.status !== 'validated') {
          throw new Error("Delivery note must be validated before converting to invoice.");
        }

        const estimateStore = getStore('estimateInvoiceStore');
        if (!estimateStore) throw new Error('Estimate store not initialized');

        const invoice = estimateStore.getState().createInvoiceFromDeliveryNotes([id]);

        return invoice.id;
      },

      syncDeliveryNoteFromJobOrder: async (jobOrderId) => {
        const jobOrderState = useJobOrderStore.getState();
        const jobOrder = jobOrderState.getJobOrderById(jobOrderId);
        if (!jobOrder) return;

        const note = get().deliveryNotes.find(n => n.jobOrderId === jobOrderId && n.status !== 'cancelled');
        if (!note) return;

        const parts = computePartsFromJobOrder(jobOrder.partsUsed);
        const labor = computeLaborFromJobOrder(jobOrder.laborItems);
        const totals = calculateTotals(parts, labor);

        await get().updateDeliveryNote(note.id, {
          parts,
          laborItems: labor,
          ...totals
        }, 'Synchronized from job order');
      },

      addSignature: async (id, signatureType, signature) => {
        const note = get().getDeliveryNoteById(id);
        if (!note) return;

        const updatedSignatures = { ...note.signatures, [signatureType]: signature };
        get().updateDeliveryNote(id, { signatures: updatedSignatures, isSigned: true });
      },

      markAsPrinted: async (id) => {
        const note = get().getDeliveryNoteById(id);
        if (!note) return;
        
        get().updateDeliveryNote(id, { 
          isPrinted: true, 
          printCount: (note.printCount || 0) + 1,
          lastPrintedAt: new Date().toISOString()
        });
      },
      
      // Implement other functions from the interface as needed
      validateDeliveryNote: async (id: string) => {
        // Placeholder for actual validation logic, maybe an API call
        get().updateDeliveryNoteStatus(id, 'validated');
      },
      cancelDeliveryNote: async (id: string) => {
        get().updateDeliveryNoteStatus(id, 'cancelled');
      },

      // Computed values
      getDeliveryNoteById: (id) => get().deliveryNotes.find(dn => dn.id === id),
      getDeliveryNotesByStatus: (status) => get().deliveryNotes.filter(dn => dn.status === status),
      getDeliveryNotesByCustomer: (customerId) => get().deliveryNotes.filter(dn => dn.customerId === customerId),
    }),
    {
      name: 'delivery-note-store',
      storage: createJSONStorage(() => createServerStateStorage()),
    }
  )),
)

registerStore('deliveryNoteStore', useDeliveryNoteStore);
