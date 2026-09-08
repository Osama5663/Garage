import { useSupplierStore } from '../stores/supplierStore';

export const useSuppliers = () => {
  const suppliers = useSupplierStore((state) => state.suppliers);
  const fetchSuppliers = useSupplierStore((state) => state.fetchSuppliers);
  return { suppliers, fetchSuppliers };
};
