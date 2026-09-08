import React, { useState, useRef, useEffect } from 'react'
import { useBackupStore } from '../../stores/backupStore'
import { useLangStore } from '../../stores/langStore'
import { BackupService } from '../../utils/backupService'
import { toast } from 'sonner'
import { t } from '../../i18n'
import { 
  Download, 
  Upload, 
  Clock, 
  Shield, 
  HardDrive, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  FileText
} from 'lucide-react'

const BackupManager: React.FC = () => {
  useLangStore(state => state.language) // Trigger re-render on language change
  const { settings, logs, updateSettings } = useBackupStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [password, setPassword] = useState('')
  const [useEncryption, setUseEncryption] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCreateBackup = async () => {
    if (useEncryption && !password) {
      toast.error('Please enter a password for encryption')
      return
    }

    setIsProcessing(true)
    try {
      const blob = await BackupService.generateBackup(useEncryption ? password : undefined)
      
      // Trigger download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const now = new Date()
      const timestamp = now.toISOString().replace('T', '_').replace(/[:.]/g, '-').slice(0, 16)
      a.download = `garage_backup_${timestamp}.${useEncryption ? 'enc' : 'json'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Backup created successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to create backup')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // If file is .enc, require password
    const isEncrypted = file.name.endsWith('.enc')
    
    if (isEncrypted && !password) {
      toast.error(t('backupManager.restoreSection.passwordRequired'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (window.confirm(t('backupManager.restoreSection.confirmRestore'))) {
      setIsProcessing(true)
      try {
        await BackupService.restoreBackup(file, isEncrypted ? password : undefined)
        toast.success(t('backupManager.restoreSection.success'))
        setTimeout(() => window.location.reload(), 1500)
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : 'Failed to restore backup')
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } else {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!mounted) return <div className="p-4">Loading Backup Manager...</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Backup & Restore Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <HardDrive className="h-5 w-5 mr-2 text-blue-600" />
          {t('backupManager.createSection.title')} & {t('backupManager.restoreSection.title')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Backup */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">{t('backupManager.createSection.title')}</h4>
            <p className="text-sm text-gray-500">
              {t('backupManager.createSection.description')}
            </p>
            
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="encrypt"
                checked={useEncryption}
                onChange={(e) => setUseEncryption(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="encrypt" className="text-sm text-gray-700 flex items-center cursor-pointer">
                <Shield className="h-4 w-4 mr-1 text-gray-400" />
                {t('backupManager.createSection.encrypt')}
              </label>
            </div>

            {useEncryption && (
              <input
                type="password"
                placeholder={t('backupManager.createSection.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            )}

            <button
              onClick={handleCreateBackup}
              disabled={isProcessing}
              aria-label={t('backupManager.createSection.button')}
              aria-busy={isProcessing}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? t('backupManager.createSection.buttonProcessing') : t('backupManager.createSection.button')}
            </button>
          </div>

          {/* Restore Backup */}
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-8">
            <h4 className="text-sm font-medium text-gray-700">{t('backupManager.restoreSection.title')}</h4>
            <p className="text-sm text-gray-500">
              {t('backupManager.restoreSection.description')}
            </p>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-xs text-yellow-700">
                    {t('backupManager.restoreSection.warning')}
                  </p>
                </div>
              </div>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestoreBackup}
              accept=".json,.enc"
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              aria-label={t('backupManager.restoreSection.button')}
              aria-busy={isProcessing}
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isProcessing ? (
                 <Loader className="h-4 w-4 animate-spin mr-2" />
               ) : (
                 <Upload className="h-4 w-4 mr-2" />
               )}
              {isProcessing ? t('backupManager.restoreSection.buttonProcessing') : t('backupManager.restoreSection.button')}
            </button>
            
            {useEncryption && password && (
              <p className="text-xs text-gray-500 text-center">
                {t('backupManager.restoreSection.passwordHint')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Settings & Schedule */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-blue-600" />
          {t('backupManager.settings.title')}
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">{t('backupManager.settings.lastBackup')}</h4>
              <p className="text-sm text-gray-500">
                {settings.lastBackup 
                  ? new Date(settings.lastBackup).toLocaleString()
                  : t('backupManager.settings.never')}
              </p>
            </div>
            {settings.lastBackup && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {t('backupManager.settings.active')}
              </span>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
             <div className="flex items-start">
               <div className="flex items-center h-5">
                 <input
                   id="auto_backup"
                   name="auto_backup"
                   type="checkbox"
                   disabled={true} // Disabled for now as it requires backend/service worker
                   checked={settings.enabled}
                   onChange={(e) => updateSettings({ enabled: e.target.checked })}
                   className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded opacity-50 cursor-not-allowed"
                 />
               </div>
               <div className="ml-3 text-sm">
                 <label htmlFor="auto_backup" className="font-medium text-gray-700 opacity-50">{t('backupManager.settings.autoBackup')}</label>
                 <p className="text-gray-500">{t('backupManager.settings.autoBackupDesc')}</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* History Log */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            {t('backupManager.history.title')}
          </h3>
        </div>
        
        {logs.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            {t('backupManager.history.noHistory')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('backupManager.history.table.date')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('backupManager.history.table.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('backupManager.history.table.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('backupManager.history.table.size')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('backupManager.history.table.details')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {log.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status === 'success' ? <CheckCircle className="w-3 h-3 mr-1"/> : <XCircle className="w-3 h-3 mr-1"/>}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {BackupService.formatBytes(log.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default BackupManager
