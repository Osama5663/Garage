import { create } from 'zustand';
import { getSuppliers } from '../services/api';
import { Supplier } from '../types/inventory';

interface SupplierState {
  suppliers: Supplier[];
  fetchSuppliers: () => Promise<void>;
}

export const useSupplierStore = create<SupplierState>()((set) => ({
  suppliers: [],
  fetchSuppliers: async () => {
    try {
      const suppliers = await getSuppliers();
      set({ suppliers });
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  },
}));
