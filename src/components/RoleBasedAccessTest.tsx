import React from 'react'
import { useAuthStore, useCurrentUser } from '../stores/authStore'
import { UserRole } from '../types/auth'
import { Shield, Eye, Settings, FileText, Wrench, DollarSign } from 'lucide-react'

const RoleBasedAccessTest: React.FC = () => {
  const currentUser = useCurrentUser()
  const { hasRole, hasPermission } = useAuthStore()

  const testRoles: UserRole[] = ['admin', 'supervisor', 'template_admin', 'template_viewer', 'mechanic', 'cashier']
  const testPermissions = [
    { action: 'create', module: 'templates' },
    { action: 'read', module: 'templates' },
    { action: 'update', module: 'templates' },
    { action: 'delete', module: 'templates' },
    { action: 'publish', module: 'templates' },
    { action: 'create', module: 'documents' },
    { action: 'read', module: 'documents' }
  ]

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4 text-purple-600" />
      case 'supervisor': return <Eye className="h-4 w-4 text-blue-600" />
      case 'template_admin': return <Settings className="h-4 w-4 text-indigo-600" />
      case 'template_viewer': return <FileText className="h-4 w-4 text-teal-600" />
      case 'mechanic': return <Wrench className="h-4 w-4 text-orange-600" />
      case 'cashier': return <DollarSign className="h-4 w-4 text-green-600" />
      default: return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Role-Based Access Control Test</h2>
      
      {/* Current User Info */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Current User</h3>
        {currentUser ? (
          <div>
            <p className="text-blue-800"><strong>Username:</strong> {currentUser.username}</p>
            <p className="text-blue-800"><strong>Role:</strong> {currentUser.role}</p>
            <p className="text-blue-800"><strong>Email:</strong> {currentUser.email}</p>
            <p className="text-blue-800"><strong>Status:</strong> {currentUser.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        ) : (
          <p className="text-red-600">No user logged in</p>
        )}
      </div>

      {/* Role Testing */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Testing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testRoles.map((role) => (
            <div key={role} className="p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                {getRoleIcon(role)}
                <span className="ml-2 font-medium capitalize">{role.replace('_', ' ')}</span>
              </div>
              <div className="text-sm">
                <p className={`font-medium ${hasRole(role) ? 'text-green-600' : 'text-red-600'}`}>
                  {hasRole(role) ? '✓ Has Role' : '✗ No Role'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permission Testing */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Permission Testing</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin User
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testPermissions.map((perm, index) => {
                const currentHasPermission = hasPermission(perm.action, perm.module)
                
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {perm.module}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {perm.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        currentHasPermission ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {currentHasPermission ? '✓ Allowed' : '✗ Denied'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        ✓ Allowed
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Template-Specific Testing */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Management Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Template Admin Access</h4>
            <div className="space-y-2 text-sm">
              <p className={hasRole(['admin', 'template_admin']) ? 'text-green-600' : 'text-red-600'}>
                {hasRole(['admin', 'template_admin']) ? '✓' : '✗'} Create Templates
              </p>
              <p className={hasRole(['admin', 'template_admin']) ? 'text-green-600' : 'text-red-600'}>
                {hasRole(['admin', 'template_admin']) ? '✓' : '✗'} Edit Templates
              </p>
              <p className={hasRole(['admin', 'template_admin']) ? 'text-green-600' : 'text-red-600'}>
                {hasRole(['admin', 'template_admin']) ? '✓' : '✗'} Delete Templates
              </p>
            </div>
          </div>
          
          
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          
          
          <button
            onClick={() => window.location.href = '/users'}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              hasRole('admin')
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!hasRole('admin')}
          >
            Manage Users
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoleBasedAccessTest
