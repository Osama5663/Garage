import React, { useState } from 'react'
import { ReportsDashboard } from '../components/ReportsDashboard'
import { exportToCSV, exportToPDF, generateFilename } from '../utils/reportExportUtils'
import { FileText, Download } from 'lucide-react'

const Reports: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState('')

  const handleExportReport = (type: string, data: any[], dateRange: { startDate: string; endDate: string }) => {
    setIsExporting(true)
    setExportMessage('Préparation de l\'exportation...')

    try {
      const baseFilename = generateFilename(type, dateRange)
      
      // Show export options
      const exportType = window.confirm('Exporter en PDF ? (Cliquez sur OK pour PDF, Annuler pour CSV)')
      
      if (exportType) {
        // Export as PDF
        const reportTitle = `Rapport ${type.charAt(0).toUpperCase() + type.slice(1)}`
        exportToPDF(data, reportTitle, dateRange)
        setExportMessage(`Rapport PDF exporté avec succès !`)
      } else {
        // Export as CSV
        exportToCSV(data, baseFilename)
        setExportMessage(`Rapport CSV exporté avec succès !`)
      }
      
      setTimeout(() => {
        setExportMessage('')
        setIsExporting(false)
      }, 3000)
      
    } catch (error) {
      console.error('Export error:', error)
      setExportMessage('Erreur lors de l\'exportation du rapport. Veuillez réessayer.')
      setIsExporting(false)
      
      setTimeout(() => {
        setExportMessage('')
      }, 5000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Rapports et Analyses</h1>
                  <p className="text-sm text-gray-500">Aperçus commerciaux et indicateurs de performance</p>
                </div>
              </div>
              {exportMessage && (
                <div className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                  exportMessage.includes('Error') 
                    ? 'bg-red-100 text-red-800 border border-red-200' 
                    : 'bg-green-100 text-green-800 border border-green-200'
                }`}>
                  <Download className="h-4 w-4 mr-2" />
                  {exportMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ReportsDashboard onExportReport={handleExportReport} />

      {/* Dedicated TVA Section removed per request */}
      
      {/* Export Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">{exportMessage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
