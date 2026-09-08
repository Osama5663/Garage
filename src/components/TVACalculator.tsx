import React from 'react'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { computeLineHT, computeLineTVA, computeTotals, roundCurrency, TVALine } from '../utils/tva'

export const TVACalculator: React.FC = () => {
  const invoices = useEstimateInvoiceStore((s) => s.invoices)
  const [lines, setLines] = React.useState<TVALine[]>([{
    description: 'Exemple pièce', unitPriceHT: 100, quantity: 1, rate: 0.20
  }])
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState('')

  const addLine = () => setLines((prev) => ([...prev, { description: '', unitPriceHT: 0, quantity: 1, rate: 0.20 }]))
  const updateLine = (idx: number, patch: Partial<TVALine>) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx))

  const totals = computeTotals(lines)

  const invoiceValidation = React.useMemo(() => {
    if (!selectedInvoiceId) return null
    const inv = invoices.find(i => i.id === selectedInvoiceId)
    if (!inv) return null
    const invLines: TVALine[] = (inv.items || []).map((it: any) => ({
      description: it.description,
      unitPriceHT: Number(it.unitPrice || 0),
      quantity: Number(it.quantity || 0),
      rate: typeof it.taxRate === 'number' ? it.taxRate : 0.20,
    }))
    const invTotals = computeTotals(invLines)
    const matchHT = Math.abs(roundCurrency(invTotals.sousTotalHT) - roundCurrency(inv.subtotal || 0)) < 0.01
    const matchTVA = Math.abs(roundCurrency(invTotals.tvaTotal) - roundCurrency(inv.vatAmount || 0)) < 0.01
    const matchTTC = Math.abs(roundCurrency(invTotals.totalTTC) - roundCurrency(inv.totalAmount || 0)) < 0.01
    return { inv, invTotals, matchHT, matchTVA, matchTTC }
  }, [selectedInvoiceId, invoices])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white border border-blue-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 rounded-t-xl">
          <h2 className="text-lg font-semibold text-blue-900">TVA — Calculateur dédié</h2>
          <p className="text-sm text-blue-700">Section indépendante pour calculer et valider les montants de TVA</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-gray-900">Lignes HT</h3>
            <button onClick={addLine} className="px-3 py-2 text-xs rounded-md bg-indigo-600 hover:bg-indigo-700 text-white">Ajouter une ligne</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-2 px-3">Description</th>
                  <th className="text-right py-2 px-3">Prix unitaire HT</th>
                  <th className="text-right py-2 px-3">Quantité</th>
                  <th className="text-right py-2 px-3">Taux TVA</th>
                  <th className="text-right py-2 px-3">Total HT</th>
                  <th className="text-right py-2 px-3">TVA</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const lineHT = computeLineHT(l.unitPriceHT, l.quantity)
                  const lineTVA = computeLineTVA(lineHT, l.rate)
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <input value={l.description} onChange={(e) => updateLine(idx, { description: e.target.value })} className="w-full px-2 py-1 border rounded" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" step="0.01" value={l.unitPriceHT} onChange={(e) => updateLine(idx, { unitPriceHT: parseFloat(e.target.value || '0') })} className="w-28 px-2 py-1 border rounded text-right" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" step="1" value={l.quantity} onChange={(e) => updateLine(idx, { quantity: parseInt(e.target.value || '0') })} className="w-20 px-2 py-1 border rounded text-right" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" step="0.01" value={l.rate} onChange={(e) => updateLine(idx, { rate: parseFloat(e.target.value || '0') })} className="w-20 px-2 py-1 border rounded text-right" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{roundCurrency(lineHT).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{roundCurrency(lineTVA).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeLine(idx)} className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white">Supprimer</button>
                      </td>
                    </tr>
                  )
                })}
                {lines.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Aucune ligne</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TVA Summary */}
          <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Résumé TVA</h4>
            <div className="space-y-1 w-full max-w-md ml-auto">
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Sous‑total HT</span>
                <span className="font-medium">{totals.sousTotalHT.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">TVA totale</span>
                <span className="font-medium">{totals.tvaTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-900">Total TTC</span>
                <span className="font-bold text-gray-900">{totals.totalTTC.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Invoice Validation */}
          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-900 mb-2">Validation par facture</h3>
            <div className="flex items-center gap-3">
              <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Sélectionner une facture…</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>
                ))}
              </select>
            </div>
            {invoiceValidation && (
              <div className="mt-3 border rounded-lg p-3 bg-white">
                <p className="text-sm">Sous‑total HT: <span className="font-medium">{invoiceValidation.invTotals.sousTotalHT.toFixed(2)}</span> {invoiceValidation.matchHT ? '✅' : '❌'}</p>
                <p className="text-sm">TVA: <span className="font-medium">{invoiceValidation.invTotals.tvaTotal.toFixed(2)}</span> {invoiceValidation.matchTVA ? '✅' : '❌'}</p>
                <p className="text-sm">Total TTC: <span className="font-medium">{invoiceValidation.invTotals.totalTTC.toFixed(2)}</span> {invoiceValidation.matchTTC ? '✅' : '❌'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

