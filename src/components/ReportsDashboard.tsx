import React, { useState, useMemo } from 'react'
import { formatCurrency, formatDate } from '../utils/formatters'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { useJobOrderStore } from '../stores/jobOrderStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { 
  DollarSign, 
  FileText, 
  Wrench, 
  Package, 
  Clock,
  Download,
  Filter,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface ReportsDashboardProps {
  onExportReport: (type: string, data: any[], dateRange: DateRange) => void
}

interface DateRange {
  startDate: string
  endDate: string
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ onExportReport }) => {
  const { invoices, getOverdueInvoices, getUnpaidInvoices } = useEstimateInvoiceStore()
  const { jobOrders } = useJobOrderStore()
  const { inventoryItems, stockMovements } = useInventoryStore()

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // Today
  })

  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'jobs' | 'inventory' | 'invoices'>('overview')

  // Filter data by date range
  const filterByDateRange = (items: any[], dateField: string) => {
    return items.filter(item => {
      const itemDate = new Date(item[dateField])
      const start = new Date(dateRange.startDate)
      const end = new Date(dateRange.endDate)
      end.setHours(23, 59, 59, 999) // Include the entire end date
      return itemDate >= start && itemDate <= end
    })
  }

  // Sales Summary
  const salesSummary = useMemo(() => {
    const filteredInvoices = filterByDateRange(invoices, 'issueDate')
    const totalSales = filteredInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
    const totalPaid = filteredInvoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0)
    const totalOutstanding = filteredInvoices.reduce((sum, invoice) => sum + invoice.remainingAmount, 0)
    const averageInvoiceValue = filteredInvoices.length > 0 ? totalSales / filteredInvoices.length : 0

    return {
      totalInvoices: filteredInvoices.length,
      totalSales,
      totalPaid,
      totalOutstanding,
      averageInvoiceValue,
      paidInvoices: filteredInvoices.filter(inv => inv.status === 'paid').length,
      unpaidInvoices: filteredInvoices.filter(inv => inv.status !== 'paid').length
    }
  }, [invoices, dateRange])

  // Jobs Summary
  const jobsSummary = useMemo(() => {
    const filteredJobs = filterByDateRange(jobOrders, 'createdAt')
    const completedJobs = filteredJobs.filter(job => job.status === 'completed')
    const overdueJobs = filteredJobs.filter(job => {
      if (job.status === 'completed' || job.status === 'cancelled') return false
      return job.deadline && new Date(job.deadline) < new Date()
    })


    return {
      totalJobs: filteredJobs.length,
      completedJobs: completedJobs.length,
      inProgressJobs: filteredJobs.filter(job => job.status === 'in-progress').length,
      pendingJobs: filteredJobs.filter(job => job.status === 'pending').length,
      overdueJobs: overdueJobs.length,
      // Prices hidden for repair jobs
      completionRate: filteredJobs.length > 0 ? (completedJobs.length / filteredJobs.length) * 100 : 0
    }
  }, [jobOrders, dateRange])

  // Inventory Summary
  const inventorySummary = useMemo(() => {
    const filteredMovements = filterByDateRange(stockMovements, 'movementDate')
    
    const totalItems = inventoryItems.length
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.reorderPoint).length
    const outOfStockItems = inventoryItems.filter(item => item.quantity === 0).length
    
    const stockIn = filteredMovements
      .filter(movement => movement.type === 'in' || movement.type === 'purchase')
      .reduce((sum, movement) => sum + (movement.quantity * movement.unitCost || 0), 0)
    
    const stockOut = filteredMovements
      .filter(movement => movement.type === 'out' || movement.type === 'sale')
      .reduce((sum, movement) => sum + (movement.quantity * movement.unitCost || 0), 0)

    const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      stockIn,
      stockOut,
      totalInventoryValue,
      totalMovements: filteredMovements.length
    }
  }, [inventoryItems, stockMovements, dateRange])

  // Invoice Aging Analysis
  const invoiceAging = useMemo(() => {
    const overdueInvoices = getOverdueInvoices()
    const unpaidInvoices = getUnpaidInvoices()
    
    const now = new Date()
    const agingBuckets = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '91+': 0
    }

    unpaidInvoices.forEach(invoice => {
      const dueDate = new Date(invoice.dueDate)
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysOverdue <= 0) {
        agingBuckets['0-30'] += invoice.remainingAmount
      } else if (daysOverdue <= 30) {
        agingBuckets['0-30'] += invoice.remainingAmount
      } else if (daysOverdue <= 60) {
        agingBuckets['31-60'] += invoice.remainingAmount
      } else if (daysOverdue <= 90) {
        agingBuckets['61-90'] += invoice.remainingAmount
      } else {
        agingBuckets['91+'] += invoice.remainingAmount
      }
    })

    return {
      overdueInvoices: overdueInvoices.length,
      totalOverdue: overdueInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
      unpaidInvoices: unpaidInvoices.length,
      totalUnpaid: unpaidInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
      agingBuckets
    }
  }, [getOverdueInvoices, getUnpaidInvoices])

  

  const handleExport = (type: string) => {
    let data: any[] = []
    let reportData: any[] = []

    switch (type) {
      case 'sales':
        reportData = filterByDateRange(invoices, 'issueDate')
        data = reportData.map(invoice => ({
          'Numéro de facture': invoice.invoiceNumber,
          'Client': invoice.customerName,
          'Date d\'émission': formatDate(invoice.issueDate),
          'Date d\'échéance': formatDate(invoice.dueDate),
          'Montant total': formatCurrency(invoice.totalAmount),
          'Montant payé': formatCurrency(invoice.paidAmount),
          'Montant restant': formatCurrency(invoice.remainingAmount),
          'Statut': invoice.status,
          'Statut de paiement': invoice.paymentStatus
        }))
        break
      case 'jobs':
        reportData = filterByDateRange(jobOrders, 'createdAt')
        data = reportData.map(job => ({
          'Numéro de tâche': job.jobNumber,
          'Client': job.customerName,
          'Véhicule': `${job.vehicleMake} ${job.vehicleModel}`,
          'Statut': job.status,
          'Date de début': formatDate(job.startDate),
          'Date limite': job.deadline ? formatDate(job.deadline) : 'N/A',
          'Date de fin': job.completionDate ? formatDate(job.completionDate) : 'N/A',
          'Créé le': formatDate(job.createdAt)
        }))
        break
      case 'inventory':
        reportData = filterByDateRange(stockMovements, 'movementDate')
        data = reportData.map(movement => {
          const item = inventoryItems.find(i => i.id === movement.inventoryItemId)
          return {
            'Nom de l\'article': item?.name || movement.itemName,
            'SKU': item?.sku || 'N/A',
            'Type': movement.type,
            'Quantité': movement.quantity,
            'Coût unitaire': formatCurrency(movement.unitCost || 0),
            'Valeur totale': formatCurrency((movement.quantity * (movement.unitCost || 0))),
            'Référence': movement.reference || 'N/A',
            'Date': formatDate(movement.movementDate),
            'Notes': movement.notes || 'N/A'
          }
        })
        break
      case 'invoices':
        reportData = filterByDateRange(invoices, 'issueDate')
        data = reportData.map(invoice => ({
          'Numéro de facture': invoice.invoiceNumber,
          'Client': invoice.customerName,
          'Date d\'émission': formatDate(invoice.issueDate),
          'Date d\'échéance': formatDate(invoice.dueDate),
          'Jours de retard': Math.max(0, Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))),
          'Montant total': formatCurrency(invoice.totalAmount),
          'Montant payé': formatCurrency(invoice.paidAmount),
          'Montant restant': formatCurrency(invoice.remainingAmount),
          'Statut': invoice.status,
          'Statut de paiement': invoice.paymentStatus
        }))
        break
    }

    onExportReport(type, data, dateRange)
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rapports et Analyses</h1>
              <p className="mt-2 text-gray-600">
                Aperçus commerciaux et indicateurs de performance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-gray-500">au</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Aperçu', icon: BarChart3 },
                { id: 'sales', label: 'Résumé des ventes', icon: DollarSign },
                { id: 'jobs', label: 'Tâches & Travaux', icon: Wrench },
                { id: 'inventory', label: 'Inventaire', icon: Package },
                { id: 'invoices', label: 'Factures', icon: FileText }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className={`
                      h-5 w-5 mr-2
                      ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Ventes totales"
                value={formatCurrency(salesSummary.totalSales)}
                subtitle={`${salesSummary.totalInvoices} factures`}
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="Travaux terminés"
                value={jobsSummary.completedJobs}
                subtitle={`${jobsSummary.completionRate.toFixed(1)}% taux d'achèvement`}
                icon={CheckCircle}
                color="blue"
              />
              <StatCard
                title="Factures en retard"
                value={invoiceAging.overdueInvoices}
                subtitle={formatCurrency(invoiceAging.totalOverdue)}
                icon={AlertTriangle}
                color="red"
              />
              <StatCard
                title="Valeur d'inventaire"
                value={formatCurrency(inventorySummary.totalInventoryValue)}
                subtitle={`${inventorySummary.totalItems} articles`}
                icon={Package}
                color="purple"
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Rapports rapides</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <button
                  onClick={() => handleExport('sales')}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter Ventes
                </button>
                <button
                  onClick={() => handleExport('jobs')}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter Travaux
                </button>
                <button
                  onClick={() => handleExport('inventory')}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter Inventaire
                </button>
                <button
                  onClick={() => handleExport('invoices')}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter Factures
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  className="inline-flex items-center justify-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Voir détails
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Résumé des ventes</h3>
                <button
                  onClick={() => handleExport('sales')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                  title="Ventes totales"
                  value={formatCurrency(salesSummary.totalSales)}
                  subtitle={`${salesSummary.totalInvoices} factures`}
                  icon={DollarSign}
                  color="green"
                />
                <StatCard
                  title="Montant payé"
                  value={formatCurrency(salesSummary.totalPaid)}
                  subtitle={`${salesSummary.paidInvoices} factures payées`}
                  icon={CheckCircle}
                  color="blue"
                />
                <StatCard
                  title="Impayé / Restant dû"
                  value={formatCurrency(salesSummary.totalOutstanding)}
                  subtitle={`${salesSummary.unpaidInvoices} factures impayées`}
                  icon={Clock}
                  color="yellow"
                />
              </div>

              <div className="border-t pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Détail des factures</h4>
                <div className="space-y-3">
                  {filterByDateRange(invoices, 'issueDate').slice(0, 10).map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">{invoice.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                        <p className="text-sm text-gray-600">{formatDate(invoice.issueDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Résumé des Tâches & Travaux</h3>
                <button
                  onClick={() => handleExport('jobs')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total des travaux"
                  value={jobsSummary.totalJobs}
                  subtitle="Créés sur la période"
                  icon={FileText}
                  color="blue"
                />
                <StatCard
                  title="Terminés"
                  value={jobsSummary.completedJobs}
                  subtitle={`${jobsSummary.completionRate.toFixed(1)}% taux d'achèvement`}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="En cours"
                  value={jobsSummary.inProgressJobs}
                  subtitle="Actuellement actifs"
                  icon={Clock}
                  color="yellow"
                />
                <StatCard
                  title="En retard"
                  value={jobsSummary.overdueJobs}
                  subtitle="Échéance dépassée"
                  icon={AlertTriangle}
                  color="red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Progression des travaux</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Taux d'achèvement</span>
                      <span className="font-medium text-gray-900">{jobsSummary.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Travaux actifs</span>
                      <span className="font-medium text-gray-900">{jobsSummary.inProgressJobs}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Travaux récents</h4>
                  <div className="space-y-3">
                    {filterByDateRange(jobOrders, 'createdAt').slice(0, 5).map(job => (
                      <div key={job.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{job.jobNumber}</p>
                          <p className="text-sm text-gray-600">{job.customerName}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Mouvements de stock</h3>
                <button
                  onClick={() => handleExport('inventory')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total des articles"
                  value={inventorySummary.totalItems}
                  subtitle="En stock"
                  icon={Package}
                  color="blue"
                />
                <StatCard
                  title="Stock faible"
                  value={inventorySummary.lowStockItems}
                  subtitle="Sous le seuil de réapprovisionnement"
                  icon={AlertTriangle}
                  color="yellow"
                />
                <StatCard
                  title="Rupture de stock"
                  value={inventorySummary.outOfStockItems}
                  subtitle="À commander"
                  icon={XCircle}
                  color="red"
                />
                <StatCard
                  title="Valeur totale"
                  value={formatCurrency(inventorySummary.totalInventoryValue)}
                  subtitle="Inventaire actuel"
                  icon={DollarSign}
                  color="green"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Résumé des mouvements de stock</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">Entrées (Achats)</span>
                      <span className="font-medium text-green-900">{formatCurrency(inventorySummary.stockIn)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-700">Sorties (Ventes)</span>
                      <span className="font-medium text-red-900">{formatCurrency(inventorySummary.stockOut)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-gray-700">Mouvement net</span>
                      <span className="font-medium text-blue-900">
                        {formatCurrency(inventorySummary.stockIn - inventorySummary.stockOut)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Mouvements récents</h4>
                  <div className="space-y-3">
                    {filterByDateRange(stockMovements, 'movementDate').slice(0, 5).map(movement => {
                      const item = inventoryItems.find(i => i.id === movement.inventoryItemId)
                      return (
                        <div key={movement.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{item?.name || movement.itemName}</p>
                            <p className="text-sm text-gray-600">
                              {movement.type === 'in' || movement.type === 'purchase'
                                ? 'Entrée'
                                : movement.type === 'out' || movement.type === 'sale'
                                  ? 'Sortie'
                                  : movement.type}
                              {movement.reference && ` • BL: ${movement.reference}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{movement.quantity > 0 ? '+' : ''}{movement.quantity}</p>
                            <p className="text-sm text-gray-600">{formatDate(movement.movementDate)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Analyse chronologique des factures</h3>
                <button
                  onClick={() => handleExport('invoices')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Factures en retard"
                  value={invoiceAging.overdueInvoices}
                  subtitle={formatCurrency(invoiceAging.totalOverdue)}
                  icon={AlertTriangle}
                  color="red"
                />
                <StatCard
                  title="Total impayé"
                  value={invoiceAging.unpaidInvoices}
                  subtitle={formatCurrency(invoiceAging.totalUnpaid)}
                  icon={Clock}
                  color="yellow"
                />
                <StatCard
                  title="0-30 Jours"
                  value={formatCurrency(invoiceAging.agingBuckets['0-30'])}
                  subtitle="Courant & récent"
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="91+ Jours"
                  value={formatCurrency(invoiceAging.agingBuckets['91+'])}
                  subtitle="Très en retard"
                  icon={XCircle}
                  color="red"
                />
              </div>

              <div className="border-t pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Tranches d'âge</h4>
                <div className="space-y-3">
                  {Object.entries(invoiceAging.agingBuckets).map(([bucket, amount]) => (
                    <div key={bucket} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">{bucket} Jours</span>
                      <span className="font-medium text-gray-900">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
