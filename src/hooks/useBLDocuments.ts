
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as blApi from '../services/blApi';

export interface BLFilters {
  supplierId?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
  customerId?: string;
}

export function useBLDocuments(filters: BLFilters) {
  return useQuery({ 
    queryKey: ['blDocuments', filters], 
    queryFn: () => blApi.getBLDocuments(filters)
  });
}

export function useUploadBLDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blApi.uploadBLDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blDocuments'] });
    },
  });
}

export function useUpdateBLStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blApi.updateBLStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blDocuments'] });
    },
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blApi.generateInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
    },
  });
}

export function useMonthlySummary(month: string, year: string) {
  return useQuery({
    queryKey: ['monthlySummary', month, year],
    queryFn: () => blApi.getMonthlySummary(month, year),
    enabled: !!month && !!year,
  });
}
