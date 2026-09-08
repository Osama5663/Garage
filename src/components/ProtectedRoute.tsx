import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, useCurrentUser, useIsAuthenticated } from '../stores/authStore'
import { UserRole } from '../types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
  requiredPermission?: string
  requiredModule?: string
  fallback?: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  requiredModule,
  fallback
}) => {
  const isAuthenticated = useIsAuthenticated()
  const currentUser = useCurrentUser()
  const location = useLocation()
  const { hasPermission, hasRole } = useAuthStore()

  // Debug authentication status
  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated)
  console.log('ProtectedRoute - currentUser:', currentUser)

  // Check if user is authenticated
  if (!isAuthenticated || !currentUser) {
    console.log('ProtectedRoute - Redirecting to login')
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if user is active
  if (currentUser?.isActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Account Suspended</h3>
            <p className="text-gray-600 mb-4">
              Your account has been suspended. Please contact your administrator for assistance.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole as UserRole | UserRole[])) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have the required permissions to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Required role: {requiredRole ? (Array.isArray(requiredRole) ? (requiredRole as string[]).join(' or ') : String(requiredRole)) : 'No specific role required'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission as string, requiredModule)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have the required permissions to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Required permission: {requiredPermission}
              {requiredModule && ` for module: ${requiredModule}`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // All checks passed, render the protected content
  return <>{children}</>
}

export default ProtectedRoute