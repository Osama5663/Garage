
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
if (isTestEnv) {
  api.defaults.adapter = async (config: any) =>
    ({
      data: { success: true, data: null },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }) as any
}

api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const { sessionToken } = JSON.parse(authStorage).state;
      if (sessionToken) {
        config.headers.Authorization = `Bearer ${sessionToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getSuppliers = async () => {
  try {
    // Prefer local API
    const response = await api.get('/suppliers');
    const raw = response.data.data || response.data; // Handle both {data: [...]} and [...] formats
    return Array.isArray(raw)
      ? raw.map((s: any) => ({ ...s, id: s.id ?? s._id }))
      : raw;
  } catch (apiError) {
    console.error('API failed to fetch suppliers', apiError);
    throw apiError;
  }
};

export const createServerStateStorage = () => {
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
  if (isTestEnv) {
    return {
      getItem: async (name: string): Promise<string | null> => {
        try {
          return localStorage.getItem(name)
        } catch {
          return null
        }
      },
      setItem: async (name: string, value: string): Promise<void> => {
        try {
          localStorage.setItem(name, value)
        } catch {}
      },
      removeItem: async (name: string): Promise<void> => {
        try {
          localStorage.removeItem(name)
        } catch {}
      },
    }
  }
  const isDev = typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DEV
  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const res = await api.get(`/state/${encodeURIComponent(name)}`, {
          params: { _ts: Date.now() },
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        })
        if (res.data?.success && res.data?.data) return res.data.data as string
      } catch {}
      if (isDev) {
        try {
          return localStorage.getItem(name)
        } catch {
          return null
        }
      }
      return null
    },
    setItem: async (name: string, value: string): Promise<void> => {
      if (isDev) {
        try {
          localStorage.setItem(name, value)
        } catch {}
      }
      try {
        await api.put(`/state/${encodeURIComponent(name)}`, { value })
      } catch {}
    },
    removeItem: async (name: string): Promise<void> => {
      if (isDev) {
        try {
          localStorage.removeItem(name)
        } catch {}
      }
      try {
        await api.delete(`/state/${encodeURIComponent(name)}`)
      } catch {}
    },
  }
}
