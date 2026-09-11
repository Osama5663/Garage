import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, UserRole, UserActivity, AuthState, LoginCredentials, ActionPermissions } from '../types/auth'
import { ACTION_PERMISSIONS } from '../types/auth'
import { api } from '../services/api'

interface AuthStore extends AuthState {
  // Permissions state
  permissions: ActionPermissions
  updateRolePermissions: (role: UserRole, permissions: Record<string, string[]>) => void
  
  // Password storage (for demo persistence)
  userPasswords: Record<string, string>

  // Authentication actions
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  updateUser: (user: Partial<User>) => void
  
  // User management (Admin only)
  createUser: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, initialPassword?: string) => Promise<User | null>
  updateUserById: (userId: string, updates: Partial<User>) => Promise<boolean>
  deleteUser: (userId: string) => Promise<boolean>
  getAllUsers: () => User[]
  
  // Password management
  requestPasswordReset: (email: string) => Promise<boolean>
  resetPassword: (token: string, newPassword: string) => Promise<boolean>
  changePassword: (userId: string, oldPassword: string, newPassword: string) => Promise<boolean>
  adminSetUserPassword: (userId: string, newPassword: string) => Promise<boolean>
  verifyCurrentPassword: (password: string) => boolean
  
  // Activity logging
  logActivity: (action: string, details?: Record<string, any>, resource?: string, resourceId?: string) => void
  getUserActivity: (userId?: string) => UserActivity[]
  clearActivityLog: () => void
  importActivityLog: (userId?: string) => Promise<boolean>
  
  // Permission checking
  hasPermission: (action: string, module?: string) => boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
  
  // Session management
  refreshSession: () => Promise<boolean>
  clearSession: () => void
}

// Mock users for demonstration
const MOCK_USERS: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@garage.com',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failedLoginAttempts: 0
  },
  {
    id: '2',
    username: 'mechanic1',
    email: 'mechanic@garage.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'mechanic',
    mechanicId: 'mech_1',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failedLoginAttempts: 0
  },
  {
    id: '3',
    username: 'cashier1',
    email: 'cashier@garage.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'cashier',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failedLoginAttempts: 0
  },
  {
    id: '4',
    username: 'supervisor1',
    email: 'supervisor@garage.com',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'supervisor',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failedLoginAttempts: 0
  }
]

// Mock password hashes (in real app, these would be properly hashed)
const MOCK_PASSWORDS: Record<string, string> = {
  'admin': 'admin123',
  'mechanic1': 'mechanic123',
  'cashier1': 'cashier123',
  'supervisor1': 'supervisor123'
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      permissions: ACTION_PERMISSIONS,
      currentUser: null,
      isAuthenticated: false,
      users: MOCK_USERS,
      userPasswords: MOCK_PASSWORDS, // Initialize with default mock passwords
      activities: [],
      sessionToken: null,
      sessionExpiry: null,
      isLoading: false,
      error: null,

      updateRolePermissions: (role: UserRole, permissions: Record<string, string[]>) => {
          const { currentUser } = get()
          if (!currentUser || currentUser.role !== 'admin') {
              get().logActivity('UNAUTHORIZED_PERMISSION_UPDATE_ATTEMPT', { actor: currentUser?.username })
              return
          }
          
          set(state => ({
              permissions: {
                  ...state.permissions,
                  [role]: permissions
              }
          }))
          
          get().logActivity('ROLE_PERMISSIONS_UPDATED', { 
              role, 
              updatedBy: currentUser.username 
          })
      },

      // Authentication actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })
        
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const user = get().users.find(u => 
            u.username === credentials.username && u.isActive
          )
          
          if (!user) {
            set({ 
              isLoading: false, 
              error: 'Invalid username or password' 
            })
            return false
          }
          
          // Check password (mock implementation)
          // Use stored passwords first, fallback to mock if not found (though initialization should handle this)
          const storedPasswords = get().userPasswords
          const isValidPassword = (storedPasswords[credentials.username] || MOCK_PASSWORDS[credentials.username]) === credentials.password
          
          if (!isValidPassword) {
            // Update failed login attempts
            const updatedUsers = get().users.map(u => 
              u.id === user.id 
                ? { ...u, failedLoginAttempts: u.failedLoginAttempts + 1 }
                : u
            )
            
            set({ 
              users: updatedUsers,
              isLoading: false, 
              error: 'Invalid username or password' 
            })
            return false
          }
          
          // Generate session token
          const sessionToken = btoa(`${user.id}-${Date.now()}-${Math.random()}`)
          const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          
          // Update user with successful login
          const updatedUsers = get().users.map(u => 
            u.id === user.id 
              ? { 
                  ...u, 
                  lastLogin: new Date().toISOString(),
                  failedLoginAttempts: 0
                }
              : u
          )
          
          set({
            currentUser: user,
            isAuthenticated: true,
            users: updatedUsers,
            sessionToken,
            sessionExpiry,
            isLoading: false,
            error: null
          })
          
          // Log successful login
          get().logActivity('USER_LOGIN', { 
            username: user.username,
            role: user.role 
          })
          
          return true
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Login failed. Please try again.' 
          })
          return false
        }
      },

      logout: () => {
        const { currentUser } = get()
        
        if (currentUser) {
          get().logActivity('USER_LOGOUT', { 
            username: currentUser.username,
            role: currentUser.role 
          })
        }
        
        set({
          currentUser: null,
          isAuthenticated: false,
          sessionToken: null,
          sessionExpiry: null,
          error: null
        })
      },

      updateUser: (user: Partial<User>) => {
        const { currentUser } = get()
        if (!currentUser) return
        
        const updatedUser = { ...currentUser, ...user, updatedAt: new Date().toISOString() }
        const updatedUsers = get().users.map(u => 
          u.id === currentUser.id ? updatedUser : u
        )
        
        set({
          currentUser: updatedUser,
          users: updatedUsers
        })
        
        get().logActivity('USER_UPDATE', { 
          userId: currentUser.id,
          updatedFields: Object.keys(user)
        })
      },

      // User management (Admin only)
      createUser: async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, initialPassword?: string) => {
        const { currentUser, users, userPasswords } = get()
        
        if (!currentUser || currentUser.role !== 'admin') {
          get().logActivity('UNAUTHORIZED_USER_CREATE_ATTEMPT', { 
            actor: currentUser?.username || 'anonymous',
            targetRole: userData.role
          })
          return null
        }
        
        // Check if username or email already exists
        if (users.some(u => u.username === userData.username || u.email === userData.email)) {
          set({ error: 'Username or email already exists' })
          return null
        }
        
        const newUser: User = {
          ...userData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          failedLoginAttempts: 0,
          isActive: true
        }
        
        const updatedUsers = [...users, newUser]
        
        // Set password if provided, otherwise default to username123
        const password = initialPassword || `${newUser.username}123`
        const updatedPasswords = { ...userPasswords, [newUser.username]: password }
        
        set({ users: updatedUsers, userPasswords: updatedPasswords })
        
        get().logActivity('USER_CREATED', { 
          userId: newUser.id,
          username: newUser.username,
          role: newUser.role,
          createdBy: currentUser.username
        })
        
        return newUser
      },

      updateUserById: async (userId: string, updates: Partial<User>) => {
        const { currentUser, users } = get()
        
        if (!currentUser || currentUser.role !== 'admin') {
          get().logActivity('UNAUTHORIZED_USER_UPDATE_ATTEMPT', { 
            actor: currentUser?.username || 'anonymous',
            targetUserId: userId
          })
          return false
        }
        
        const updatedUsers = users.map(u => 
          u.id === userId 
            ? { ...u, ...updates, updatedAt: new Date().toISOString() }
            : u
        )
        
        set({ users: updatedUsers })
        
        get().logActivity('USER_UPDATED', { 
          userId,
          updatedFields: Object.keys(updates),
          updatedBy: currentUser.username
        })
        
        return true
      },

      deleteUser: async (userId: string) => {
        const { currentUser, users } = get()
        
        if (!currentUser || currentUser.role !== 'admin') {
          get().logActivity('UNAUTHORIZED_USER_DELETE_ATTEMPT', { 
            actor: currentUser?.username || 'anonymous',
            targetUserId: userId
          })
          return false
        }
        
        // Prevent deleting yourself
        if (currentUser.id === userId) {
          set({ error: 'Cannot delete your own account' })
          return false
        }
        
        const userToDelete = users.find(u => u.id === userId)
        if (!userToDelete) return false
        
        const updatedUsers = users.filter(u => u.id !== userId)
        set({ users: updatedUsers })
        
        get().logActivity('USER_DELETED', { 
          userId,
          username: userToDelete.username,
          role: userToDelete.role,
          deletedBy: currentUser.username
        })
        
        return true
      },

      getAllUsers: () => {
        const { currentUser } = get()
        
        if (!currentUser || currentUser.role !== 'admin') {
          get().logActivity('UNAUTHORIZED_USER_LIST_ACCESS', { 
            actor: currentUser?.username || 'anonymous'
          })
          return []
        }
        
        return get().users
      },

      // Password management
      requestPasswordReset: async (email: string) => {
        const { users } = get()
        
        try {
          const user = users.find(u => u.email === email)
          if (!user) {
            // Don't reveal whether email exists
            return true
          }
          
          // Generate reset token
          const resetToken = btoa(`${user.id}-${Date.now()}-${Math.random()}`)
          const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
          
          const updatedUsers = users.map(u => 
            u.id === user.id 
              ? { ...u, resetToken, resetTokenExpiry }
              : u
          )
          
          set({ users: updatedUsers })
          
          get().logActivity('PASSWORD_RESET_REQUESTED', { 
            userId: user.id,
            username: user.username
          })
          
          return true
        } catch (error) {
          return false
        }
      },

      resetPassword: async (token: string, _newPassword: string) => {
        const { users } = get()
        
        try {
          const user = users.find(u => u.resetToken === token)
          if (!user || !user.resetTokenExpiry) {
            return false
          }
          
          // Check if token is expired
          const now = new Date()
          const expiry = new Date(user.resetTokenExpiry)
          if (now > expiry) {
            return false
          }
          
          // Update password (mock implementation)
          const updatedUsers = users.map(u => 
            u.id === user.id 
              ? { 
                  ...u, 
                  resetToken: undefined,
                  resetTokenExpiry: undefined,
                  updatedAt: new Date().toISOString()
                }
              : u
          )
          
          set({ users: updatedUsers })
          
          get().logActivity('PASSWORD_RESET_COMPLETED', { 
            userId: user.id,
            username: user.username
          })
          
          return true
        } catch (error) {
          return false
        }
      },

      changePassword: async (userId: string, oldPassword: string, newPassword: string) => {
        const { currentUser, users, userPasswords } = get()
        
        if (!currentUser || (currentUser.id !== userId && currentUser.role !== 'admin')) {
          get().logActivity('UNAUTHORIZED_PASSWORD_CHANGE_ATTEMPT', { 
            actor: currentUser?.username || 'anonymous',
            targetUserId: userId
          })
          return false
        }
        
        const user = users.find(u => u.id === userId)
        if (!user) return false
        
        // Verify old password (mock implementation)
        const currentPassword = userPasswords[user.username] || MOCK_PASSWORDS[user.username]
        if (oldPassword !== currentPassword) {
          return false
        }
        
        // Update password (mock implementation)
        const updatedPasswords = { ...userPasswords, [user.username]: newPassword }
        set({ userPasswords: updatedPasswords })
        
        get().logActivity('PASSWORD_CHANGED', { 
          userId: user.id,
          username: user.username,
          changedBy: currentUser.username
        })
        
        return true
      },

      adminSetUserPassword: async (userId: string, newPassword: string) => {
        const { currentUser, users, userPasswords } = get()
        
        if (!currentUser || currentUser.role !== 'admin') {
            get().logActivity('UNAUTHORIZED_ADMIN_PASSWORD_RESET_ATTEMPT', { 
              actor: currentUser?.username || 'anonymous',
              targetUserId: userId
            })
            return false
        }

        const user = users.find(u => u.id === userId)
        if (!user) return false

        const updatedPasswords = { ...userPasswords, [user.username]: newPassword }
        set({ userPasswords: updatedPasswords })

        get().logActivity('ADMIN_PASSWORD_RESET', { 
            userId: user.id,
            username: user.username,
            resetBy: currentUser.username
        })

        return true
      },

      verifyCurrentPassword: (password: string) => {
          const { currentUser, userPasswords } = get()
          if (!currentUser) return false
          
          const storedPassword = userPasswords[currentUser.username] || MOCK_PASSWORDS[currentUser.username]
          return storedPassword === password
      },

      logActivity: (action: string, details?: Record<string, any>, resource?: string, resourceId?: string) => {
        if (action === 'NAVIGATION' || resource === 'navigation') {
          return
        }

        const { currentUser, activities } = get()
        const now = new Date().toISOString()

        let result = 'success'
        if (details && typeof details === 'object') {
          const flatParts: string[] = []
          Object.entries(details).forEach(([key, value]) => {
            if (value === undefined || value === null) return
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              flatParts.push(`${key}=${String(value)}`)
            }
          })
          if (flatParts.length > 0) {
            result = flatParts.join(', ')
          }
        }

        const activity: UserActivity = {
          id: Date.now().toString(),
          userId: currentUser?.id || 'system',
          username: currentUser?.username || 'system',
          action,
          result,
          resource: resource || 'system',
          resourceId: resourceId || currentUser?.id,
          details,
          timestamp: now,
          ipAddress: '127.0.0.1',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          success: true,
        }

        const updatedActivities = [activity, ...activities].slice(0, 1000)
        set({ activities: updatedActivities })

        try {
          void api.post('/user-actions', {
            action,
            result,
          })
        } catch {
        }
      },

      getUserActivity: (userId?: string) => {
        const { currentUser, activities } = get()
        
        if (!currentUser) return []
        
        // Non-admin users can only see their own activity
        if (currentUser.role !== 'admin' && userId !== currentUser.id) {
          return []
        }
        
        // If no userId specified, return current user's activity
        const targetUserId = userId || currentUser.id
        
        return activities.filter(activity => activity.userId === targetUserId)
      },

      clearActivityLog: () => {
        const { currentUser } = get()
        
        if (!currentUser || currentUser.role !== 'admin') {
          get().logActivity('UNAUTHORIZED_ACTIVITY_LOG_CLEAR_ATTEMPT', { 
            actor: currentUser?.username || 'anonymous'
          })
          return
        }
        
        set({ activities: [] })
        
        get().logActivity('ACTIVITY_LOG_CLEARED', { 
          clearedBy: currentUser.username
        })
      },

      importActivityLog: async (userId?: string) => {
        const { currentUser } = get()
        if (!currentUser || currentUser.role !== 'admin') {
          get().logActivity('UNAUTHORIZED_ACTIVITY_LOG_IMPORT_ATTEMPT', { 
            actor: currentUser?.username || 'anonymous'
          })
          return false
        }

        try {
          const params: Record<string, any> = { page: 1, limit: 500 }
          if (userId) {
            params.userId = userId
          }

          const response = await api.get('/user-actions', { params })
          const data = response.data
          if (data && data.success && Array.isArray(data.data)) {
            const list = data.data as UserActivity[]
            set({ activities: list })
            get().logActivity('ACTIVITY_LOG_IMPORTED', { 
              importedBy: currentUser.username,
              count: list.length
            })
            return true
          }
          return false
        } catch {
          return false
        }
      },

      // Permission checking
      hasPermission: (action: string, module?: string) => {
        const { currentUser, permissions } = get()
        
        if (!currentUser || !currentUser.isActive) return false
        
        // Admin has all permissions
        if (currentUser.role === 'admin') return true
        
        // Check role-based permissions
        const rolePermissions = permissions[currentUser.role]
        if (!rolePermissions) return false
        
        // If module is specified, check if the action is allowed for that module
        if (module) {
          const moduleActions = rolePermissions[module.toLowerCase()]
          return moduleActions ? moduleActions.includes(action.toLowerCase()) : false
        }
        
        // If no module specified, check if action is allowed in any module
        return Object.values(rolePermissions).some(actions => 
          actions.includes(action.toLowerCase())
        )
      },

      hasRole: (role: UserRole | UserRole[]) => {
        const { currentUser } = get()
        
        if (!currentUser || !currentUser.isActive) return false
        
        const roles = Array.isArray(role) ? role : [role]
        return roles.includes(currentUser.role)
      },

      // Session management
      refreshSession: async () => {
        const { sessionToken, sessionExpiry } = get()
        
        if (!sessionToken || !sessionExpiry) return false
        
        const now = new Date()
        const expiry = new Date(sessionExpiry)
        
        // If session is expired, logout
        if (now > expiry) {
          get().logout()
          return false
        }
        
        // Extend session by 24 hours
        const newSessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        set({ sessionExpiry: newSessionExpiry })
        
        return true
      },

      clearSession: () => {
        set({
          sessionToken: null,
          sessionExpiry: null,
          isAuthenticated: false,
          currentUser: null
        })
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        permissions: state.permissions,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        sessionToken: state.sessionToken,
        sessionExpiry: state.sessionExpiry,
        users: state.users,
        activities: state.activities.slice(0, 100)
      })
    }
  )
)

// Helper hooks for common authentication operations
export const useCurrentUser = () => useAuthStore(state => state.currentUser)
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated)
export const useHasPermission = (action: string, module?: string) => 
  useAuthStore(state => state.hasPermission(action, module))
export const useHasRole = (role: UserRole | UserRole[]) => 
  useAuthStore(state => state.hasRole(role))
export const useAuthLoading = () => useAuthStore(state => state.isLoading)
export const useAuthError = () => useAuthStore(state => state.error)
