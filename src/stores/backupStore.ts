import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createServerStateStorage } from '../services/api'

export interface BackupLog {
  id: string
  timestamp: string
  type: 'manual' | 'scheduled' | 'restore'
  status: 'success' | 'failed'
  size: number
  details?: string
  fileName?: string
}

export interface BackupSettings {
  enabled: boolean
  interval: 'daily' | 'weekly' | 'monthly'
  lastBackup: string | null
  location: 'local' | 'cloud' // Cloud would be a placeholder for now
}

interface BackupState {
  settings: BackupSettings
  logs: BackupLog[]
  
  updateSettings: (settings: Partial<BackupSettings>) => void
  addLog: (log: Omit<BackupLog, 'id'>) => void
  clearLogs: () => void
}

export const useBackupStore = create<BackupState>()(
  persist(
    (set) => ({
      settings: {
        enabled: false,
        interval: 'weekly',
        lastBackup: null,
        location: 'local'
      },
      logs: [],

      updateSettings: (newSettings) => 
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),

      addLog: (log) =>
        set((state) => ({
          logs: [
            { ...log, id: `log_${Date.now()}` },
            ...state.logs
          ].slice(0, 50) // Keep last 50 logs
        })),

      clearLogs: () => set({ logs: [] })
    }),
    {
      name: 'garage-backup-store',
      storage: createJSONStorage(() => createServerStateStorage()),
    }
  )
)
