import { useInventoryStore } from '../stores/inventoryStore'
import { useCustomerStore } from '../stores/customerStore'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useVehicleRepairStore } from '../stores/vehicleRepairStore'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useCashflowStore } from '../stores/cashflowStore'
import { useJobDescriptionStore } from '../stores/jobDescriptionStore'
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore'
import { useTVAReportStore } from '../stores/tvaReportStore'
import { useLangStore } from '../stores/langStore'
import { useBackupStore } from '../stores/backupStore'

const STORES = {
  inventory: useInventoryStore,
  customer: useCustomerStore,
  estimateInvoice: useEstimateInvoiceStore,
  settings: useSettingsStore,
  vehicleRepair: useVehicleRepairStore,
  jobOrder: useJobOrderStore,
  cashflow: useCashflowStore,
  jobDescription: useJobDescriptionStore,
  deliveryNote: useDeliveryNoteStore,
  tvaReport: useTVAReportStore,
  lang: useLangStore
}

// Key derivation parameters
const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const IV_LENGTH = 12 // Recommended for GCM

export class BackupService {
  
  static async generateBackup(password?: string): Promise<Blob> {
    try {
      // 1. Gather Data
      const data: Record<string, any> = {
        meta: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          app: 'Garage Management System'
        },
        stores: {}
      }

      for (const [key, store] of Object.entries(STORES)) {
        // We persist the whole state, or rely on the store's persist middleware to have structured it.
        // But store.getState() returns the full object.
        // Some stores might have sensitive ephemeral data, but usually persisted stores are clean.
        // We'll exclude functions and non-serializable data implicitly by JSON.stringify later.
        data.stores[key] = store.getState()
      }

      const jsonString = JSON.stringify(data)
      let finalData: ArrayBuffer | string | Uint8Array = jsonString
      let mimeType = 'application/json'

      // 2. Encrypt if password provided
      if (password) {
        const encoder = new TextEncoder()
        const encodedData = encoder.encode(jsonString)
        
        // Generate Salt
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
        
        // Derive Key
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          encoder.encode(password),
          { name: "PBKDF2" },
          false,
          ["deriveKey"]
        )
        
        const key = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt"]
        )

        // Encrypt
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
        const encryptedContent = await crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv
          },
          key,
          encodedData
        )

        // Pack: salt + iv + encryptedContent
        const combined = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength)
        combined.set(salt, 0)
        combined.set(iv, salt.length)
        combined.set(new Uint8Array(encryptedContent), salt.length + iv.length)
        
        finalData = combined
        mimeType = 'application/octet-stream'
      }

      // 3. Log success
      useBackupStore.getState().addLog({
        timestamp: new Date().toISOString(),
        type: 'manual',
        status: 'success',
        size: finalData instanceof ArrayBuffer ? finalData.byteLength : new Blob([finalData as any]).size,
        details: password ? 'Encrypted backup' : 'Unencrypted backup'
      })
      
      useBackupStore.getState().updateSettings({
        lastBackup: new Date().toISOString()
      })

      return new Blob([finalData as any], { type: mimeType })

    } catch (error) {
      console.error('Backup generation failed:', error)
      useBackupStore.getState().addLog({
        timestamp: new Date().toISOString(),
        type: 'manual',
        status: 'failed',
        size: 0,
        details: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  static async restoreBackup(file: File, password?: string): Promise<void> {
    try {
      const buffer = await file.arrayBuffer()
      let jsonString: string

      if (password) {
        // Decrypt
        const salt = new Uint8Array(buffer.slice(0, SALT_LENGTH))
        const iv = new Uint8Array(buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH))
        const encryptedContent = buffer.slice(SALT_LENGTH + IV_LENGTH)

        const encoder = new TextEncoder()
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          encoder.encode(password),
          { name: "PBKDF2" },
          false,
          ["deriveKey"]
        )

        const key = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        )

        try {
          const decrypted = await crypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv
            },
            key,
            encryptedContent
          )
          
          const decoder = new TextDecoder()
          jsonString = decoder.decode(decrypted)
        } catch (e) {
          throw new Error('Incorrect password or corrupted file')
        }
      } else {
        const decoder = new TextDecoder()
        jsonString = decoder.decode(buffer)
      }

      // Parse and Validate
      let data
      try {
        data = JSON.parse(jsonString)
      } catch (e) {
        throw new Error('Invalid JSON data')
      }

      if (!data.meta || !data.stores) {
        throw new Error('Invalid backup format')
      }

      // Restore Data
      // We assume stores have a setState or we can overwrite via the internal store api
      // Zustand stores usually expose setState via the hook, but here we accessed getState().
      // To set state from outside components, we can use the same store instances.
      
      const storeKeys = Object.keys(STORES) as Array<keyof typeof STORES>
      for (const key of storeKeys) {
        if (data.stores[key]) {
          const store = STORES[key] as any
          store.setState(data.stores[key])
        }
      }

      useBackupStore.getState().addLog({
        timestamp: new Date().toISOString(),
        type: 'restore',
        status: 'success',
        size: file.size,
        fileName: file.name
      })

    } catch (error) {
      console.error('Backup restoration failed:', error)
      useBackupStore.getState().addLog({
        timestamp: new Date().toISOString(),
        type: 'restore',
        status: 'failed',
        size: file.size,
        fileName: file.name,
        details: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  static formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }
}
