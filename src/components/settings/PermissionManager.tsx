import React, { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { UserRole, ACTION_PERMISSIONS } from '../../types/auth'
import { Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

const PermissionManager: React.FC = () => {
  const { permissions, updateRolePermissions } = useAuthStore()
  const [selectedRole, setSelectedRole] = useState<UserRole>('supervisor')
  const [editedPermissions, setEditedPermissions] = useState<Record<string, string[]>>({})
  const [isEditing, setIsEditing] = useState(false)

  const roles: UserRole[] = ['supervisor', 'mechanic', 'cashier', 'template_admin', 'template_viewer']
  const roleLabels: Record<UserRole, string> = {
    admin: 'Administrateur',
    supervisor: 'Superviseur',
    mechanic: 'Mécanicien',
    cashier: 'Caissier',
    template_admin: 'Administrateur de modèles',
    template_viewer: 'Consultant de modèles'
  }
  const getRoleLabel = (role: UserRole) => roleLabels[role] || role
  const moduleLabels: Record<string, string> = {
    'job-orders': 'Ordres de réparation',
    invoices: 'Factures',
    estimates: 'Devis',
    customers: 'Clients',
    inventory: 'Inventaire',
    reports: 'Rapports',
    users: 'Utilisateurs',
    documents: 'Documents',
    templates: 'Modèles',
    settings: 'Paramètres',
    settings_workshop: 'Paramètres atelier',
    settings_taxes: 'Paramètres taxes',
    settings_job_types: 'Types de travaux',
    settings_backup: 'Sauvegarde',
    settings_currency: 'Devise'
  }
  const getModuleLabel = (module: string) => moduleLabels[module] || module.replace(/_/g, ' ')
  const actionLabels: Record<string, string> = {
    create: 'Créer',
    read: 'Consulter',
    update: 'Modifier',
    delete: 'Supprimer',
    approve: 'Approuver',
    publish: 'Publier',
    restore: 'Restaurer'
  }
  const getActionLabel = (action: string) => actionLabels[action] || action

  // Load permissions when role changes
  React.useEffect(() => {
    if (permissions[selectedRole]) {
      setEditedPermissions(permissions[selectedRole])
    }
  }, [selectedRole, permissions])

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    const currentActions = editedPermissions[module] || []
    let newActions: string[]
    
    if (checked) {
      newActions = [...currentActions, action]
    } else {
      newActions = currentActions.filter(a => a !== action)
    }

    setEditedPermissions({
      ...editedPermissions,
      [module]: newActions
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    updateRolePermissions(selectedRole, editedPermissions)
    toast.success(`Permissions mises à jour pour ${getRoleLabel(selectedRole)}`)
    setIsEditing(false)
  }

  const handleReset = () => {
    if (confirm('Réinitialiser les permissions par défaut pour ce rôle ?')) {
      const defaultPerms = ACTION_PERMISSIONS[selectedRole]
      if (defaultPerms) {
        updateRolePermissions(selectedRole, defaultPerms)
        toast.success(`Permissions réinitialisées pour ${getRoleLabel(selectedRole)}`)
      }
    }
  }

  const modules = [
    'job-orders', 'invoices', 'estimates', 'customers', 'inventory', 'reports', 'users', 'documents', 'templates',
    'settings', 'settings_workshop', 'settings_taxes', 'settings_job_types', 'settings_backup', 'settings_currency'
  ]

  const actions = ['create', 'read', 'update', 'delete', 'approve', 'publish', 'restore']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Autorisations des rôles</h3>
          <p className="text-sm text-gray-500">Configurer les accès pour chaque rôle</p>
        </div>
        <div className="flex space-x-2">
            <button
                onClick={handleReset}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinitialiser
            </button>
            <button
                onClick={handleSave}
                disabled={!isEditing}
                className={`flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white 
                    ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
            </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner un rôle</label>
        <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
            {roles.map(role => (
                <option key={role} value={role}>{getRoleLabel(role)}</option>
            ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(module => (
            <div key={module} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h4 className="font-medium text-gray-900 mb-3 border-b pb-2">{getModuleLabel(module).toUpperCase()}</h4>
                <div className="space-y-2">
                    {actions.map(action => (
                        <label key={action} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={(editedPermissions[module] || []).includes(action)}
                                onChange={(e) => handlePermissionChange(module, action, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{getActionLabel(action)}</span>
                        </label>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  )
}

export default PermissionManager
