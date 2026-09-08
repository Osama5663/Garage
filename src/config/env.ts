export const env = {
  environment:
    (import.meta as any).env?.VITE_ENVIRONMENT ||
    (typeof location !== 'undefined' && location.hostname === 'localhost' ? 'preview' : 'prod'),
  apiUrl: (import.meta as any).env?.VITE_API_URL || '/api',
  storageNamespace:
    ((import.meta as any).env?.VITE_STORAGE_NAMESPACE as string) ||
    (typeof location !== 'undefined' && location.hostname === 'localhost' ? 'garage_preview' : 'garage_prod'),
}

