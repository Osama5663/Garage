import React, { useState, useEffect } from 'react'
import { useHasRole } from '../stores/authStore'
import { useTVAReportStore } from '../stores/tvaReportStore'
import { useEstimateInvoiceStore } from '../stores/estimateInvoiceStore'
import { PeriodSelector } from '../components/PeriodSelector'
import { TVASummaryCards } from '../components/TVASummaryCards'
import { TVAInvoiceTable } from '../components/TVAInvoiceTable'
import { TVAAnalytics } from '../components/TVAAnalytics'
import { AlertTriangle, FileText, RefreshCw, Bug } from 'lucide-react'

export const TVAReport: React.FC = () => {
  const { 
    report, 
    isLoading, 
    error, 
    generateReport, 
    exportToCSV, 
  } = useTVAReportStore()
  
  const estimateStoreInvoices = useEstimateInvoiceStore(state => state.invoices)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year' | 'custom'>('month')
  const [showDebug, setShowDebug] = useState(false)

  // Check if user has admin/manager role
  const hasAccess = useHasRole(['admin', 'supervisor'])

  useEffect(() => {
    if (startDate && endDate) {
      generateReport(startDate, endDate, periodType)
    }
  }, [startDate, endDate, periodType])

  const handlePeriodChange = (newStartDate: string, newEndDate: string, newPeriodType: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
    setPeriodType(newPeriodType as 'month' | 'quarter' | 'year' | 'custom')
  }

  const handleRefresh = () => {
    if (startDate && endDate) {
      generateReport(startDate, endDate, periodType)
    }
  }
  
  // Debug Simulation Helper
  const runSimulation = () => {
      console.log('--- DIAGNOSTIC SIMULATION ---')
      console.log('Selected Period:', { startDate, endDate })
      console.log('Total Store Invoices:', estimateStoreInvoices.length)
      
      const analysis = estimateStoreInvoices.map(inv => {
          const d = inv.issueDate
          const invDate = d.includes('T') ? d.split('T')[0] : d
          const inRange = invDate >= startDate && invDate <= endDate
          const validStatus = inv.status !== 'cancelled'
          return {
              id: inv.id,
              number: inv.invoiceNumber,
              date: inv.issueDate,
              parsedDate: invDate,
              status: inv.status,
              inRange,
              validStatus,
              willBeIncluded: inRange && validStatus
          }
      })
      
      console.table(analysis)
      return analysis
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Accès non autorisé
          </h2>
          <p className="text-gray-600 text-center">
            Vous n'avez pas les permissions nécessaires pour accéder au rapport TVA.
            Cette fonctionnalité est réservée aux administrateurs et gérants.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Rapport TVA
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Générez et analysez vos déclarations de TVA pour la période sélectionnée
              </p>
            </div>
            
            {report && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
                
                <button
                  onClick={() => exportToCSV('summary')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Exporter résumé
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Period Selector */}
        <div className="mb-8 flex justify-between items-end">
          <div className="flex-1">
             <PeriodSelector onPeriodChange={handlePeriodChange} />
          </div>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            title="Activer le mode diagnostic"
          >
            <Bug className="w-5 h-5" />
          </button>
        </div>

        {/* Debug Panel */}
        {showDebug && (
            <div className="mb-8 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto shadow-lg">
                <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                    <h3 className="font-bold text-sm">DIAGNOSTIC SIMULATION</h3>
                    <div className="flex gap-4">
                        <span>Start: {startDate}</span>
                        <span>End: {endDate}</span>
                        <span>Total Invoices: {estimateStoreInvoices.length}</span>
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-gray-500">
                            <th className="p-1">Number</th>
                            <th className="p-1">Date (Raw)</th>
                            <th className="p-1">Date (Parsed)</th>
                            <th className="p-1">Status</th>
                            <th className="p-1">In Range?</th>
                            <th className="p-1">Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runSimulation().map(item => (
                            <tr key={item.id} className={item.willBeIncluded ? 'text-green-400 font-bold' : 'text-gray-500'}>
                                <td className="p-1">{item.number}</td>
                                <td className="p-1">{item.date}</td>
                                <td className="p-1">{item.parsedDate}</td>
                                <td className="p-1">{item.status}</td>
                                <td className="p-1">{item.inRange ? 'YES' : 'NO'}</td>
                                <td className="p-1">{item.willBeIncluded ? 'INCLUDED' : 'EXCLUDED'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {estimateStoreInvoices.length === 0 && (
                    <p className="mt-4 text-red-400">WARNING: No invoices found in local store. Try creating a new invoice or checking if data is persisted.</p>
                )}
            </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Génération du rapport en cours...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Report Content */}
        {report && !isLoading && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Résumé TVA
              </h2>
              <TVASummaryCards
                salesSummary={report.salesSummary}
                purchasesSummary={report.purchasesSummary}
                netTVA={report.netTVA}
              />
            </div>

            {/* Invoice Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Ventes
                </h2>
                <TVAInvoiceTable
                  invoices={report.salesInvoices}
                  type="sales"
                  onExportCSV={() => exportToCSV('sales')}
                  anomalies={report.anomalies}
                  limit={10}
                  showMoreHref="/invoices"
                />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Achats
                </h2>
                <TVAInvoiceTable
                  invoices={report.purchaseInvoices}
                  type="purchases"
                  onExportCSV={() => exportToCSV('purchases')}
                  anomalies={report.anomalies}
                  limit={10}
                  showMoreHref="/inventory/manage?tab=supplier-invoices"
                />
              </div>
            </div>

            {/* Analytics */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Analyses
              </h2>
              <TVAAnalytics
                salesInvoices={report.salesInvoices}
                purchaseInvoices={report.purchaseInvoices}
                salesSummary={report.salesSummary}
                purchasesSummary={report.purchasesSummary}
              />
            </div>

            {/* Consistency Checks */}
            {report.anomalies.totalAnomalies > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-orange-600 mr-2" />
                  <h3 className="text-lg font-semibold text-orange-900">
                    Vérifications de cohérence
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-800">Taux TVA non standard</p>
                    <p className="text-2xl font-bold text-orange-900">{report.anomalies.nonStandardRates}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-800">TVA négative</p>
                    <p className="text-2xl font-bold text-orange-900">{report.anomalies.negativeTVA}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-800">TVA nulle</p>
                    <p className="text-2xl font-bold text-orange-900">{report.anomalies.zeroTVA}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-800">Ratio anormal</p>
                    <p className="text-2xl font-bold text-orange-900">{report.anomalies.unusualRatio}</p>
                  </div>
                </div>
                
                <p className="mt-4 text-sm text-orange-700">
                  Ces anomalies peuvent indiquer des erreurs de saisie ou des cas particuliers.
                  Veuillez vérifier les factures concernées avant de procéder à votre déclaration TVA.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!report && !isLoading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun rapport généré
            </h3>
            <p className="text-gray-600">
              Sélectionnez une période pour générer votre rapport TVA.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
