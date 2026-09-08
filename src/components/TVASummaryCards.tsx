import React from 'react'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { TVASummary } from '../types/tva'
import { formatCurrency } from '../utils/formatters'

interface TVASummaryCardsProps {
  salesSummary: TVASummary
  purchasesSummary: TVASummary
  netTVA: number
}

export const TVASummaryCards: React.FC<TVASummaryCardsProps> = ({
  salesSummary,
  purchasesSummary,
  netTVA
}) => {
  const cards = [
    {
      title: 'Ventes HT',
      value: salesSummary.totalHT,
      formattedValue: formatCurrency(salesSummary.totalHT),
      color: 'blue',
      icon: TrendingUp
    },
    {
      title: 'TVA Collectée',
      value: salesSummary.totalTVA,
      formattedValue: formatCurrency(salesSummary.totalTVA),
      color: 'green',
      icon: TrendingUp
    },
    {
      title: 'Ventes TTC',
      value: salesSummary.totalTTC,
      formattedValue: formatCurrency(salesSummary.totalTTC),
      color: 'indigo',
      icon: TrendingUp
    },
    {
      title: 'Achats HT',
      value: purchasesSummary.totalHT,
      formattedValue: formatCurrency(purchasesSummary.totalHT),
      color: 'orange',
      icon: TrendingDown
    },
    {
      title: 'TVA Déductible',
      value: purchasesSummary.totalTVA,
      formattedValue: formatCurrency(purchasesSummary.totalTVA),
      color: 'purple',
      icon: TrendingDown
    },
    {
      title: 'Achats TTC',
      value: purchasesSummary.totalTTC,
      formattedValue: formatCurrency(purchasesSummary.totalTTC),
      color: 'amber',
      icon: TrendingDown
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-900',
      green: 'bg-green-50 border-green-200 text-green-900',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      orange: 'bg-orange-50 border-orange-200 text-orange-900',
      purple: 'bg-purple-50 border-purple-200 text-purple-900',
      amber: 'bg-amber-50 border-amber-200 text-amber-900'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getIconColor = (color: string) => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      indigo: 'text-indigo-600',
      orange: 'text-orange-600',
      purple: 'text-purple-600',
      amber: 'text-amber-600'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${getColorClasses(card.color)}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">{card.title}</p>
                  <p className="text-2xl font-bold">{card.formattedValue}</p>
                </div>
                <Icon className={`w-8 h-8 ${getIconColor(card.color)}`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Net TVA Card */}
      <div className={`p-6 rounded-lg border-2 ${
        netTVA >= 0 
          ? 'bg-red-50 border-red-200 text-red-900' 
          : 'bg-green-50 border-green-200 text-green-900'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-medium opacity-75">
              {netTVA >= 0 ? 'TVA à payer' : 'Crédit de TVA'}
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(Math.abs(netTVA))}
            </p>
            <p className="text-sm mt-1 opacity-75">
              {netTVA >= 0 
                ? 'Montant à verser à l\'administration fiscale'
                : 'Montant récupérable ou à reporter'
              }
            </p>
          </div>
          <AlertTriangle className={`w-10 h-10 ${
            netTVA >= 0 ? 'text-red-600' : 'text-green-600'
          }`} />
        </div>
      </div>
    </div>
  )
}
