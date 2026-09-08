import React, { useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useAuthStore, useHasPermission } from '../stores/authStore'
import { Settings, Building, DollarSign, Wrench, Save, AlertCircle, Coins, HardDrive, Loader, Lock, Users } from 'lucide-react'
import { useLangStore } from '../stores/langStore'
import { toast } from 'sonner'
import WorkshopSettingsForm from './settings/WorkshopSettingsForm'
import TaxSettingsManager from './settings/TaxSettingsManager'
import BackupManager from './settings/BackupManager'
import PermissionManager from './settings/PermissionManager'
import UserManagement from './UserManagement'
import MechanicManagementPage from '../pages/MechanicManagementPage'
import { api } from '../services/api'

import { t } from '../i18n'

const SettingsManager: React.FC = () => {
  const { isLoading, error, clearError } = useSettingsStore()
  const { logActivity, hasRole } = useAuthStore()
  
  // Permission checks
  const canViewWorkshop = useHasPermission('read', 'settings_workshop')
  const canViewTaxes = useHasPermission('read', 'settings_taxes')
  const canViewBackup = useHasPermission('read', 'settings_backup')
  const canViewCurrency = useHasPermission('read', 'settings_currency')
  const canViewPermissions = hasRole('admin')
  const canViewUsers = hasRole('admin')
  const canViewMechanics = hasRole('admin') // Add permission check for mechanics

  // Determine initial active tab based on permissions
  const getInitialTab = () => {
    if (canViewUsers) return 'users'
    if (canViewMechanics) return 'mechanics' // Add mechanics tab
    if (canViewPermissions) return 'permissions'
    if (canViewWorkshop) return 'workshop'
    if (canViewTaxes) return 'taxes'
    if (canViewBackup) return 'backup'
    return 'workshop'
  }

  const [activeTab, setActiveTab] = useState<'workshop' | 'taxes' | 'backup' | 'permissions' | 'users' | 'mechanics'>(getInitialTab())
  const [saveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    logActivity('SETTINGS_TAB_CHANGED', { tab })
  }

  const tabs = [
    canViewUsers && {
      id: 'users' as const,
      label: t('userManagement.settingsTab.label'),
      icon: Users,
      description: t('userManagement.settingsTab.description')
    },
    canViewMechanics && { // Add mechanics tab to the tabs array
      id: 'mechanics' as const,
      label: 'Gestion des Mécaniciens',
      icon: Wrench,
      description: 'Gérer les mécaniciens de l\'atelier'
    },
    canViewPermissions && {
        id: 'permissions' as const,
        label: 'Permissions',
        icon: Lock,
        description: 'Configure role-based access control'
    },
    canViewWorkshop && {
      id: 'workshop' as const,
      label: t('settings.tabs.workshop.label'),
      icon: Building,
      description: t('settings.tabs.workshop.description')
    },
    canViewTaxes && {
      id: 'taxes' as const,
      label: t('settings.tabs.taxes.label'),
      icon: DollarSign,
      description: t('settings.tabs.taxes.description')
    },
    canViewBackup && {
      id: 'backup' as const,
      label: t('settings.tabs.backup.label'),
      icon: HardDrive,
      description: t('settings.tabs.backup.description')
    }
  ].filter(Boolean) as { id: 'workshop' | 'taxes' | 'backup' | 'permissions' | 'users' | 'mechanics', label: string, icon: any, description: string }[]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('settings.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('settings.header')}</h1>
              <p className="text-gray-600">{t('settings.subtitle')}</p>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{t('settings.configErrorTitle')}</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={clearError}
                      className="text-sm font-medium text-red-600 hover:text-red-500"
                    >
                      {t('settings.dismiss')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {saveStatus === 'saved' && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <Save className="h-5 w-5 text-green-400 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{t('settings.savedSuccess')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <Icon className="-ml-0.5 mr-2 h-5 w-5" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Descriptions */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' && canViewUsers && <UserManagement />}
            {activeTab === 'mechanics' && canViewMechanics && <MechanicManagementPage />} {/* Add content for mechanics tab */}
            {activeTab === 'permissions' && canViewPermissions && <PermissionManager />}
            {activeTab === 'workshop' && canViewWorkshop && <WorkshopSettingsForm />}
            {activeTab === 'taxes' && canViewTaxes && <TaxSettingsManager />}
            {activeTab === 'backup' && canViewBackup && <BackupManager />}
            
            {tabs.length === 0 && (
              <div className="text-center py-12">
                <Lock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">{t('common.accessDenied')}</h3>
                <p className="text-gray-500 mt-2">{t('settings.noPermissions')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Application Currency */}
        {canViewCurrency && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{t('settings.currency.title')}</h3>
            <Coins className="h-5 w-5 text-green-600" />
          </div>
          <div className="p-6">
            <CurrencySelector />
          </div>
        </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{t('settings.quickActions.title')}</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {canViewWorkshop && (
              <button
                onClick={() => setActiveTab('workshop')}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Building className="h-6 w-6 text-blue-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{t('settings.quickActions.workshop.title')}</p>
                  <p className="text-sm text-gray-500">{t('settings.quickActions.workshop.desc')}</p>
                </div>
              </button>
              )}

              {canViewTaxes && (
              <button
                onClick={() => setActiveTab('taxes')}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <DollarSign className="h-6 w-6 text-green-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{t('settings.quickActions.taxes.title')}</p>
                  <p className="text-sm text-gray-500">{t('settings.quickActions.taxes.desc')}</p>
                </div>
              </button>
              )}

              {canViewBackup && (
              <button
                onClick={() => setActiveTab('backup')}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <HardDrive className="h-6 w-6 text-purple-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{t('settings.tabs.backup.label')}</p>
                  <p className="text-sm text-gray-500">{t('settings.tabs.backup.description')}</p>
                </div>
              </button>
              )}
            </div>
          </div>
        </div>

        {hasRole('admin') ? (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 mt-8">
            <div className="px-6 py-4 border-b border-red-200">
              <h3 className="text-lg font-medium text-red-700">Zone dangereuse</h3>
            </div>
            <div className="p-6">
              <div className="max-w-2xl">
                <p className="text-sm text-gray-700">
                  Cette action supprime toutes les données (clients, ordres de réparation, factures, inventaire, etc.).
                  Elle est irréversible.
                </p>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-900">
                    Tapez <span className="font-mono">RESET NOW</span> pour confirmer
                  </label>
                  <input
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    className="mt-2 w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="RESET NOW"
                  />
                </div>
                <div className="mt-4">
                  <button
                    disabled={isResetting || resetConfirmText !== 'RESET NOW'}
                    onClick={async () => {
                      const ok = window.confirm(
                        'Factory Reset: this will permanently delete ALL data. Are you sure?',
                      )
                      if (!ok) return
                      try {
                        setIsResetting(true)
                        await api.post('/admin/factory-reset', { confirm: resetConfirmText })
                        toast.success('Factory reset completed. Reloading…')
                        try {
                          localStorage.clear()
                        } catch {}
                        const base = import.meta.env?.DEV ? '/' : '/garage'
                        window.location.href = base === '/' ? '/' : `${base}/`
                      } catch (e: any) {
                        toast.error(e?.response?.data?.error || 'Factory reset failed')
                      } finally {
                        setIsResetting(false)
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-white transition-colors ${
                      isResetting || resetConfirmText !== 'RESET NOW'
                        ? 'bg-red-300 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isResetting ? 'Resetting…' : 'Factory Reset'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}



const CurrencySelector: React.FC = () => {
  const { currency, setCurrency, locale } = useLangStore()
  const { logActivity } = useAuthStore()
  const canUpdate = useHasPermission('update', 'settings_currency')
  
  const [selectedCurrency, setSelectedCurrency] = React.useState(currency)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    // keep selector in sync with persisted store across navigation/refresh
    setSelectedCurrency(currency)
  }, [currency])

  const handleSave = () => {
    if (!canUpdate) {
      toast.error(t('common.accessDenied'))
      logActivity('UNAUTHORIZED_SETTINGS_UPDATE_ATTEMPT', { setting: 'currency' })
      return
    }

    setIsSaving(true)
    setTimeout(() => {
      setCurrency(selectedCurrency as any)
      logActivity('SETTINGS_UPDATED', { setting: 'currency', value: selectedCurrency })
      toast.success(t('settings.currency.savedToast'))
      setIsSaving(false)
    }, 600)
  }

  return (
    <div className="max-w-md">
      <label htmlFor="app-currency" className="block text-sm font-medium text-gray-700 mb-1">{t('settings.currency.label')}</label>
      <select
        id="app-currency"
        aria-label={t('settings.currency.label')}
        value={selectedCurrency}
        onChange={(e) => setSelectedCurrency(e.target.value as any)}
        disabled={!canUpdate || isSaving}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${!canUpdate ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        <option value="MAD">{t('settings.currency.option.MAD')}</option>
        <option value="EUR">{t('settings.currency.option.EUR')}</option>
        <option value="USD">{t('settings.currency.option.USD')}</option>
      </select>
      
      {canUpdate && (
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
          aria-label={t('settings.currency.save')}
        >
          {isSaving ? (
            <>
              <Loader className="h-4 w-4 animate-spin" /> {t('settings.currency.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> {t('settings.currency.save')}
            </>
          )}
        </button>
        <button
          onClick={() => setSelectedCurrency(currency)}
          disabled={isSaving}
          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
          aria-label={t('settings.currency.cancel')}
        >
          {t('settings.currency.cancel')}
        </button>
      </div>
      )}
      <p className="text-xs text-gray-500 mt-2">{t('settings.currency.formatNote').replace('{locale}', String(locale))}</p>
    </div>
  )
}

export default SettingsManager
