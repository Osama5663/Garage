import React, { useState, useEffect } from 'react'
import { useAuthStore, useCurrentUser } from '../stores/authStore'
import { User, UserRole } from '../types/auth'
import { useMechanicStore } from '../stores/mechanicStore'
import { Plus, Edit, Trash2, UserCheck, UserX, Shield, Wrench, DollarSign, Eye, FileText, Settings, Search, Key, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { t } from '../i18n'
import { useLangStore } from '../stores/langStore'

interface UserFormData {
  username: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  mechanicId?: string
  isActive: boolean
  password?: string
  confirmPassword?: string
}

type SensitiveActionType = 'DELETE_USER' | 'RESET_PASSWORD' | 'CHANGE_ROLE' | 'TOGGLE_STATUS'

interface PendingAction {
  type: SensitiveActionType
  payload: any
  description: string
}

const UserManagement: React.FC = () => {
  const currentUser = useCurrentUser()
  const { 
    createUser, 
    updateUserById, 
    deleteUser, 
    getAllUsers, 
    adminSetUserPassword,
    verifyCurrentPassword
  } = useAuthStore()
  const { mechanics, fetchMechanics } = useMechanicStore()
  
  const [userList, setUserList] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal states
  const [showForm, setShowForm] = useState(false)
  const [showRolePermissions, setShowRolePermissions] = useState<UserRole | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  
  // Data states
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [targetUserForReset, setTargetUserForReset] = useState<User | null>(null)
  useLangStore(state => state.language)

  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'mechanic',
    mechanicId: undefined,
    isActive: true,
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Partial<UserFormData>>({})

  useEffect(() => {
    loadUsers()
    fetchMechanics()
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(userList)
    } else {
      const lowerTerm = searchTerm.toLowerCase()
      setFilteredUsers(userList.filter(user => 
        user.username.toLowerCase().includes(lowerTerm) ||
        user.firstName.toLowerCase().includes(lowerTerm) ||
        user.lastName.toLowerCase().includes(lowerTerm) ||
        user.email.toLowerCase().includes(lowerTerm) ||
        user.role.toLowerCase().includes(lowerTerm)
      ))
    }
  }, [searchTerm, userList])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const allUsers = getAllUsers()
      setUserList(allUsers)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error(t('userManagement.toasts.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<UserFormData> = {}

    if (!formData.username.trim()) newErrors.username = t('userManagement.validation.usernameRequired')
    else if (formData.username.length < 3) newErrors.username = t('userManagement.validation.usernameMin')

    if (!formData.email.trim()) newErrors.email = t('userManagement.validation.emailRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t('userManagement.validation.emailInvalid')

    if (!formData.firstName.trim()) newErrors.firstName = t('userManagement.validation.firstNameRequired')
    if (!formData.lastName.trim()) newErrors.lastName = t('userManagement.validation.lastNameRequired')
    if (formData.role === 'mechanic' && !formData.mechanicId) newErrors.mechanicId = 'Mechanic is required'

    // Password validation for new users
    if (!editingUser) {
        if (!formData.password) newErrors.password = t('userManagement.validation.passwordRequired')
        else if (formData.password.length < 6) newErrors.password = t('userManagement.validation.passwordMin')
        
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = t('userManagement.validation.passwordMismatch')
        }
    }

    // Check duplicates
    const existingUser = userList.find(u => 
      u.id !== editingUser?.id && 
      (u.username === formData.username.trim() || u.email === formData.email.trim())
    )
    
    if (existingUser) {
      if (existingUser.username === formData.username.trim()) newErrors.username = t('userManagement.validation.usernameExists')
      if (existingUser.email === formData.email.trim()) newErrors.email = t('userManagement.validation.emailExists')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      if (editingUser) {
        // For role changes or deactivation, we might want to ask for confirmation
        // But for standard edits, we'll allow direct update
        const success = await updateUserById(editingUser.id, {
            username: formData.username,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role,
            mechanicId: formData.role === 'mechanic' ? formData.mechanicId : undefined,
            isActive: formData.isActive
        })
        if (success) {
          toast.success(t('userManagement.toasts.userUpdated'))
          resetForm()
          await loadUsers()
        }
      } else {
        const newUser = await createUser({
          username: formData.username,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          mechanicId: formData.role === 'mechanic' ? formData.mechanicId : undefined,
          isActive: formData.isActive,
          failedLoginAttempts: 0
        }, formData.password)
        
        if (newUser) {
          toast.success(t('userManagement.toasts.userCreated'))
          resetForm()
          await loadUsers()
        }
      }
    } catch (error) {
      console.error('Error saving user:', error)
      toast.error(t('userManagement.toasts.saveFailed'))
    }
  }

  // Sensitive Action Handlers
  const initiateDelete = (user: User) => {
      setPendingAction({
          type: 'DELETE_USER',
          payload: user.id,
          description: t('userManagement.confirmation.descriptions.deleteUser').replace('{{username}}', user.username)
      })
      setShowConfirmModal(true)
  }

  const initiateStatusToggle = (user: User) => {
      setPendingAction({
          type: 'TOGGLE_STATUS',
          payload: { id: user.id, status: !user.isActive },
          description: (user.isActive
            ? t('userManagement.confirmation.descriptions.deactivateUser')
            : t('userManagement.confirmation.descriptions.activateUser')
          ).replace('{{username}}', user.username)
      })
      setShowConfirmModal(true)
  }

  const initiatePasswordReset = (user: User) => {
      setTargetUserForReset(user)
      setNewPassword('')
      setShowPasswordResetModal(true)
  }

  const handleConfirmSensitiveAction = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!verifyCurrentPassword(adminPassword)) {
          toast.error(t('userManagement.toasts.invalidAdminPassword'))
          return
      }

      if (!pendingAction) return

      try {
          switch (pendingAction.type) {
              case 'DELETE_USER':
                  await deleteUser(pendingAction.payload)
                  toast.success(t('userManagement.toasts.userDeleted'))
                  break
              case 'TOGGLE_STATUS':
                  await updateUserById(pendingAction.payload.id, { isActive: pendingAction.payload.status })
                  toast.success(t('userManagement.toasts.userStatusUpdated'))
                  break
          }
          await loadUsers()
          setShowConfirmModal(false)
          setAdminPassword('')
          setPendingAction(null)
      } catch (error) {
          toast.error(t('userManagement.toasts.actionFailed'))
      }
  }

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      // First verify admin password (using the same modal or a step inside this one)
      // For simplicity here, we'll assume the admin is already logged in, 
      // BUT for high security we should ask for admin password here too.
      // Let's reuse the concept: We need to verify admin identity.
      
      // We'll ask for admin password inside this modal as well
      if (!verifyCurrentPassword(adminPassword)) {
          toast.error(t('userManagement.toasts.invalidAdminPassword'))
          return
      }
      
      if (!targetUserForReset) return
      if (newPassword.length < 6) {
          toast.error(t('userManagement.toasts.passwordTooShort'))
          return
      }

      await adminSetUserPassword(targetUserForReset.id, newPassword)
      toast.success(
        t('userManagement.toasts.passwordResetSuccess').replace('{{username}}', targetUserForReset.username)
      )
      setShowPasswordResetModal(false)
      setAdminPassword('')
      setNewPassword('')
      setTargetUserForReset(null)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingUser(null)
    setFormData({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'mechanic',
      mechanicId: undefined,
      isActive: true,
      password: '',
      confirmPassword: ''
    })
    setErrors({})
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      mechanicId: user.mechanicId,
      isActive: user.isActive
    })
    setShowForm(true)
  }

  // --- Helper Functions for UI ---
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4 text-purple-600" />
      case 'supervisor': return <Eye className="h-4 w-4 text-blue-600" />
      case 'mechanic': return <Wrench className="h-4 w-4 text-orange-600" />
      case 'cashier': return <DollarSign className="h-4 w-4 text-green-600" />
      case 'template_admin': return <Settings className="h-4 w-4 text-indigo-600" />
      case 'template_viewer': return <FileText className="h-4 w-4 text-teal-600" />
      default: return null
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'supervisor': return 'bg-blue-100 text-blue-800'
      case 'mechanic': return 'bg-orange-100 text-orange-800'
      case 'cashier': return 'bg-green-100 text-green-800'
      case 'template_admin': return 'bg-indigo-100 text-indigo-800'
      case 'template_viewer': return 'bg-teal-100 text-teal-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleDescription = (role: UserRole): string => {
    switch (role) {
      case 'admin': return t('userManagement.form.roleDescriptions.admin')
      case 'supervisor': return t('userManagement.form.roleDescriptions.supervisor')
      case 'mechanic': return t('userManagement.form.roleDescriptions.mechanic')
      case 'cashier': return t('userManagement.form.roleDescriptions.cashier')
      case 'template_admin': return t('userManagement.form.roleDescriptions.template_admin')
      case 'template_viewer': return t('userManagement.form.roleDescriptions.template_viewer')
      default: return t('userManagement.form.roleDescriptions.default')
    }
  }

  const getRolePermissions = (role: UserRole): string[] => {
    const { permissions } = useAuthStore.getState()
    const rolePerms = permissions[role]
    if (!rolePerms) return []
    
    const allPermissions = new Set<string>()
    Object.entries(rolePerms).forEach(([module, actions]) => {
      actions.forEach(action => allPermissions.add(`${action} ${module}`))
    })
    return Array.from(allPermissions).sort()
  }

  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {editingUser ? t('userManagement.form.editTitle') : t('userManagement.form.createTitle')}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {editingUser ? t('userManagement.form.editSubtitle') : t('userManagement.form.createSubtitle')}
                </p>
            </div>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userManagement.form.fields.username')}
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.username ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm`}
                  disabled={!!editingUser}
                />
                {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userManagement.form.fields.email')}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userManagement.form.fields.firstName')}
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.firstName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm`}
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userManagement.form.fields.lastName')}
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.lastName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm`}
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('userManagement.form.fields.role')}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="admin">{t('userManagement.form.roleOptions.admin')}</option>
                  <option value="supervisor">{t('userManagement.form.roleOptions.supervisor')}</option>
                  <option value="mechanic">{t('userManagement.form.roleOptions.mechanic')}</option>
                  <option value="cashier">{t('userManagement.form.roleOptions.cashier')}</option>
                  <option value="template_admin">{t('userManagement.form.roleOptions.template_admin')}</option>
                  <option value="template_viewer">{t('userManagement.form.roleOptions.template_viewer')}</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">{getRoleDescription(formData.role)}</p>
              </div>

              {formData.role === 'mechanic' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Mechanic profile
                  </label>
                  <select
                    value={formData.mechanicId || ''}
                    onChange={(e) => setFormData({ ...formData, mechanicId: e.target.value || undefined })}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm ${
                      errors.mechanicId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select mechanic</option>
                    {mechanics.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  {errors.mechanicId && <p className="mt-1 text-sm text-red-600">{errors.mechanicId}</p>}
                </div>
              )}

              {/* Password fields only for new users */}
              {!editingUser && (
                  <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('userManagement.form.fields.password')}
                        </label>
                        <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`mt-1 block w-full px-3 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm`}
                        placeholder={t('userManagement.form.fields.passwordPlaceholder')}
                        />
                        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('userManagement.form.fields.confirmPassword')}
                        </label>
                        <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className={`mt-1 block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm`}
                        />
                        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                    </div>
                  </>
              )}

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {t('userManagement.form.fields.activeAccount')}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {t('userManagement.form.buttons.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {editingUser ? t('userManagement.form.buttons.updateUser') : t('userManagement.form.buttons.createUser')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {t('userManagement.header.title')}
            </h3>
            <p className="text-gray-500">
              {t('userManagement.header.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('userManagement.header.addUser')}
          </button>
      </div>

      {/* Search & Stats */}
      <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('userManagement.search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              {t('userManagement.list.loading')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.table.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.table.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.table.lastLogin')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            {t('userManagement.list.empty').replace('{{search}}', searchTerm)}
                        </td>
                    </tr>
                ) : (
                    filteredUsers.map((user) => (
                    <tr 
                        key={user.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onDoubleClick={() => handleEdit(user)}
                    >
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-700">
                                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </span>
                            </div>
                            </div>
                            <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">@{user.username}</div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex items-center">
                            {getRoleIcon(user.role)}
                            <div className="ml-2">
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                                {user.role.replace('_', ' ').toUpperCase()}
                            </span>
                            <button
                                onClick={() => setShowRolePermissions(user.role)}
                                className="text-xs text-blue-600 hover:text-blue-800 block mt-1 hover:underline"
                            >
                                {t('userManagement.buttons.viewPermissions')}
                            </button>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {user.isActive ? t('userManagement.status.active') : t('userManagement.status.inactive')}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleString()
                          : t('userManagement.status.never')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                                className="text-gray-400 hover:text-blue-600 p-1"
                                title={t('userManagement.buttons.editDetails')}
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                            
                            <button
                                onClick={(e) => { e.stopPropagation(); initiatePasswordReset(user); }}
                                className="text-gray-400 hover:text-orange-600 p-1"
                                title={t('userManagement.buttons.resetPassword')}
                            >
                                <Key className="h-4 w-4" />
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); initiateStatusToggle(user); }}
                                className={`p-1 ${user.isActive ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`}
                                disabled={user.id === currentUser?.id}
                                title={user.isActive ? t('userManagement.buttons.deactivate') : t('userManagement.buttons.activate')}
                            >
                                {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                            
                            <button
                                onClick={(e) => { e.stopPropagation(); initiateDelete(user); }}
                                className="text-gray-400 hover:text-red-600 p-1"
                                disabled={user.id === currentUser?.id}
                                title={t('userManagement.buttons.deleteUser')}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        </td>
                    </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Permissions Modal */}
      {showRolePermissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">
                  {showRolePermissions.toUpperCase().replace('_', ' ') + t('userManagement.rolePermissions.titleSuffix')}
                </h3>
                <button onClick={() => setShowRolePermissions(null)} className="text-gray-400 hover:text-gray-500">
                    <X className="w-6 h-6" />
                </button>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              <p className="text-gray-600 mb-4 italic border-l-4 border-blue-500 pl-3">
                  {getRoleDescription(showRolePermissions)}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getRolePermissions(showRolePermissions).map((permission, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-700 bg-gray-50 p-2 rounded">
                      <ShieldCheck className="w-4 h-4 text-green-600 mr-2" />
                      {permission}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Sensitive Actions */}
      {showConfirmModal && pendingAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in-up">
                  <div className="flex items-center mb-4 text-red-600">
                      <Shield className="w-6 h-6 mr-2" />
                      <h3 className="text-lg font-bold">
                        {t('userManagement.confirmation.title')}
                      </h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                      {t('userManagement.confirmation.intro')}{' '}
                      <strong>{pendingAction.description}</strong>.
                      {' '}
                      {t('userManagement.confirmation.sensitiveNote')}
                  </p>
                  <form onSubmit={handleConfirmSensitiveAction}>
                      <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder={t('userManagement.confirmation.adminPasswordPlaceholder')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          autoFocus
                      />
                      <div className="flex justify-end space-x-3">
                          <button
                              type="button"
                              onClick={() => { setShowConfirmModal(false); setAdminPassword(''); setPendingAction(null); }}
                              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                          >
                              {t('userManagement.confirmation.cancel')}
                          </button>
                          <button
                              type="submit"
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                              {t('userManagement.confirmation.confirm')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && targetUserForReset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in-up">
                  <div className="flex items-center mb-4 text-blue-600">
                      <Key className="w-6 h-6 mr-2" />
                      <h3 className="text-lg font-bold">
                        {t('userManagement.passwordReset.title')}
                      </h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                      {t('userManagement.passwordReset.descriptionPrefix')}{' '}
                      <strong>{targetUserForReset.username}</strong>.
                  </p>
                  <form onSubmit={handlePasswordResetSubmit}>
                      <div className="space-y-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase">
                              {t('userManagement.passwordReset.newPasswordLabel')}
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t('userManagement.passwordReset.newPasswordPlaceholder')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="border-t pt-4">
                            <label className="block text-xs font-medium text-red-500 uppercase mb-1">
                              {t('userManagement.passwordReset.adminVerificationLabel')}
                            </label>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                placeholder={t('userManagement.passwordReset.adminPasswordPlaceholder')}
                                className="w-full px-3 py-2 border border-red-200 rounded-md focus:ring-2 focus:ring-red-500 bg-red-50"
                            />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3">
                          <button
                              type="button"
                              onClick={() => { setShowPasswordResetModal(false); setAdminPassword(''); setNewPassword(''); }}
                              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                          >
                              {t('userManagement.passwordReset.cancel')}
                          </button>
                          <button
                              type="submit"
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                              {t('userManagement.passwordReset.confirm')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  )
}

export default UserManagement
