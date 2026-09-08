import React, { useEffect, useMemo, useState } from 'react'
import { useCashflowStore, CashflowMovement } from '../stores/cashflowStore'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useCustomerStore } from '../stores/customerStore'
import { formatCurrency, formatDate } from '../utils/formatters'
// i18n reserved for future localization
import { AlertCircle, CheckCircle, ExternalLink, RefreshCcw, Plus, Minus, Upload, FileSpreadsheet, X, Save, Edit2, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

type RangeKey = 'today' | 'week' | 'month' | 'custom'

const withinRange = (dateISO?: string, range?: RangeKey, start?: string, end?: string) => {
  if (!dateISO) return false
  const d = new Date(dateISO)
  const now = new Date()
  switch (range) {
    case 'today': return d.toDateString() === now.toDateString()
    case 'week': return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'month': return d >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case 'custom': {
      if (!start || !end) return true
      const s = new Date(start); const e = new Date(end)
      return d >= s && d <= e
    }
    default: return true
  }
}

export const CashflowDashboard: React.FC = () => {
  const navigate = useNavigate()
  const cashflow = useCashflowStore()
  const sales = useEstimateInvoiceStore()
  const inventory = useInventoryStore()
  const [range, setRange] = useState<RangeKey>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const customers = useCustomerStore((state) => state.customers)

  const vehicles = useMemo(() => {
    return customers.flatMap(customer =>
      customer.vehicles.map(vehicle => ({
        id: vehicle.id,
        label: `${vehicle.registration} • ${vehicle.model}`.trim()
      }))
    )
  }, [customers])

  const vehicleById = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles])

  // Add Transaction Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<'inflow' | 'outflow'>('inflow')
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    paymentMethod: 'cash',
    category: 'other',
    vehicleId: ''
  })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CashflowMovement | null>(null)
  const [editTransaction, setEditTransaction] = useState({
    date: '',
    amount: '',
    description: '',
    paymentMethod: 'cash',
    category: 'other',
    vehicleId: ''
  })

  // Reconciliation Modal State
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false)
  const [bankTransactions, setBankTransactions] = useState<any[]>([])
  const [reconciliationMatches, setReconciliationMatches] = useState<any[]>([])

  useEffect(() => { cashflow.aggregateFromStores() }, [sales.invoices, inventory.supplierInvoices])

  const filtered = useMemo(() => cashflow.movements.filter(m => withinRange(m.date, range, startDate, endDate)), [cashflow.movements, range, startDate, endDate])
  const inflows = filtered.filter(m => m.type === 'inflow')
  const outflows = filtered.filter(m => m.type === 'outflow')

  const totals = useMemo(() => ({
    in: inflows.reduce((s, m) => s + m.amount, 0),
    out: outflows.reduce((s, m) => s + m.amount, 0)
  }), [inflows, outflows])

  const vehicleSpend = useMemo(() => {
    const sums = new Map<string, number>()
    for (const m of outflows) {
      const label = m.vehicleLabel || 'Non affecté'
      sums.set(label, (sums.get(label) || 0) + m.amount)
    }
    return Array.from(sums.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [outflows])

  const openLinked = (mId?: string, _mNumber?: string, source?: 'sales' | 'supplier' | 'expense' | 'manual') => {
    if (!mId) return
    if (source === 'sales') navigate(`/invoices/${mId}`)
    else if (source === 'supplier') navigate(`/inventory/manage?tab=supplier-invoices&inv=${mId}`)
  }

  const handleAddTransaction = () => {
    if (!newTransaction.amount || !newTransaction.description) {
      alert('Veuillez remplir le montant et la description')
      return
    }

    const selectedVehicle = newTransaction.vehicleId ? vehicleById.get(newTransaction.vehicleId) : undefined

    const movement: CashflowMovement = {
      id: `manual_${Date.now()}`,
      type: transactionType,
      date: newTransaction.date,
      partyName: 'Manuel / Divers',
      amount: parseFloat(newTransaction.amount),
      currency: 'MAD',
      paymentMethod: newTransaction.paymentMethod as any,
      source: 'manual',
      reconciled: false,
      reference: newTransaction.description,
      category: newTransaction.category,
      vehicleId: selectedVehicle?.id,
      vehicleLabel: selectedVehicle?.label
    }

    cashflow.addMovement(movement)
    setIsAddModalOpen(false)
    setNewTransaction({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      paymentMethod: 'cash',
      category: 'other',
      vehicleId: ''
    })
  }

  const openEdit = (m: CashflowMovement) => {
    setEditTarget(m)
    setEditTransaction({
      date: m.date ? m.date.split('T')[0] : new Date().toISOString().split('T')[0],
      amount: String(m.amount ?? ''),
      description: m.reference || '',
      paymentMethod: m.paymentMethod || 'cash',
      category: m.category || 'other',
      vehicleId: m.vehicleId || ''
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateTransaction = () => {
    if (!editTarget) return
    if (!editTransaction.amount || !editTransaction.description) {
      alert('Veuillez remplir le montant et la description')
      return
    }

    const selectedVehicle = editTransaction.vehicleId ? vehicleById.get(editTransaction.vehicleId) : undefined

    cashflow.updateMovement(editTarget.id, {
      date: editTransaction.date,
      amount: parseFloat(editTransaction.amount),
      paymentMethod: editTransaction.paymentMethod as any,
      reference: editTransaction.description,
      category: editTransaction.category,
      vehicleId: selectedVehicle?.id,
      vehicleLabel: selectedVehicle?.label
    })

    setIsEditModalOpen(false)
    setEditTarget(null)
  }

  const handleDeleteTransaction = (m: CashflowMovement) => {
    if (window.confirm('Supprimer cette transaction ?')) {
      cashflow.deleteMovement(m.id)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
      
      // Assume simple format: [Date, Description, Amount] or similar
      // We'll try to detect columns or just take first 3 columns
      // For robustness, let's look for rows with date and amount
      const transactions: any[] = []
      
      // Skip header row if present (simple heuristic)
      const startRow = 1 
      
      for (let i = startRow; i < data.length; i++) {
        const row: any = data[i]
        if (!row || row.length < 2) continue

        // Try to parse date
        let date = row[0]
        if (typeof date === 'number') {
            // Excel date serial number
            const d = new Date((date - (25567 + 2)) * 86400 * 1000)
            date = d.toISOString().split('T')[0]
        } else if (date instanceof Date) {
             date = date.toISOString().split('T')[0]
        }
        
        // Try to find amount
        // Look for numbers in other columns
        let amount = 0
        let description = ''
        
        for (let j = 1; j < row.length; j++) {
            const cell = row[j]
            if (typeof cell === 'number') {
                amount = cell
            } else if (typeof cell === 'string') {
                description += cell + ' '
            }
        }
        
        if (amount !== 0) {
            transactions.push({
                date,
                description: description.trim(),
                amount: Math.abs(amount),
                type: amount > 0 ? 'inflow' : 'outflow', // Assumption: positive in Excel is inflow
                originalRow: row
            })
        }
      }
      
      setBankTransactions(transactions)
      performReconciliation(transactions)
    }
    reader.readAsBinaryString(file)
  }

  const performReconciliation = (bankTxns: any[]) => {
    // Simple matching logic
    const matches: any[] = []
    
    // Get all unreconciled movements
    const candidates = cashflow.movements.filter(m => !m.reconciled)

    bankTxns.forEach(btn => {
        // Try to find a match in candidates
        // Criteria: Same Amount AND Date within 3 days
        const bDate = new Date(btn.date)
        
        const match = candidates.find(c => {
            const cDate = new Date(c.date)
            const diffTime = Math.abs(cDate.getTime() - bDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            return Math.abs(c.amount - btn.amount) < 0.01 && 
                   c.type === btn.type && 
                   diffDays <= 3
        })

        if (match) {
            matches.push({
                bank: btn,
                system: match,
                status: 'matched'
            })
        } else {
             matches.push({
                bank: btn,
                system: null,
                status: 'unmatched'
            })
        }
    })
    
    setReconciliationMatches(matches)
  }

  const confirmReconciliation = () => {
    // Mark matched system transactions as reconciled
    reconciliationMatches.forEach(m => {
        if (m.status === 'matched' && m.system) {
            cashflow.setReconciled(m.system.id, true)
        }
    })
    setIsReconcileModalOpen(false)
    alert('Rapprochement effectué avec succès !')
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trésorerie</h1>
          <p className="text-gray-600">Suivi des entrées et sorties liées aux factures et dépenses</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setTransactionType('inflow'); setIsAddModalOpen(true) }}
            className="px-3 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" /> Entrée (Caisse)
          </button>
          <button 
            onClick={() => { setTransactionType('outflow'); setIsAddModalOpen(true) }}
            className="px-3 py-2 bg-red-600 text-white rounded-md flex items-center gap-2 hover:bg-red-700"
          >
            <Minus className="w-4 h-4" /> Sortie (Dépense)
          </button>
          <button 
            onClick={() => setIsReconcileModalOpen(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700"
          >
            <FileSpreadsheet className="w-4 h-4" /> Rapprochement Bancaire
          </button>
        </div>
      </div>
      
      {/* Date Filter Bar */}
      <div className="flex items-center justify-end gap-3 bg-white p-3 rounded-lg shadow-sm">
          <select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} className="px-3 py-2 border rounded-md">
            <option value="today">Aujourd’hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois‑ci</option>
            <option value="custom">Personnalisé</option>
          </select>
          {range === 'custom' && (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-md" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-md" />
            </>
          )}
          <button onClick={() => cashflow.aggregateFromStores()} className="px-3 py-2 border rounded-md flex items-center gap-2 hover:bg-gray-50"><RefreshCcw className="w-4 h-4" /> Rafraîchir</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-sm text-gray-600">Total Entrées</div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(totals.in)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-sm text-gray-600">Total Sorties</div>
          <div className="text-2xl font-bold text-red-700">{formatCurrency(totals.out)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-sm text-gray-600">Solde Net</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totals.in - totals.out)}</div>
        </div>
      </div>

      {vehicleSpend.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">Dépenses par véhicule</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {vehicleSpend.map(item => (
              <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded border border-gray-100">
                <div className="text-sm text-gray-700 truncate" title={item.label}>{item.label}</div>
                <div className="text-sm font-semibold text-red-600">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inflows */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-green-800 flex items-center gap-2"><Plus className="w-5 h-5" /> Entrées</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-2 px-3 text-sm text-gray-600">Date</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Partie</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Véhicule</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Référence</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Méthode</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Montant</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Source</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Rapproché</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inflows.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">{formatDate(m.date)}</td>
                  <td className="py-2 px-3 font-medium">{m.partyName}</td>
                  <td className="py-2 px-3 text-sm text-gray-500">{m.vehicleLabel || '—'}</td>
                  <td className="py-2 px-3 text-sm text-gray-500">{m.reference || m.linkedInvoiceNumber || '—'}</td>
                  <td className="py-2 px-3">{m.paymentMethod || '—'}</td>
                  <td className="py-2 px-3 font-bold text-green-600">{formatCurrency(m.amount)}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${m.source === 'manual' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {m.source === 'sales' ? 'Vente' : m.source === 'manual' ? 'Manuel' : m.source}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <button onClick={() => useCashflowStore.getState().setReconciled(m.id, !m.reconciled)} className={`px-2 py-1 rounded text-xs transition-colors ${m.reconciled ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {m.reconciled ? 'Oui' : 'Non'}
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openLinked(m.linkedInvoiceId, m.linkedInvoiceNumber, m.source)} className="text-blue-600 hover:text-blue-800" title="Voir détails">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      {m.source === 'manual' && (
                        <>
                          <button onClick={() => openEdit(m)} className="text-gray-600 hover:text-gray-900" title="Modifier">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteTransaction(m)} className="text-red-600 hover:text-red-800" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {inflows.length === 0 && (
                <tr><td colSpan={9} className="py-4 text-center text-gray-500">Aucune entrée sur cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outflows */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-red-800 flex items-center gap-2"><Minus className="w-5 h-5" /> Sorties</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-2 px-3 text-sm text-gray-600">Date</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Partie</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Véhicule</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Référence</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Méthode</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Montant</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Source</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Rapproché</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outflows.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">{formatDate(m.date)}</td>
                  <td className="py-2 px-3 font-medium">{m.partyName}</td>
                  <td className="py-2 px-3 text-sm text-gray-500">{m.vehicleLabel || '—'}</td>
                  <td className="py-2 px-3 text-sm text-gray-500">{m.reference || m.linkedInvoiceNumber || '—'}</td>
                  <td className="py-2 px-3">{m.paymentMethod || '—'}</td>
                  <td className="py-2 px-3 font-bold text-red-600">{formatCurrency(m.amount)}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${m.source === 'manual' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {m.source === 'supplier' ? 'Fournisseur' : m.source === 'manual' ? 'Manuel' : m.source === 'expense' ? 'Dépense' : m.source}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <button onClick={() => useCashflowStore.getState().setReconciled(m.id, !m.reconciled)} className={`px-2 py-1 rounded text-xs transition-colors ${m.reconciled ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {m.reconciled ? 'Oui' : 'Non'}
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openLinked(m.linkedInvoiceId, m.linkedInvoiceNumber, m.source)} className="text-blue-600 hover:text-blue-800" title="Voir détails">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      {m.source === 'manual' && (
                        <>
                          <button onClick={() => openEdit(m)} className="text-gray-600 hover:text-gray-900" title="Modifier">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteTransaction(m)} className="text-red-600 hover:text-red-800" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {outflows.length === 0 && (
                <tr><td colSpan={9} className="py-4 text-center text-gray-500">Aucune sortie sur cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {transactionType === 'inflow' ? 'Ajouter une Entrée (Caisse)' : 'Ajouter une Sortie (Dépense)'}
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (MAD)</label>
                  <input
                    type="number"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description / Motif</label>
                  <input
                    type="text"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Dépôt espèces, Achat fournitures..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Véhicule</label>
                  <select
                    value={newTransaction.vehicleId}
                    onChange={(e) => setNewTransaction({ ...newTransaction, vehicleId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucun véhicule</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
                {transactionType === 'outflow' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <input
                      type="text"
                      value={newTransaction.category}
                      onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: fournitures, loyer..."
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Méthode de paiement</label>
                  <select
                    value={newTransaction.paymentMethod}
                    onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Espèces</option>
                    <option value="card">Carte Bancaire</option>
                    <option value="bank_transfer">Virement</option>
                    <option value="check">Chèque</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddTransaction}
                  className={`px-4 py-2 text-white rounded-lg ${transactionType === 'inflow' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Modifier la transaction</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editTransaction.date}
                    onChange={(e) => setEditTransaction({ ...editTransaction, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (MAD)</label>
                  <input
                    type="number"
                    value={editTransaction.amount}
                    onChange={(e) => setEditTransaction({ ...editTransaction, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description / Motif</label>
                  <input
                    type="text"
                    value={editTransaction.description}
                    onChange={(e) => setEditTransaction({ ...editTransaction, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Dépôt espèces, Achat fournitures..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Véhicule</label>
                  <select
                    value={editTransaction.vehicleId}
                    onChange={(e) => setEditTransaction({ ...editTransaction, vehicleId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucun véhicule</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Méthode de paiement</label>
                  <select
                    value={editTransaction.paymentMethod}
                    onChange={(e) => setEditTransaction({ ...editTransaction, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Espèces</option>
                    <option value="card">Carte Bancaire</option>
                    <option value="bank_transfer">Virement</option>
                    <option value="check">Chèque</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateTransaction}
                  className="px-4 py-2 text-white rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {isReconcileModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                Rapprochement Bancaire
              </h3>
              <button onClick={() => setIsReconcileModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {!bankTransactions.length ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Téléchargez votre relevé bancaire (Excel)</p>
                  <label className="inline-block">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                      Choisir un fichier
                    </span>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Formats acceptés : .xlsx, .xls</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Résultat du rapprochement automatique</h4>
                    <p className="text-sm text-blue-800">
                      Nous avons comparé votre relevé avec les transactions du système. 
                      Veuillez vérifier les correspondances et valider le rapprochement.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-3 text-left text-sm font-semibold text-gray-700" colSpan={3}>Transaction Banque (Excel)</th>
                          <th className="p-3 text-center text-sm font-semibold text-gray-700 w-10">Status</th>
                          <th className="p-3 text-left text-sm font-semibold text-gray-700" colSpan={3}>Transaction Système (Garage)</th>
                        </tr>
                        <tr className="bg-gray-50 border-b">
                          <th className="p-2 text-xs text-gray-500">Date</th>
                          <th className="p-2 text-xs text-gray-500">Libellé</th>
                          <th className="p-2 text-xs text-gray-500">Montant</th>
                          <th className="p-2"></th>
                          <th className="p-2 text-xs text-gray-500">Date</th>
                          <th className="p-2 text-xs text-gray-500">Partie / Réf</th>
                          <th className="p-2 text-xs text-gray-500">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reconciliationMatches.map((match, idx) => (
                          <tr key={idx} className={match.status === 'matched' ? 'bg-green-50' : ''}>
                            {/* Bank Side */}
                            <td className="p-2 text-sm">{match.bank.date}</td>
                            <td className="p-2 text-sm">{match.bank.description}</td>
                            <td className={`p-2 text-sm font-medium ${match.bank.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(match.bank.amount)}
                            </td>

                            {/* Status Icon */}
                            <td className="p-2 text-center">
                              {match.status === 'matched' ? (
                                <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-orange-400 mx-auto" />
                              )}
                            </td>

                            {/* System Side */}
                            {match.status === 'matched' ? (
                              <>
                                <td className="p-2 text-sm">{formatDate(match.system.date)}</td>
                                <td className="p-2 text-sm">
                                  {match.system.partyName}
                                  <div className="text-xs text-gray-500">{match.system.reference || match.system.linkedInvoiceNumber}</div>
                                </td>
                                <td className="p-2 text-sm">{formatCurrency(match.system.amount)}</td>
                              </>
                            ) : (
                              <td colSpan={3} className="p-2 text-sm text-gray-400 italic text-center">
                                Aucune correspondance trouvée
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setIsReconcileModalOpen(false); setBankTransactions([]); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white"
              >
                Fermer
              </button>
              {bankTransactions.length > 0 && (
                <button
                  onClick={confirmReconciliation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Valider le rapprochement
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashflowDashboard
