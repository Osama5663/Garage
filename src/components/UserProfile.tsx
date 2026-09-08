import React, { useState, useEffect } from 'react'
import { useAuthStore, useCurrentUser } from '../stores/authStore'
import { Edit, Save, X, Key, Activity, Shield, User as UserIcon } from 'lucide-react'
import { t } from '../i18n'
import { useLangStore } from '../stores/langStore'
import { toast } from 'sonner'

interface UserProfileProps {
  userId?: string
}

const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const currentUser = useCurrentUser()
  const { updateUser, getUserActivity, clearActivityLog, importActivityLog, users } = useAuthStore()
  useLangStore(state => state.language)
  
  const [user, setUser] = useState<any | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const targetUserId = userId || currentUser?.id

  useEffect(() => {
    if (targetUserId) {
      const targetUser = users.find(u => u.id === targetUserId)
      if (targetUser) {
        setUser(targetUser)
        setFormData({
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          email: targetUser.email
        })
      }
    }
  }, [targetUserId, users])

  useEffect(() => {
    if (showActivity && targetUserId) {
      const userActivities = getUserActivity(targetUserId)
      setActivities(userActivities)
    }
  }, [showActivity, targetUserId, getUserActivity])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('userProfile.validation.firstNameRequired')
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('userProfile.validation.lastNameRequired')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('userProfile.validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('userProfile.validation.emailInvalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePassword = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword = t('userProfile.validation.currentPasswordRequired')
    }

    if (!passwordData.newPassword.trim()) {
      newErrors.newPassword = t('userProfile.validation.newPasswordRequired')
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = t('userProfile.validation.newPasswordMin')
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = t('userProfile.validation.passwordMismatch')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateForm() || !user) return

    setIsLoading(true)
    try {
      updateUser(formData)
      setIsEditing(false)
      setErrors({})
    } catch (error) {
      setErrors({ general: t('userProfile.messages.updateFailed') })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!validatePassword() || !user) return

    setIsLoading(true)
    try {
      // Mock password change - in real app, this would call the auth store
      // For now, we'll just reset the form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setIsChangingPassword(false)
      setErrors({})
      alert(t('userProfile.messages.changePasswordSuccess'))
    } catch (error) {
      setErrors({ general: t('userProfile.messages.changePasswordFailed') })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      })
    }
    setErrors({})
    setIsEditing(false)
  }

  const resetPasswordForm = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setErrors({})
    setIsChangingPassword(false)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'supervisor':
        return 'bg-blue-100 text-blue-800'
      case 'mechanic':
        return 'bg-orange-100 text-orange-800'
      case 'cashier':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5 text-purple-600" />
      case 'supervisor':
        return <Shield className="h-5 w-5 text-blue-600" />
      case 'mechanic':
        return <UserIcon className="h-5 w-5 text-orange-600" />
      case 'cashier':
        return <UserIcon className="h-5 w-5 text-green-600" />
      default:
        return <UserIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const DOCUMENT_ACTIONS = ['DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED']

  const getDocumentActionType = (action: string) => {
    if (action === 'DOCUMENT_CREATED') return 'Create'
    if (action === 'DOCUMENT_UPDATED') return 'Edit'
    if (action === 'DOCUMENT_DELETED') return 'Delete'
    return action.replace(/_/g, ' ').toLowerCase()
  }

  const getDocumentLabel = (activity: any) => {
    if (activity.result) {
      const blMatch = activity.result.match(/blNumber=([^,\s]+)/i)
      if (blMatch && blMatch[1]) return blMatch[1]

      const docMatch = activity.result.match(/document(?:Number|No|id|Id|_id)?=([^,\s]+)/i)
      if (docMatch && docMatch[1]) return docMatch[1]

      return activity.result.length > 80 ? `${activity.result.slice(0, 77)}...` : activity.result
    }
    if (activity.resourceId) return activity.resourceId
    return 'Document'
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">{t('userProfile.messages.loadProfile')}</p>
        </div>
      </div>
    )
  }

  const isOwnProfile = !userId || userId === currentUser?.id

  const documentActivities = [...activities]
    .filter((activity) => DOCUMENT_ACTIONS.includes(activity.action))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {isOwnProfile ? t('userProfile.header.myProfile') : t('userProfile.header.userProfile')}
            </h3>
            <div className="flex space-x-2">
              {!isEditing && isOwnProfile && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('userProfile.buttons.editProfile')}
                </button>
              )}
              {isOwnProfile && (
                <button
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {t('userProfile.buttons.changePassword')}
                </button>
              )}
              <button
                onClick={() => setShowActivity(!showActivity)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Activity className="h-4 w-4 mr-2" />
                {t('userProfile.buttons.activityLog')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {errors.general && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.username')}
                </label>
                <div className="mt-1 text-sm text-gray-900">{user.username}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.firstName')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border ${errors.firstName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-gray-900">{user.firstName}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.lastName')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border ${errors.lastName ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-gray-900">{user.lastName}</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.email')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-gray-900">{user.email}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.role')}
                </label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {getRoleIcon(user.role)}
                    <span className="ml-1">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.accountStatus')}
                </label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? t('userProfile.status.active') : t('userProfile.status.inactive')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.lastLogin')}
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : t('userProfile.status.never')}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={resetForm}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2" />
                {t('userProfile.buttons.cancel')}
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? t('userProfile.buttons.saving') : t('userProfile.buttons.saveChanges')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Form */}
      {isChangingPassword && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">
              {t('userProfile.buttons.changePassword')}
            </h4>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.currentPassword')}
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.currentPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.newPassword')}
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.newPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('userProfile.fields.confirmNewPassword')}
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={resetPasswordForm}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2" />
                {t('userProfile.buttons.cancel')}
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Key className="h-4 w-4 mr-2" />
                {isLoading ? t('userProfile.buttons.changing') : t('userProfile.buttons.changePasswordAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showActivity && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">
              {t('userProfile.activity.header')}
            </h4>
            {currentUser?.role === 'admin' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (!window.confirm('Clear all activity history for all users?')) return
                    clearActivityLog()
                    if (targetUserId) {
                      const userActivities = getUserActivity(targetUserId)
                      setActivities(userActivities)
                    }
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-white hover:bg-red-50"
                >
                  Clear history
                </button>
                <button
                  onClick={async () => {
                    if (isImporting) return
                    setIsImporting(true)
                    try {
                      const ok = await importActivityLog(targetUserId)
                      if (ok && targetUserId) {
                        const userActivities = getUserActivity(targetUserId)
                        setActivities(userActivities)
                        toast.success('Activity imported from server')
                      } else {
                        toast.error('Failed to import activity from server')
                      }
                    } finally {
                      setIsImporting(false)
                    }
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing…' : 'Import'}
                </button>
              </div>
            )}
          </div>
          <div className="px-6 py-4">
            {documentActivities.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t('userProfile.activity.empty')}
              </p>
            ) : (
              <div className="space-y-3">
                {documentActivities.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Activity className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {getDocumentActionType(activity.action)} • {getDocumentLabel(activity)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProfile
