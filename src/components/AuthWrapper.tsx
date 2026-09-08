import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsAuthenticated } from '../stores/authStore'
import { useCustomerStore } from '../stores/customerStore'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import LoginForm from './LoginForm'
import PasswordResetForm from './PasswordResetForm'

interface AuthWrapperProps {
  children: React.ReactNode
}

type AuthView = 'login' | 'reset' | 'authenticated'

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AuthView>('login')
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      setCurrentView('authenticated')
    } else {
      setCurrentView('login')
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    const rehydrate = async () => {
      const stores: any[] = [useCustomerStore, useJobOrderStore, useEstimateInvoiceStore]
      await Promise.all(
        stores.map((s) => {
          const fn = s?.persist?.rehydrate
          if (typeof fn !== 'function') return Promise.resolve()
          return Promise.resolve(fn())
        }),
      )
    }
    void rehydrate()
  }, [isAuthenticated])

  const handleLoginSuccess = () => {
    setCurrentView('authenticated')
    navigate('/')
  }

  const handleForgotPassword = () => {
    setCurrentView('reset')
  }

  const handleBackToLogin = () => {
    setCurrentView('login')
  }

  const handlePasswordResetSuccess = () => {
    setCurrentView('login')
  }

  // Render appropriate view
  switch (currentView) {
    case 'login':
      return (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onForgotPassword={handleForgotPassword}
        />
      )
    
    case 'reset':
      return (
        <PasswordResetForm
          onBackToLogin={handleBackToLogin}
          onSuccess={handlePasswordResetSuccess}
        />
      )
    
    case 'authenticated':
      return (
        <div className="min-h-screen bg-gray-50">
          {/* Main content only - TopNavigation is handled in App.tsx */}
          <main className="py-6">
            {children}
          </main>
        </div>
      )
    
    default:
      return <LoginForm onSuccess={handleLoginSuccess} />
  }
}

export default AuthWrapper
