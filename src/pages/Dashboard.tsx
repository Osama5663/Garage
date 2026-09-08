import GarageDashboard from '../components/GarageDashboard'
import { t } from '../i18n'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '../utils/formatters'

const Dashboard = () => {
  const navigate = useNavigate()
  const { invoices } = useEstimateInvoiceStore()
  const { jobOrders, deletionMeta } = useJobOrderStore()
  const [tick, setTick] = useState(0)
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return v === key ? fallback : v
  }
  useEffect(() => {
    const i = setInterval(() => setTick(v => v + 1), 30000)
    return () => clearInterval(i)
  }, [])
  const recentInvoices = useMemo(() => {
    return [...(invoices || [])]
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 3)
  }, [invoices, tick])
  const recentJobs = useMemo(() => {
    const pickDate = (j: any) => new Date(j.createdAt || j.updatedAt || j.issueDate || Date.now()).getTime()
    return [...(jobOrders || [])]
      .filter(j => !deletionMeta[j.id]?.deletedAt)
      .sort((a, b) => pickDate(b) - pickDate(a))
      .slice(0, 3)
  }, [jobOrders, deletionMeta, tick])
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('dashboard.title')}</h1>
          <p className="text-gray-600">{t('dashboard.subtitle')}</p>
        </div>

        {/* Garage Dashboard */}
        <GarageDashboard />

        {/* Recent Activity Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('dashboard.recentJobs')}</h3>
              <button onClick={() => navigate('/job-orders')} className="text-blue-600 hover:text-blue-800 text-sm">{t('nav.jobs')} – Voir tout</button>
            </div>
            <div className="space-y-3">
              {recentJobs.map((job: any) => {
                const overdue = job.status === 'overdue'
                const priority = (job.priority || '').toLowerCase()
                const badgeColor = overdue ? 'bg-red-100 text-red-800' : job.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : job.status === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                const priorityDot = priority === 'urgent' ? 'bg-red-500' : priority === 'high' ? 'bg-orange-500' : priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-300'
                const jobStatusKey = String(job.status || '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
                const jobStatusFallback = String(job.status || '').replace('_', ' ')
                const jobStatusLabel = tr(`status.${jobStatusKey}`, jobStatusFallback)
                return (
                  <button key={job.id} onClick={() => navigate(`/job-orders/${job.id}`)} className="group w-full text-left">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${priorityDot}`}></span>
                          {job.jobNumber} – {job.vehicleInfo?.make} {job.vehicleInfo?.model}
                        </p>
                        <p className="text-sm text-gray-600">{job.customerName} • {t('common.due')}: {new Date(job.deadline || job.updatedAt || job.createdAt || Date.now()).toLocaleDateString()}</p>
                        <p className="hidden group-hover:block text-xs text-gray-500">{job.description || ''}</p>
                      </div>
                      <span className={`px-2 py-1 ${badgeColor} text-xs rounded-full capitalize`}>{jobStatusLabel}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('dashboard.recentInvoices')}</h3>
              <button onClick={() => navigate('/invoices')} className="text-blue-600 hover:text-blue-800 text-sm">{t('nav.invoices')} – Voir tout</button>
            </div>
            <div className="space-y-3">
              {recentInvoices.map((inv: any) => {
                const badgeColor = inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : inv.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' : inv.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                const amount = inv.totalAmount
                const rawBadge = String(inv.paymentStatus || inv.status || '')
                const badgeFallback = rawBadge.replace('_', ' ')
                const badgeLabel = inv.paymentStatus
                  ? tr(`invoicesList.paymentStatusText.${inv.paymentStatus}`, badgeFallback)
                  : tr(`invoicesList.filters.statusOptions.${inv.status}`, badgeFallback)
                return (
                  <button key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="group w-full text-left">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">{inv.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">{inv.vehicleInfo?.make} {inv.vehicleInfo?.model} • {formatCurrency(amount || 0)}</p>
                        <p className="hidden group-hover:block text-xs text-gray-500">{t('common.due')}: {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 ${badgeColor} text-xs rounded-full capitalize`}>{badgeLabel}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
