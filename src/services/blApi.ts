import { api } from './api';

export interface BLFilters {
  month?: string
  year?: string
  status?: string
  customerId?: string
}

export const getBLDocuments = async (filters: BLFilters = {}) => {
  const params = new URLSearchParams(filters as any);
  const response = await api.get(`/bl-documents/documents?${params.toString()}`);
  return response.data.data;
};

export const getMonthlySummary = async (month: string, year: string) => {
  const response = await api.get(`/bl-documents/reports/monthly-summary?month=${month}&year=${year}`);
  return response.data.data;
};

export const uploadBLDocument = async (formData: FormData) => {
  const response = await api.post('/bl-documents/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const updateBLStatus = async ({ id, status }: { id: string; status: string }) => {
  const response = await api.patch(`/bl-documents/documents/${id}/status`, { status });
  return response.data.data;
};

export const generateInvoice = async (data: any) => {
  const response = await api.post('/bl-documents/invoices/generate', data);
  return response.data.data;
};
