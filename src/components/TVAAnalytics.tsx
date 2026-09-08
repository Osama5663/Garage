import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface TVAAnalyticsProps {
  salesInvoices: any[]
  purchaseInvoices: any[]
  salesSummary: any
  purchasesSummary: any
}

export const TVAAnalytics: React.FC<TVAAnalyticsProps> = ({
  salesInvoices,
  purchaseInvoices,
  salesSummary,
  purchasesSummary
}) => {
  // Calculate gross margin
  const grossMargin = salesSummary.totalHT - purchasesSummary.totalHT
  const grossMarginPercentage = salesSummary.totalHT > 0 
    ? (grossMargin / salesSummary.totalHT) * 100 
    : 0

  // Generate insights
  const insights = []
  
  if (grossMargin > 0) {
    insights.push(`Marge brute positive de ${formatCurrency(grossMargin)} (${grossMarginPercentage.toFixed(1)}% du chiffre d'affaires)`)
  } else {
    insights.push(`Attention: marge brute négative de ${formatCurrency(Math.abs(grossMargin))}`)
  }

  if (salesSummary.totalHT > purchasesSummary.totalHT * 2) {
    insights.push(`Fort chiffre d'affaires par rapport aux achats (ratio de ${(salesSummary.totalHT / purchasesSummary.totalHT).toFixed(1)})`)
  }

  if (purchasesSummary.totalHT > salesSummary.totalHT) {
    insights.push(`Les achats dépassent les ventes: revoir la stratégie d'approvisionnement`)
  }

  // Generate chart data
  const generateMonthlyData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    
    // Mock monthly data - in real app, this would be calculated from actual invoice dates
    const salesData = Array.from({ length: months.length }, (_, index) => {
      const baseAmount = salesSummary.totalHT / 12
      const seasonalVariation = Math.sin((index / 12) * 2 * Math.PI) * baseAmount * 0.2
      return Math.max(0, baseAmount + seasonalVariation + (Math.random() - 0.5) * baseAmount * 0.1)
    })

    const purchaseData = Array.from({ length: months.length }, (_, index) => {
      const baseAmount = purchasesSummary.totalHT / 12
      const seasonalVariation = Math.cos((index / 12) * 2 * Math.PI) * baseAmount * 0.15
      return Math.max(0, baseAmount + seasonalVariation + (Math.random() - 0.5) * baseAmount * 0.08)
    })

    return { months, salesData, purchaseData }
  }

  const { months, salesData, purchaseData } = generateMonthlyData()

  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'Ventes HT',
        data: salesData,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Achats HT',
        data: purchaseData,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Évolution des ventes et achats HT sur l\'année'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value)
          }
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Marge brute</p>
              <p className={`text-2xl font-bold ${
                grossMargin >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(grossMargin)}
              </p>
              <p className="text-sm text-gray-500">
                {grossMarginPercentage.toFixed(1)}% du CA
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              grossMargin >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {grossMargin >= 0 ? (
                <TrendingUp className={`w-6 h-6 ${
                  grossMargin >= 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              ) : (
                <TrendingDown className={`w-6 h-6 ${
                  grossMargin >= 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ratio TVA</p>
              <p className="text-2xl font-bold text-gray-900">
                {((salesSummary.totalTVA - purchasesSummary.totalTVA) / salesSummary.totalHT * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">
                TVA nette / Ventes HT
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total des factures</p>
              <p className="text-2xl font-bold text-gray-900">
                {salesInvoices.length + purchaseInvoices.length}
              </p>
              <p className="text-sm text-gray-500">
                {salesInvoices.length} ventes, {purchaseInvoices.length} achats
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <AlertCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Évolution mensuelle
        </h3>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Analyses et insights
        </h3>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">{insight}</p>
            </div>
          ))}
          
          {insights.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Aucune analyse particulière pour cette période.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
