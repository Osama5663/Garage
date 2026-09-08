import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
 
import EstimatesList from '../components/EstimatesList'
import SalesDocumentsOverview from './SalesDocumentsOverview'
import DeliveryNotesList from '../components/DeliveryNotesList'
import InvoicesList from '../components/InvoicesList'
import { t } from '../i18n'
// Removed unused store imports to satisfy build

export const SalesManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tabLoading, setTabLoading] = useState(false)
  
  // Data loading is handled inside child components for each tab

  // Removed unused quick summary/action helpers to satisfy TS build

  const activeTab = useMemo(() => {
    const v = (searchParams.get('tab') as 'estimates' | 'delivery-notes' | 'invoices' | 'folders' | null)
    if (!v) return 'estimates'
    if (v === 'estimates' || v === 'delivery-notes' || v === 'invoices' || v === 'folders') return v
    return 'estimates'
  }, [searchParams])

  useEffect(() => {
    const v = searchParams.get('tab')
    if (!v) {
      setSearchParams({ tab: 'estimates' })
    } else if (v !== 'estimates' && v !== 'delivery-notes' && v !== 'invoices' && v !== 'folders') {
      toast.error('Invalid tab parameter')
      setSearchParams({ tab: 'estimates' })
    }
  }, [searchParams])

  useEffect(() => {
    setTabLoading(true)
    const id = setTimeout(() => setTabLoading(false), 250)
    return () => clearTimeout(id)
  }, [activeTab])

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('nav.sales')}</h1>
        <div className="flex gap-2">
          <button onClick={() => { if (activeTab !== 'estimates') { setTabLoading(true); setSearchParams({ tab: 'estimates' }) } }} className={`px-3 py-2 rounded-md border ${activeTab==='estimates'?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'}`}>Devis</button>
          <button onClick={() => { if (activeTab !== 'delivery-notes') { setTabLoading(true); setSearchParams({ tab: 'delivery-notes' }) } }} className={`px-3 py-2 rounded-md border ${activeTab==='delivery-notes'?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'}`}>Bons de livraison</button>
          <button onClick={() => { if (activeTab !== 'invoices') { setTabLoading(true); setSearchParams({ tab: 'invoices' }) } }} className={`px-3 py-2 rounded-md border ${activeTab==='invoices'?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'}`}>Factures</button>
          <button onClick={() => { if (activeTab !== 'folders') { setTabLoading(true); setSearchParams({ tab: 'folders' }) } }} className={`px-3 py-2 rounded-md border ${activeTab==='folders'?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'}`}>Dossiers</button>
        </div>
      </div>

      {tabLoading && (
        <div className="h-1 w-full bg-blue-100">
          <div className="h-1 bg-blue-600 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      

      

      {/* Contenu par onglet */}
      <div className="bg-white rounded-lg shadow p-2">
        {activeTab === 'estimates' && (
          <div className="p-2"><EstimatesList /></div>
        )}
        {activeTab === 'delivery-notes' && (
          <div className="p-2"><DeliveryNotesList /></div>
        )}
        {activeTab === 'invoices' && (
          <div className="p-2"><InvoicesList /></div>
        )}
        {activeTab === 'folders' && (
          <div className="p-2"><SalesDocumentsOverview /></div>
        )}
      </div>
    </div>
  )
}

export default SalesManagement
