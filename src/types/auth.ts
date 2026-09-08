export type UserRole = 'admin' | 'mechanic' | 'cashier' | 'supervisor' | 'template_admin' | 'template_viewer'

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
  // Security fields
  passwordHash?: string // Not exposed in API responses
  resetToken?: string
  resetTokenExpiry?: string
  failedLoginAttempts: number
  lockoutUntil?: string
}

export interface UserActivity {
  id: string
  userId: string
  username: string
  action: string
  result: string
  resource?: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
  success?: boolean
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordReset {
  token: string
  newPassword: string
}

export interface UserProfile {
  firstName: string
  lastName: string
  email: string
}

export interface ChangePassword {
  currentPassword: string
  newPassword: string
}

// Role-based permissions
export interface RolePermissions {
  [key: string]: string[]
}

export const ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    'dashboard',
    'customers',
    'job-orders',
    'estimates',
    'invoices',
    'inventory',
    'reports',
    'users',
    'settings',
    'documents',
    'templates'
  ],
  supervisor: [
    'dashboard',
    'customers',
    'job-orders',
    'estimates',
    'invoices',
    'inventory',
    'reports',
    'documents',
    'templates'
  ],
  template_admin: [
    'dashboard',
    'documents',
    'templates'
  ],
  template_viewer: [
    'dashboard',
    'documents',
    'templates'
  ],
  mechanic: [
    'dashboard',
    'job-orders',
    'estimates',
    'documents'
  ],
  cashier: [
    'dashboard',
    'customers',
    'estimates',
    'invoices',
    'documents'
  ]
}

// Action permissions for different resources
export interface ActionPermissions {
  [role: string]: {
    [resource: string]: string[]
  }
}

// Authentication state interface
export interface AuthState {
  currentUser: User | null
  isAuthenticated: boolean
  users: User[]
  activities: UserActivity[]
  sessionToken: string | null
  sessionExpiry: string | null
  isLoading: boolean
  error: string | null
}

export const ACTION_PERMISSIONS: ActionPermissions = {
  admin: {
    'job-orders': ['create', 'read', 'update', 'delete', 'approve'],
    'invoices': ['create', 'read', 'update', 'delete'],
    'estimates': ['create', 'read', 'update', 'delete'],
    'customers': ['create', 'read', 'update', 'delete'],
    'inventory': ['create', 'read', 'update', 'delete'],
    'users': ['create', 'read', 'update', 'delete'],
    'settings': ['create', 'read', 'update', 'delete'],
    'settings_workshop': ['read', 'update'],
    'settings_taxes': ['read', 'update'],
    'settings_job_types': ['read', 'update'],
    'settings_backup': ['read', 'create', 'restore'],
    'settings_currency': ['read', 'update'],
    'documents': ['create', 'read', 'update', 'delete'],
    'templates': ['create', 'read', 'update', 'delete', 'publish']
  },
  supervisor: {
    'job-orders': ['read'],
    'invoices': ['create', 'read', 'update'],
    'estimates': ['create', 'read', 'update'],
    'customers': ['create', 'read', 'update'],
    'inventory': ['create', 'read', 'update'],
    'reports': ['read'],
    'settings': ['read'],
    'settings_workshop': ['read'],
    'settings_taxes': ['read'],
    'settings_job_types': ['read', 'update'],
    'settings_currency': ['read'],
    'documents': ['create', 'read', 'update', 'delete'],
    'templates': ['create', 'read', 'update', 'publish']
  },
  template_admin: {
    'templates': ['create', 'read', 'update', 'delete', 'publish'],
    'documents': ['create', 'read', 'update', 'delete']
  },
  template_viewer: {
    'templates': ['read'],
    'documents': ['read']
  },
  mechanic: {
    'job-orders': ['read', 'update'],
    'estimates': ['read', 'create'],
    'documents': ['create', 'read', 'update']
  },
  cashier: {
    'customers': ['create', 'read', 'update'],
    'invoices': ['create', 'read', 'update'],
    'estimates': ['create', 'read', 'update'],
    'documents': ['create', 'read', 'update']
  }
}
