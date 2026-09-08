import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useDeliveryNoteStore } from '../stores/deliveryNoteStore'
import { Search, Filter, FileText, DollarSign, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react'

type Filters = {
  orderNumber: string
  client: string
  status: 'all' | 'complete' | 'missing' | 'overdue' | 'unpaid'
  date: 'all' | 'today' | 'week' | 'month'
}

export const SalesDocumentsOverview: React.FC = () => {
  const navigate = useNavigate()
  const { invoices } = useEstimateInvoiceStore()
  const { deliveryNotes } = useDeliveryNoteStore()
  const [filters, setFilters] = useState<Filters>({ orderNumber: '', client: '', status: 'all', date: 'all' })

  const groups = useMemo(() => {
    const map: Record<string, {
      customerId: string
      customerName: string
      ordersByKey: Record<string, {
        orderKey: string
        orderNumber: string
        bls: typeof deliveryNotes
        invoices: typeof invoices
      }>
    }> = {}

    // Group by customer, unify orders by invoice id when available
    deliveryNotes.forEach(bl => {
      const custKey = bl.customerId
      if (!map[custKey]) map[custKey] = { customerId: bl.customerId, customerName: bl.customerName, ordersByKey: {} }
      let linkedInv = bl.relatedInvoiceId ? invoices.find(i => i.id === bl.relatedInvoiceId) : undefined
      if (!linkedInv && bl.relatedInvoiceId) {
        linkedInv = invoices.find(i => i.invoiceNumber === bl.relatedInvoiceId)
      }
      const orderKey = linkedInv ? `inv:${linkedInv.id}` : `bl:${(bl.documentNumber || bl.blNumber || '')}`
      const orderNumber = linkedInv ? linkedInv.invoiceNumber : (bl.documentNumber || bl.blNumber || '')
      const ordersByKey = map[custKey].ordersByKey
      if (!ordersByKey[orderKey]) {
        ordersByKey[orderKey] = { orderKey, orderNumber, bls: [], invoices: [] }
      }
      ordersByKey[orderKey].bls.push(bl)
      if (linkedInv && !ordersByKey[orderKey].invoices.find(i => i.id === linkedInv!.id)) {
        ordersByKey[orderKey].invoices.push(linkedInv)
      }
    })

    // Include invoices (ensuring same key as above)
    invoices.forEach(inv => {
      const custKey = inv.customerId
      if (!map[custKey]) map[custKey] = { customerId: inv.customerId, customerName: inv.customerName, ordersByKey: {} }
      const orderKey = `inv:${inv.id}`
      const ordersByKey = map[custKey].ordersByKey
      if (!ordersByKey[orderKey]) {
        ordersByKey[orderKey] = { orderKey, orderNumber: inv.invoiceNumber, bls: [], invoices: [] }
      }
      if (!ordersByKey[orderKey].invoices.find(i => i.id === inv.id)) {
        ordersByKey[orderKey].invoices.push(inv)
      }
    })

    // Apply filters
    const now = new Date()
    const inRange = (dateStr?: string) => {
      if (!dateStr || filters.date === 'all') return true
      const d = new Date(dateStr)
      if (filters.date === 'today') return d.toDateString() === now.toDateString()
      if (filters.date === 'week') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      if (filters.date === 'month') return d >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return true
    }

    const result = Object.values(map).map(group => ({
      customerId: group.customerId,
      customerName: group.customerName,
      orders: Object.values(group.ordersByKey).filter(o => {
        const matchesOrder = filters.orderNumber === '' || (o.orderNumber || '').toLowerCase().includes(filters.orderNumber.toLowerCase())
        const matchesClient = filters.client === '' || group.customerName.toLowerCase().includes(filters.client.toLowerCase())
        const overdue = o.invoices.some(inv => inv.paymentStatus !== 'paid' && new Date(inv.dueDate) < now)
        const unpaid = o.invoices.some(inv => inv.paymentStatus !== 'paid')
        const missing = o.bls.some(bl => !bl.relatedInvoiceId)
        const complete = o.bls.length > 0 && o.invoices.length > 0 && !unpaid
        const matchesStatus = filters.status === 'all'
          || (filters.status === 'overdue' && overdue)
          || (filters.status === 'unpaid' && unpaid)
          || (filters.status === 'missing' && missing)
          || (filters.status === 'complete' && complete)
        const matchesDate =
          (o.bls.some(bl => inRange(bl.issueDate)) || o.invoices.some(inv => inRange(inv.issueDate)))
        return matchesOrder && matchesClient && matchesStatus && matchesDate
      })
    }))

    return result
  }, [deliveryNotes, invoices, filters])

  const statusBadge = (order: { bls: any[]; invoices: any[] }) => {
    const overdue = order.invoices.some((inv: any) => inv.paymentStatus !== 'paid' && new Date(inv.dueDate) < new Date())
    const unpaid = order.invoices.some((inv: any) => inv.paymentStatus !== 'paid')
    const missing = order.bls.some((bl: any) => !bl.relatedInvoiceId)
    if (overdue) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3 mr-1"/>En retard</span>
    if (missing) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><AlertTriangle className="h-3 w-3 mr-1"/>Facture manquante</span>
    if (unpaid) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><Clock className="h-3 w-3 mr-1"/>Impayé</span>
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1"/>Complet</span>
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
            <input value={filters.orderNumber} onChange={(e)=>setFilters(f=>({...f, orderNumber:e.target.value}))} className="pl-9 pr-3 py-2 border rounded-md w-full" placeholder="Numéro de commande"/>
          </div>
          <input value={filters.client} onChange={(e)=>setFilters(f=>({...f, client:e.target.value}))} className="px-3 py-2 border rounded-md w-full" placeholder="Client"/>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400"/>
            <select value={filters.status} onChange={(e)=>setFilters(f=>({...f, status:e.target.value as Filters['status']}))} className="px-3 py-2 border rounded-md w-full">
              <option value="all">Tous statuts</option>
              <option value="complete">Complet</option>
              <option value="missing">Facture manquante</option>
              <option value="unpaid">Impayé</option>
              <option value="overdue">En retard</option>
            </select>
          </div>
          <select value={filters.date} onChange={(e)=>setFilters(f=>({...f, date:e.target.value as Filters['date']}))} className="px-3 py-2 border rounded-md w-full">
            <option value="all">Toutes dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
          <button onClick={()=>setFilters({ orderNumber:'', client:'', status:'all', date:'all' })} className="px-3 py-2 border rounded-md bg-white hover:bg-gray-100">Réinitialiser</button>
        </div>
      </div>

      {/* Liste groupée */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {groups.length === 0 ? (
          <div className="p-8 text-center text-gray-600">Aucun document trouvé</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {groups.map(group => (
              <div key={group.customerId} className="p-4">
                <div className="text-lg font-semibold text-gray-900 mb-2">{group.customerName}</div>
                <div className="space-y-3">
                  {group.orders.map(order => (
                    <div key={order.orderNumber} className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-600"/>
                          <span className="font-medium">Commande: {order.orderNumber}</span>
                          {statusBadge(order)}
                        </div>
                        <div className="flex items-center gap-2">
                          {order.invoices.map(inv => (
                            <button key={inv.id} onClick={()=>navigate(`/invoices/${inv.id}`)} className="inline-flex items-center px-2 py-1 border rounded-md text-xs text-gray-700 hover:bg-gray-100">
                              <DollarSign className="h-3 w-3 mr-1"/>
                              {inv.invoiceNumber}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs uppercase text-gray-500 mb-1">Bons de livraison</div>
                          <div className="flex flex-wrap gap-2">
                            {order.bls.length === 0 ? (
                              <span className="text-sm text-gray-500">Aucun BL</span>
                            ) : order.bls.map(bl => (
                              <button key={bl.id} onClick={()=>navigate(`/delivery-notes/${bl.id}`)} className="px-2 py-1 border rounded-md text-xs text-gray-700 hover:bg-gray-100">
                                {bl.blNumber}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-gray-500 mb-1">Factures</div>
                          <div className="flex flex-wrap gap-2">
                            {order.invoices.length === 0 ? (
                              <span className="text-sm text-gray-500">Aucune facture</span>
                            ) : order.invoices.map(inv => (
                              <span key={inv.id} className={`px-2 py-1 rounded-md text-xs border ${inv.paymentStatus==='paid'?'border-green-200 text-green-700':'border-yellow-200 text-yellow-700'}`}>
                                {inv.invoiceNumber} • {inv.paymentStatus}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accès rapide PDF (via pages de détail + impression) */}
      <div className="text-xs text-gray-500 flex items-center gap-1"><ArrowRight className="h-3 w-3"/>Ouvrez une facture ou un BL pour imprimer le PDF via la page de détail.</div>
    </div>
  )
}

export default SalesDocumentsOverview
