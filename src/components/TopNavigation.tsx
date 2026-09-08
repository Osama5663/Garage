import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useLangStore } from '../stores/langStore'
import { useAuthStore } from '../stores/authStore'
import { env } from '../config/env'
import { DataSyncModal } from './DataSyncModal'
import { Database } from 'lucide-react'
import { t } from '../i18n'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

interface TopNavigationProps {
  userRole?: string;
  userName?: string;
}

const TopNavigation: React.FC<TopNavigationProps> = ({ 
  userName = t('user.systemAdmin')
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setLocale } = useLangStore()
  const { logout, logActivity, hasRole } = useAuthStore()
  const [syncOpen, setSyncOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const canAccessSettings = hasRole('admin')
  const logoutLabel = t('nav.logout')

  useEffect(() => {
    setLocale('fr-FR'); document.documentElement.lang = 'fr'
  }, [setLocale])

  const TRANSITION_MS = 200
  const isTopbarCollapsed = false
  const [activeMenu, setActiveMenu] = useState<'none' | 'workshop' | 'sales' | 'stock'>('none')
  const [activeMobileMenu, setActiveMobileMenu] = useState<'none' | 'workshop' | 'sales' | 'stock'>('none')
  const workshopGroupRef = useRef<HTMLDivElement | null>(null)
  const salesGroupRef = useRef<HTMLDivElement | null>(null)
  const stockGroupRef = useRef<HTMLDivElement | null>(null)

  const closeAll = useCallback(() => setActiveMenu('none'), [])
  const openMenu = useCallback((menu: 'workshop' | 'sales' | 'stock') => {
    if (activeMenu === menu) {
      setActiveMenu('none')
      return
    }
    if (activeMenu !== 'none') {
      setActiveMenu('none')
      setTimeout(() => setActiveMenu(menu), TRANSITION_MS)
    } else {
      setActiveMenu(menu)
    }
  }, [activeMenu])

  const openMobileMenu = useCallback((menu: 'workshop' | 'sales' | 'stock') => {
    if (activeMobileMenu === menu) {
      setActiveMobileMenu('none')
      return
    }
    if (activeMobileMenu !== 'none') {
      setActiveMobileMenu('none')
      setTimeout(() => setActiveMobileMenu(menu), TRANSITION_MS)
    } else {
      setActiveMobileMenu(menu)
    }
  }, [activeMobileMenu])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (activeMenu === 'none') return
      const target = e.target as Node
      if (workshopGroupRef.current?.contains(target)) return
      if (salesGroupRef.current?.contains(target)) return
      if (stockGroupRef.current?.contains(target)) return
      closeAll()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAll() }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [activeMenu, closeAll])

  const makeMenuNavHandler = useCallback((to: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setActiveMenu('none')
    setActiveMobileMenu('none')
    setTimeout(() => {
      try {
        const current = `${location.pathname}${location.search}`
        if (current === to) return
        logActivity('NAVIGATION', { 
          from: current,
          to,
          source: 'topbar'
        }, 'navigation', to)
        navigate(to)
      } catch (err: any) {
        toast.error('Navigation failed')
      }
    }, TRANSITION_MS)
  }, [navigate, location.pathname, location.search, logActivity])

  return (
    <nav
      className={`topbar bg-white border-b border-gray-200 ${isTopbarCollapsed ? 'topbar-collapsed' : 'topbar-shadow'}`}
      role="navigation"
      aria-label="Main navigation"
      aria-hidden={isTopbarCollapsed}
      id="app-topbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <button
              onClick={makeMenuNavHandler('/profile')}
              className="hidden md:inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {userName}
            </button>
            
          </div>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:block">
            <div className="flex items-baseline space-x-4">
              <Link
                to="/"
                onClick={makeMenuNavHandler('/')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {t('nav.dashboard')}
              </Link>

              {/* Atelier group */}
              <div
                className="relative group"
                ref={workshopGroupRef}
              >
                <button
                  className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-haspopup="true"
                  aria-expanded={activeMenu === 'workshop'}
                  onClick={() => openMenu('workshop')}
                >
                  {t('nav.workshop')}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 group-hover:rotate-180 ${activeMenu === 'workshop' ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className={`absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg transform origin-top overflow-hidden
                    ${activeMenu === 'workshop' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
                    group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:scale-100 transition-all duration-200 ease-out`}
                  role="menu"
                  aria-label={t('nav.workshop')}
                >
                  <Link to="/job-orders" onClick={makeMenuNavHandler('/job-orders')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100" role="menuitem">
                    {t('nav.jobs')}
                  </Link>
                  <Link to="/reports" onClick={makeMenuNavHandler('/reports')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100" role="menuitem">
                    {t('nav.reports')}
                  </Link>
                  <Link to="/technicians/performance" onClick={makeMenuNavHandler('/technicians/performance')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100" role="menuitem">
                    {t('nav.techPerformance')}
                  </Link>
                  <Link to="/tva-report" onClick={makeMenuNavHandler('/tva-report')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100" role="menuitem">
                    Rapport TVA
                  </Link>
                </div>
              </div>

              <div className="relative group" ref={salesGroupRef}>
                <button
                  className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-haspopup="true"
                  aria-expanded={activeMenu === 'sales'}
                  onClick={() => openMenu('sales')}
                >
                  {t('nav.sales')}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 group-hover:rotate-180 ${activeMenu === 'sales' ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className={`absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg transform origin-top overflow-hidden
                    ${activeMenu === 'sales' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
                    group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:scale-100 transition-all duration-200 ease-out`}
                  role="menu"
                  aria-label={t('nav.sales')}
                >
                  {(() => {
                    const sp = new URLSearchParams(location.search)
                    const tab = sp.get('tab')
                    const isEst = (location.pathname === '/sales' && tab === 'estimates') || location.pathname === '/estimates'
                    const isDN = (location.pathname === '/sales' && tab === 'delivery-notes') || location.pathname === '/delivery-notes'
                    const isInv = (location.pathname === '/sales' && tab === 'invoices') || location.pathname === '/invoices'
                    return (
                      <>
                        <Link to="/sales?tab=estimates" onClick={makeMenuNavHandler('/sales?tab=estimates')} className={`block px-4 py-2 text-sm ${isEst ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100'}`} role="menuitem">Devis</Link>
                        <Link to="/sales?tab=delivery-notes" onClick={makeMenuNavHandler('/sales?tab=delivery-notes')} className={`block px-4 py-2 text-sm ${isDN ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100'}`} role="menuitem">{t('nav.deliveryNotes')}</Link>
                        <Link to="/sales?tab=invoices" onClick={makeMenuNavHandler('/sales?tab=invoices')} className={`block px-4 py-2 text-sm ${isInv ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100'}`} role="menuitem">{t('nav.invoices')}</Link>
                      </>
                    )
                  })()}
                  <Link to="/cashflow" onClick={makeMenuNavHandler('/cashflow')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100" role="menuitem">Trésorerie</Link>
                </div>
              </div>

              {/* Stock group */}
              <div className="relative group" ref={stockGroupRef}>
                <button
                  className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-haspopup="true"
                  aria-expanded={activeMenu === 'stock'}
                  onClick={() => openMenu('stock')}
                >
                  {t('nav.inventory')}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 group-hover:rotate-180 ${activeMenu === 'stock' ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className={`absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg transform origin-top overflow-hidden
                    ${activeMenu === 'stock' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
                    group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:scale-100 transition-all duration-200 ease-out`}
                  role="menu"
                  aria-label={t('nav.inventory')}
                >
                  <Link to="/inventory" onClick={makeMenuNavHandler('/inventory')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100" role="menuitem">
                    {t('nav.dashboard')}
                  </Link>
                  <Link to="/inventory/manage" onClick={makeMenuNavHandler('/inventory/manage')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100" role="menuitem">
                    {t('inventoryDashboard.actions.manageInventory')}
                  </Link>
                  <Link to="/supplier-delivery-notes" onClick={makeMenuNavHandler('/supplier-delivery-notes')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100" role="menuitem">
                    {t('nav.deliveryNotes')}
                  </Link>
                </div>
              </div>

              <Link
                to="/customers"
                onClick={makeMenuNavHandler('/customers')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {t('nav.customers')}
              </Link>
              
              
              
              {canAccessSettings && (
                <Link
                  to="/settings"
                  onClick={makeMenuNavHandler('/settings')}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t('nav.settings')}
                </Link>
              )}
              
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${env.environment === 'preview' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`} title={env.environment === 'preview' ? 'Environnement de prévisualisation' : 'Environnement de production'}>
              {env.environment === 'preview' ? 'Prévisualisation' : 'Prod'}
            </span>

            <button
              onClick={() => setSyncOpen(true)}
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Synchroniser les données"
              title="Synchroniser les données"
            >
              <span className="inline-flex items-center gap-2"><Database className="h-4 w-4" /> Synchroniser</span>
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label={logoutLabel}
            >
              {logoutLabel}
            </button>
          </div>

          {/* Mobile Menu Button Only */}
          <div className="flex items-center">
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded={isMenuOpen}
                aria-label="Main menu"
              >
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <Link
                to="/"
                onClick={makeMenuNavHandler('/')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              >
                {t('nav.dashboard')}
              </Link>
              <button
                onClick={() => openMobileMenu('workshop')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-expanded={activeMobileMenu === 'workshop'}
              >
                <span>{t('nav.workshop')}</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${activeMobileMenu === 'workshop' ? 'rotate-180' : ''}`} />
              </button>
              <div className={`ml-4 space-y-1 overflow-hidden transition-all duration-200 ${activeMobileMenu === 'workshop' ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                <Link to="/job-orders" onClick={makeMenuNavHandler('/job-orders')} className="block px-3 py-2 rounded-md text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100">{t('nav.jobs')}</Link>
                <Link to="/reports" onClick={makeMenuNavHandler('/reports')} className="block px-3 py-2 rounded-md text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100">{t('nav.reports')}</Link>
                <Link to="/technicians/performance" onClick={makeMenuNavHandler('/technicians/performance')} className="block px-3 py-2 rounded-md text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100">{t('nav.techPerformance')}</Link>
                <Link to="/inventory" onClick={makeMenuNavHandler('/inventory')} className="block px-3 py-2 rounded-md text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100">{t('nav.inventory')}</Link>
              </div>
              <button
                onClick={() => openMobileMenu('sales')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-expanded={activeMobileMenu === 'sales'}
              >
                <span>{t('nav.sales')}</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${activeMobileMenu === 'sales' ? 'rotate-180' : ''}`} />
              </button>
              <div className={`ml-4 space-y-1 overflow-hidden transition-all duration-200 ${activeMobileMenu === 'sales' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                <Link to="/sales?tab=estimates" onClick={makeMenuNavHandler('/sales?tab=estimates')} className="block px-3 py-2 rounded-md text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100">Devis</Link>
                <Link to="/sales?tab=delivery-notes" onClick={makeMenuNavHandler('/sales?tab=delivery-notes')} className="block px-3 py-2 rounded-md text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100">{t('nav.deliveryNotes')}</Link>
                <Link to="/sales?tab=invoices" onClick={makeMenuNavHandler('/sales?tab=invoices')} className="block px-3 py-2 rounded-md text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100">{t('nav.invoices')}</Link>
              </div>

              <Link
                to="/customers"
                onClick={makeMenuNavHandler('/customers')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              >
                {t('nav.customers')}
              </Link>
              <Link
                to="/documents"
                onClick={makeMenuNavHandler('/documents')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              >
                {t('nav.documents')}
              </Link>
              
              
              {canAccessSettings && (
                <Link
                  to="/settings"
                  onClick={makeMenuNavHandler('/settings')}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                >
                  {t('nav.settings')}
                </Link>
              )}
              <Link
                to="/profile"
                onClick={makeMenuNavHandler('/profile')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              >
                {t('userProfile.header.myProfile')}
              </Link>
              
              
              
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="px-3">
                  <span className="text-sm text-gray-700 font-medium">{userName}</span>
                </div>
                <div className="px-3 mt-2">
                  <button
                    onClick={logout}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={logoutLabel}
                  >
                    {logoutLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <DataSyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    </nav>
  );
};

export default TopNavigation;
