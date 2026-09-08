import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import Dashboard from './pages/Dashboard'
import CustomerManagement from './pages/CustomerManagement'
import JobOrderList from './pages/JobOrderList'
import JobOrderForm from './components/JobOrderForm'
import JobOrderDetail from './pages/JobOrderDetail'
import JobOrderDashboardPage from './pages/JobOrderDashboardPage'
import MechanicManagementPage from './pages/MechanicManagementPage'

import EstimatesList from './components/EstimatesList'
import EstimateForm from './components/EstimateForm'
import { EstimateDetails } from './components/EstimateDetails'
import InvoicesList from './components/InvoicesList'
import InvoiceForm from './components/InvoiceForm'
import { InvoiceDetails } from './components/InvoiceDetails'
import { EnhancedInvoiceCreation } from './components/EnhancedInvoiceCreation'
import { InvoiceMonitoringDashboard } from './components/InvoiceMonitoringDashboard'
import { DeliveryNotesList } from './components/DeliveryNotesList'
import { DeliveryNote } from './components/DeliveryNote'
import { DeliveryNoteForm } from './components/DeliveryNoteForm'
import DeliveryNoteList from './components/supplier-delivery-notes/DeliveryNoteList'
import DeliveryNoteFormNew from './components/supplier-delivery-notes/DeliveryNoteForm'
import DeliveryNoteDetail from './components/supplier-delivery-notes/DeliveryNoteDetail'

import { InventoryDashboard } from './components/InventoryDashboard'
import { InventoryManagement } from './components/InventoryManagement'
import Reports from './pages/Reports'
import BLReportsPage from './pages/BLReportsPage'
import SalesManagement from './pages/SalesManagement'
import { TVAReport } from './pages/TVAReport'
import TechnicianPerformanceDashboard from './pages/TechnicianPerformanceDashboard'
import CashflowDashboard from './pages/CashflowDashboard'

// Import custom styles
import './styles/animations.css'
import SettingsManager from './components/SettingsManager'
import AuthWrapper from './components/AuthWrapper'
import ProtectedRoute from './components/ProtectedRoute'
import UserManagement from './components/UserManagement'
import UserProfile from './components/UserProfile'
import TopNavigation from './components/TopNavigation'
import DocumentAuditLog from './components/DocumentAuditLog'
import InvoicePrintPage from './pages/InvoicePrintPage'
import JobOrderPrintPage from './pages/JobOrderPrintPage'
import SNTLInvoicePage from './pages/SNTLInvoicePage'
import { useLangStore } from './stores/langStore'
import { attachCurrencyLogging } from './utils/currencyLogger'
import { RouteLogger } from './components/RouteLogger'
import { installAbortLogFilter } from './utils/abortLogFilter'
try { installAbortLogFilter() } catch {}
 
import RoleBasedAccessTest from './components/RoleBasedAccessTest'
import { useCurrentUser } from './stores/authStore'
import { useInventoryStore } from './stores/inventoryStore'
import BLFacturePage from './pages/BLFacturePage'

// Removed debug utilities: DataSyncMonitor, LocalStorageInspector, TestDataGenerator
 

// Wrapper components to handle route parameters
const EstimateDetailsWrapper = () => {
  const { id } = useParams<{ id: string }>()
  return <EstimateDetails estimateId={id || ''} />
}

const InvoiceDetailsWrapper = () => {
  const { id } = useParams<{ id: string }>()
  return <InvoiceDetails invoiceId={id || ''} />
}

const DeliveryNoteWrapper = () => {
  return <DeliveryNote />
}

const EnhancedInvoiceCreationWrapper = () => {
  const inventoryStore = useInventoryStore()
  return <EnhancedInvoiceCreation inventoryStore={inventoryStore} />
}

function App() {
  const { locale } = useLangStore()
  const currentUser = useCurrentUser()
  const fetchSuppliers = useInventoryStore((state) => state.fetchSuppliers);

  useEffect(() => {
    if (currentUser) {
      fetchSuppliers();
    }
  }, [currentUser, fetchSuppliers]);

  useEffect(() => {
    document.documentElement.lang = locale || 'fr'
    attachCurrencyLogging()
    if (import.meta.env?.DEV) installAbortLogFilter()
  }, [locale])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'garage-lang-settings') {
        // Log cross-tab updates; zustand persist will rehydrate automatically
        console.log('[currency] storage event', { key: e.key, at: new Date().toISOString() })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Debug: Check if user is logged in
  console.log('Current User:', currentUser)
  console.log('User Name:', currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'No user')

  const routerBase = import.meta.env?.DEV ? '/' : '/garage'
  const hideTopNav = window.location.pathname.includes('/print')

  return (
    <Router basename={routerBase}>
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50 pt-16">
          {hideTopNav ? null : (
          <TopNavigation 
            userRole={currentUser?.role.toUpperCase()}
            userName={`${currentUser?.firstName} ${currentUser?.lastName}`}
          />
          )}
          <RouteLogger />
      <Toaster position="top-right" />
      <main>
            <Routes>
              {/* Existing routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } />
              <Route path="/customers" element={
                <ProtectedRoute requiredPermission="read" requiredModule="customers">
                  <CustomerManagement />
                </ProtectedRoute>
              } />
              <Route path="/job-orders" element={
                <ProtectedRoute requiredPermission="read" requiredModule="job-orders">
                  <JobOrderList />
                </ProtectedRoute>
              } />
              <Route path="/job-orders/new" element={
                <ProtectedRoute requiredPermission="create" requiredModule="job-orders">
                  <JobOrderForm />
                </ProtectedRoute>
              } />
              <Route path="/job-orders/:id" element={
                <ProtectedRoute requiredPermission="read" requiredModule="job-orders">
                  <JobOrderDetail />
                </ProtectedRoute>
              } />
              <Route path="/job-orders/dashboard" element={
                <ProtectedRoute requiredPermission="read" requiredModule="job-orders">
                  <JobOrderDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/estimates" element={
                <ProtectedRoute requiredPermission="read" requiredModule="estimates">
                  <EstimatesList />
                </ProtectedRoute>
              } />
              <Route path="/estimates/new" element={
                <ProtectedRoute requiredPermission="create" requiredModule="estimates">
                  <EstimateForm />
                </ProtectedRoute>
              } />
              <Route path="/estimates/edit/:id" element={
                <ProtectedRoute requiredPermission="update" requiredModule="estimates">
                  <EstimateForm />
                </ProtectedRoute>
              } />
              <Route path="/estimates/:id" element={
                <ProtectedRoute requiredPermission="read" requiredModule="estimates">
                  <EstimateDetailsWrapper />
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <InvoicesList />
                </ProtectedRoute>
              } />
              <Route path="/invoices/new" element={
                <ProtectedRoute requiredPermission="create" requiredModule="invoices">
                  <InvoiceForm />
                </ProtectedRoute>
              } />
              <Route path="/invoices/edit/:id" element={
                <ProtectedRoute requiredPermission="update" requiredModule="invoices">
                  <InvoiceForm />
                </ProtectedRoute>
              } />
              <Route path="/invoices/enhanced-create" element={
                <ProtectedRoute requiredPermission="create" requiredModule="invoices">
                  <EnhancedInvoiceCreationWrapper />
                </ProtectedRoute>
              } />
              <Route path="/invoices/monitoring" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <InvoiceMonitoringDashboard />
                </ProtectedRoute>
              } />
              <Route path="/invoices/:id" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <InvoiceDetailsWrapper />
                </ProtectedRoute>
              } />
              <Route path="/delivery-notes" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <DeliveryNotesList />
                </ProtectedRoute>
              } />
              <Route path="/delivery-notes/new" element={
                <ProtectedRoute requiredPermission="create" requiredModule="invoices">
                  <DeliveryNoteForm />
                </ProtectedRoute>
              } />
              <Route path="/delivery-notes/:id" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <DeliveryNoteWrapper />
                </ProtectedRoute>
              } />
              <Route path="/inventory" element={
                <ProtectedRoute requiredPermission="read" requiredModule="inventory">
                  <InventoryDashboard />
                </ProtectedRoute>
              } />
              <Route path="/inventory/manage" element={
                <ProtectedRoute requiredPermission="update" requiredModule="inventory">
                  <InventoryManagement currentUserRole="admin" currentUserId="current_user" />
                </ProtectedRoute>
              } />
              <Route path="/documents" element={
                <ProtectedRoute requiredPermission="read" requiredModule="documents">
                  <DocumentAuditLog />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute requiredPermission="read" requiredModule="reports">
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/cashflow" element={
                <ProtectedRoute requiredRole={["admin","supervisor"]}>
                  <CashflowDashboard />
                </ProtectedRoute>
              } />
              <Route path="/tva-report" element={
                <ProtectedRoute requiredRole="admin">
                  <TVAReport />
                </ProtectedRoute>
              } />
              <Route path="/sales" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <SalesManagement />
                </ProtectedRoute>
              } />
              <Route path="/sales/sntl-invoice/new" element={
                <ProtectedRoute requiredPermission="create" requiredModule="invoices">
                  <SNTLInvoicePage />
                </ProtectedRoute>
              } />
              <Route path="/sales/sntl-invoice/:id" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <SNTLInvoicePage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute requiredRole="admin">
                  <SettingsManager />
                </ProtectedRoute>
              } />
              <Route path="/settings/mechanics" element={
                <ProtectedRoute requiredRole="admin">
                  <MechanicManagementPage />
                </ProtectedRoute>
              } />
              
              <Route path="/users" element={
                <ProtectedRoute requiredRole="admin">
                  <UserManagement />
                </ProtectedRoute>
              } />
              {/* Technician Performance (manager/admin only) */}
              <Route path="/technicians/performance" element={
                <ProtectedRoute requiredRole={["admin","supervisor"]}>
                  <TechnicianPerformanceDashboard />
                </ProtectedRoute>
              } />
              
              
              
              {/* Role-based access test */}
              <Route path="/role-test" element={
                <ProtectedRoute>
                  <RoleBasedAccessTest />
                </ProtectedRoute>
              } />
              
              {/* BL Facture Management */}
              <Route path="/bl-facture" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <BLFacturePage />
                </ProtectedRoute>
              } />
              
              {/* BL Reports */}
              <Route path="/reports/bl-summary" element={
                <ProtectedRoute requiredPermission="read" requiredModule="reports">
                  <BLReportsPage />
                </ProtectedRoute>
              } />
              
              {/* Supplier Delivery Notes */}
              <Route path="/supplier-delivery-notes" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <DeliveryNoteList />
                </ProtectedRoute>
              } />
              <Route path="/supplier-delivery-notes/new" element={
                <ProtectedRoute requiredPermission="create" requiredModule="invoices">
                  <DeliveryNoteFormNew />
                </ProtectedRoute>
              } />
              <Route path="/supplier-delivery-notes/:id" element={
                <ProtectedRoute requiredPermission="read" requiredModule="invoices">
                  <DeliveryNoteDetail />
                </ProtectedRoute>
              } />
              <Route path="/supplier-delivery-notes/:id/edit" element={
                <ProtectedRoute requiredPermission="update" requiredModule="invoices">
                  <DeliveryNoteFormNew />
                </ProtectedRoute>
              } />
              
              {/* Print routes */}
              <Route path="/print/invoice/:id" element={<InvoicePrintPage />} />
              <Route path="/print/job-order/:id" element={<JobOrderPrintPage />} />
              
              
            </Routes>
      </main>
        </div>
        {/* Debug utilities removed */}
      </AuthWrapper>
    </Router>
  )
}

export default App
