import React, { useEffect, useMemo, useState } from 'react'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useMechanicStore } from '../stores/mechanicStore'
import { formatCurrency } from '../utils/formatters'
import { t } from '../i18n'
import { useSystemTime } from '../stores/timeStore'

type RangeKey = 'today' | 'week' | 'month' | 'custom'

const withinRange = (dateISO: string | undefined, range: RangeKey, now: Date, start?: string, end?: string) => {
  if (!dateISO) return false
  const d = new Date(dateISO)
  if (range === 'today') return d.toDateString() === now.toDateString()
  if (range === 'week') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (range === 'month') return d >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (range === 'custom') {
    if (!start || !end) return true
    const s = new Date(start)
    const e = new Date(end)
    return d >= s && d <= e
  }
  return true
}

export const TechnicianPerformanceDashboard: React.FC = () => {
  const { jobOrders, initializeStore } = useJobOrderStore()
  const { mechanics, fetchMechanics } = useMechanicStore()
  const { now } = useSystemTime()
  const [range, setRange] = useState<RangeKey>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)

  useEffect(() => { initializeStore() }, [initializeStore])
  useEffect(() => { fetchMechanics() }, [fetchMechanics])

  const filteredJobs = useMemo(() => {
    return jobOrders.filter(j => withinRange(j.completionDate || j.updatedAt || j.createdAt, range, now, startDate, endDate))
  }, [jobOrders, range, now, startDate, endDate])

  const statsByTech = useMemo(() => {
    const map = new Map<string, {
      name: string
      completed: number
      billedHours: number
      workedHours: number
      comebacks: number
      avgEst: number
      avgActual: number
      revenue: number
    }>()
    mechanics.forEach(m => map.set(m.id, { name: m.name, completed: 0, billedHours: 0, workedHours: 0, comebacks: 0, avgEst: 0, avgActual: 0, revenue: 0 }))

    filteredJobs.forEach(job => {
      const note = (job.notes || '').toLowerCase()
      const hasComeback = note.includes('comeback') || note.includes('rework') || note.includes('return')
      const laborItems = job.laborItems || []

      laborItems.forEach(li => {
        const mechanic = mechanics.find(m => m.name === li.mechanic)
        if (!mechanic) return
        const s = map.get(mechanic.id)
        if (!s) return

        s.completed += 1

        const hours = li.hours || 0
        s.billedHours += hours
        s.workedHours += hours

        const lineRevenue = li.total || (li.hours * li.rate)
        s.revenue += lineRevenue

        s.avgEst += job.estimatedHours || hours
        s.avgActual += job.actualHours || hours

        if (hasComeback) s.comebacks += 1
      })
    })

    mechanics.forEach(m => {
      const s = map.get(m.id)
      if (!s) return
      const count = s.completed || 1
      s.avgEst = s.avgEst / count
      s.avgActual = s.avgActual / count
    })
    return map
  }, [filteredJobs, mechanics])

  const rows = useMemo(() => {
    return mechanics.map(m => {
      const s = statsByTech.get(m.id)!
      const productivity = s.workedHours > 0 ? (s.billedHours / s.workedHours) : 0
      const flagColor = productivity >= 0.9 ? 'text-green-700' : (productivity >= 0.75 ? 'text-orange-600' : 'text-red-700')
      const comebackFlag = s.comebacks >= 2 ? 'text-red-700' : s.comebacks === 1 ? 'text-orange-600' : 'text-gray-700'
      return {
        id: m.id,
        name: m.name,
        completed: s.completed,
        billedHours: s.billedHours,
        workedHours: s.workedHours,
        productivity,
        comebacks: s.comebacks,
        revenue: s.revenue,
        flagColor,
        comebackFlag
      }
    }).sort((a, b) => b.productivity - a.productivity)
  }, [mechanics, statsByTech])

  const selected = selectedTechId ? rows.find(r => r.id === selectedTechId) : null
  const selectedJobs = selectedTechId && selected
    ? filteredJobs.filter(j =>
        (j.laborItems || []).some(li => li.mechanic === selected.name)
      )
    : []

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('techPerformance.title')}</h1>
          <p className="text-gray-600">{t('techPerformance.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} className="px-3 py-2 border border-gray-300 rounded-md">
            <option value="today">{t('techPerformance.filters.range.today')}</option>
            <option value="week">{t('techPerformance.filters.range.week')}</option>
            <option value="month">{t('techPerformance.filters.range.month')}</option>
            <option value="custom">{t('techPerformance.filters.range.custom')}</option>
          </select>
          {range === 'custom' && (
            <>
              <input aria-label={t('techPerformance.filters.start')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
              <input aria-label={t('techPerformance.filters.end')} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" />
            </>
          )}
        </div>
      </div>

      {/* Cards per technician */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {rows.map(r => (
          <div key={r.id} className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition" onClick={() => setSelectedTechId(r.id)}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900">{r.name}</div>
              <div className={`text-sm ${r.flagColor}`}>{(r.productivity * 100).toFixed(0)}%</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">{t('techPerformance.cards.jobs')}</div><div className="text-gray-900 font-medium">{r.completed}</div>
              <div className="text-gray-600">{t('techPerformance.cards.billedHours')}</div><div className="text-gray-900 font-medium">{r.billedHours.toFixed(2)}</div>
              <div className="text-gray-600">{t('techPerformance.cards.workedHours')}</div><div className="text-gray-900 font-medium">{r.workedHours.toFixed(2)}</div>
              <div className="text-gray-600">{t('techPerformance.cards.comebacks')}</div><div className={`font-medium ${r.comebackFlag}`}>{r.comebacks}</div>
              <div className="text-gray-600">{t('techPerformance.cards.revenue')}</div><div className="text-gray-900 font-medium">{formatCurrency(r.revenue)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Ranking table */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('techPerformance.table.ranking')}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.table.technician')}</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.table.jobs')}</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.table.billedHours')}</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.table.workedHours')}</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.table.productivity')}</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.table.comebacks')}</th>
                <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.table.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTechId(r.id)}>
                  <td className="py-2 px-3 text-gray-900 font-medium">{r.name}</td>
                  <td className="py-2 px-3">{r.completed}</td>
                  <td className="py-2 px-3">{r.billedHours.toFixed(2)}</td>
                  <td className="py-2 px-3">{r.workedHours.toFixed(2)}</td>
                  <td className={`py-2 px-3 ${r.flagColor}`}>{(r.productivity * 100).toFixed(0)}%</td>
                  <td className={`py-2 px-3 ${r.comebackFlag}`}>{r.comebacks}</td>
                  <td className="py-2 px-3">{formatCurrency(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail view */}
      {selected && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900">{selected.name}{t('techPerformance.detail.titleSuffix')}</h2>
            <button className="px-3 py-1 border rounded-md text-sm" onClick={() => setSelectedTechId(null)}>{t('techPerformance.detail.close')}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.detail.vehicle')}</th>
                  <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.detail.job')}</th>
                  <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.detail.estHours')}</th>
                  <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.detail.actualHours')}</th>
                  <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.detail.laborAmount')}</th>
                  <th className="text-left py-2 px-3 text-sm text-gray-600">{t('techPerformance.detail.comeback')}</th>
                  <th className="text-left py-2 px-3 text-sm text-gray-600">{t('deliveryNoteDetail.table.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {selectedJobs.map(j => {
                  const laborAmt = (j.laborItems || []).filter(li => li.mechanic === selected.name).reduce((s, li) => s + (li.total || (li.hours * li.rate)), 0)
                  const comeback = (j.notes || '').toLowerCase().includes('comeback') || (j.notes || '').toLowerCase().includes('rework') || (j.notes || '').toLowerCase().includes('return')
                  const noteText = (j.notes || '')
                  const noteDisplay = noteText.length > 120 ? `${noteText.slice(0, 120)}…` : noteText
                  return (
                    <tr key={j.id} className="border-b">
                      <td className="py-2 px-3">{j.vehicleInfo.make} {j.vehicleInfo.model} • {j.vehicleInfo.year}</td>
                      <td className="py-2 px-3">{j.description || (j.jobDescriptions[0]?.title || '')}</td>
                      <td className="py-2 px-3">{(j.estimatedHours || 0).toFixed(2)}</td>
                      <td className="py-2 px-3">{(j.actualHours || 0).toFixed(2)}</td>
                      <td className="py-2 px-3">{formatCurrency(laborAmt)}</td>
                      <td className={`py-2 px-3 ${comeback ? 'text-red-700' : 'text-gray-700'}`}>{comeback ? t('techPerformance.detail.yes') : t('techPerformance.detail.no')}</td>
                      <td className="py-2 px-3 text-gray-700">{noteDisplay}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicianPerformanceDashboard
