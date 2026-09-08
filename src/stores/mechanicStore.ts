import {create} from 'zustand';
import { toast } from 'react-hot-toast';
import { useAuthStore } from './authStore';
import mechanicApiService from '../services/mechanicApiService';

// Define the type for a single mechanic
export interface Mechanic {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  status: 'active' | 'inactive';
  hourlyRate: number;
}

// Define the state structure for the mechanic store
interface MechanicState {
  mechanics: Mechanic[];
  isLoading: boolean;
  error: string | null;
  fetchMechanics: () => Promise<void>;
  addMechanic: (mechanic: Omit<Mechanic, 'id'>) => Promise<void>;
  updateMechanic: (id: string, updates: Partial<Mechanic>) => Promise<void>;
  deleteMechanic: (id: string) => Promise<void>;
}

// Create the Zustand store for mechanics
export const useMechanicStore = create<MechanicState>((set, get) => ({
      mechanics: [],
      isLoading: false,
      error: null,

      // Fetch all mechanics
      fetchMechanics: async () => {
        set({ isLoading: true, error: null });
        try {
          const mechanics = await mechanicApiService.getAllMechanics();
          set({ mechanics, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch mechanics', isLoading: false });
          toast.error('Failed to fetch mechanics');
        }
      },

      // Add a new mechanic
      addMechanic: async (mechanic) => {
        const { hasRole, logActivity } = useAuthStore.getState();
        if (!hasRole('admin')) {
          toast.error("You don't have permission to add mechanics.");
          return;
        }
        set({ isLoading: true });
        try {
          const newMechanic = await mechanicApiService.createMechanic(mechanic);
          set(state => ({ mechanics: [...state.mechanics, newMechanic], isLoading: false }));
          toast.success('Mechanic added successfully');
          logActivity('MECHANIC_ADDED', { mechanicName: newMechanic.name });
        } catch (error) {
          set({ error: 'Failed to add mechanic', isLoading: false });
          toast.error('Failed to add mechanic');
        }
      },

      // Update an existing mechanic
      updateMechanic: async (id, updates) => {
        const { hasRole, logActivity } = useAuthStore.getState();
        if (!hasRole('admin')) {
          toast.error("You don't have permission to update mechanics.");
          return;
        }
        set({ isLoading: true });
        try {
          const stateBefore = get();
          const existingMechanic = stateBefore.mechanics.find(m => m.id === id) || null;

          const updatedMechanic = await mechanicApiService.updateMechanic(id, updates);
          set(state => ({
            mechanics: state.mechanics.map(m => m.id === id ? updatedMechanic : m),
            isLoading: false
          }));
          toast.success('Mechanic updated successfully');

          const beforeSnapshot = existingMechanic ? {
            name: existingMechanic.name,
            specialization: existingMechanic.specialization,
            phone: existingMechanic.phone,
            status: existingMechanic.status,
            hourlyRate: existingMechanic.hourlyRate,
          } : undefined;

          const afterSnapshot = {
            name: updatedMechanic.name,
            specialization: updatedMechanic.specialization,
            phone: updatedMechanic.phone,
            status: updatedMechanic.status,
            hourlyRate: updatedMechanic.hourlyRate,
          };

          logActivity('MECHANIC_UPDATED', {
            mechanicId: id,
            before: beforeSnapshot,
            after: afterSnapshot,
            nomAvant: beforeSnapshot?.name,
            nomApres: afterSnapshot.name,
            specialisationAvant: beforeSnapshot?.specialization,
            specialisationApres: afterSnapshot.specialization,
            telephoneAvant: beforeSnapshot?.phone,
            telephoneApres: afterSnapshot.phone,
            statutAvant: beforeSnapshot?.status,
            statutApres: afterSnapshot.status,
            tauxHoraireAvant: beforeSnapshot?.hourlyRate,
            tauxHoraireApres: afterSnapshot.hourlyRate,
          });
        } catch (error) {
          set({ error: 'Failed to update mechanic', isLoading: false });
          toast.error('Failed to update mechanic');
        }
      },

      // Delete a mechanic
      deleteMechanic: async (id) => {
        const { hasRole, logActivity } = useAuthStore.getState();
        if (!hasRole('admin')) {
          toast.error("You don't have permission to delete mechanics.");
          return;
        }
        set({ isLoading: true });
        try {
          await mechanicApiService.deleteMechanic(id);
          set(state => ({ mechanics: state.mechanics.filter(m => m.id !== id), isLoading: false }));
          toast.success('Mechanic deleted successfully');
          logActivity('MECHANIC_DELETED', { mechanicId: id });
        } catch (error) {
          set({ error: 'Failed to delete mechanic', isLoading: false });
          toast.error('Failed to delete mechanic');
        }
      },
    }));
