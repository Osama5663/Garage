
import * as blApi from './blApi';

async function getBLDocuments(filters: blApi.BLFilters = {}) {
  // In a real app, you might add more complex business logic here
  return blApi.getBLDocuments(filters);
}

async function getMonthlySummary(month: string, year: string) {
  return blApi.getMonthlySummary(month, year);
}

export const blService = {
  getBLDocuments,
  getMonthlySummary,
  uploadBLDocument: blApi.uploadBLDocument,
  updateBLStatus: blApi.updateBLStatus,
  generateInvoice: blApi.generateInvoice,
};
