import React, { useState, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

interface PeriodSelectorProps {
  onPeriodChange: (startDate: string, endDate: string, periodType: string) => void
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ onPeriodChange }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const periods = [
    { value: 'current-month', label: 'Mois en cours', type: 'month' },
    { value: 'previous-month', label: 'Mois précédent', type: 'month' },
    { value: 'current-quarter', label: 'Trimestre en cours', type: 'quarter' },
    { value: 'previous-quarter', label: 'Trimestre précédent', type: 'quarter' },
    { value: 'current-year', label: 'Année en cours', type: 'year' },
    { value: 'previous-year', label: 'Année précédente', type: 'year' },
    { value: 'custom', label: 'Période personnalisée', type: 'custom' }
  ]

  const getDateRange = (periodValue: string) => {
    const today = new Date()
    let startDate = ''
    let endDate = ''

    switch (periodValue) {
      case 'current-month': {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      }
      case 'previous-month': {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0]
        endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0]
        break
      }
      case 'current-quarter': {
        const currentQuarter = Math.floor(today.getMonth() / 3)
        startDate = new Date(today.getFullYear(), currentQuarter * 3, 1).toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      }
      case 'previous-quarter': {
        const previousQuarter = Math.floor(today.getMonth() / 3) - 1
        const previousQuarterYear = previousQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear()
        const previousQuarterMonth = previousQuarter < 0 ? previousQuarter + 12 : previousQuarter
        startDate = new Date(previousQuarterYear, previousQuarterMonth * 3, 1).toISOString().split('T')[0]
        endDate = new Date(previousQuarterYear, (previousQuarterMonth + 1) * 3, 0).toISOString().split('T')[0]
        break
      }
      case 'current-year': {
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      }
      case 'previous-year': {
        startDate = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0]
        endDate = new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
        break
      }
    }

    return { startDate, endDate }
  }

  useEffect(() => {
    if (selectedPeriod !== 'custom') {
      const { startDate, endDate } = getDateRange(selectedPeriod)
      const periodType = periods.find(p => p.value === selectedPeriod)?.type || 'month'
      onPeriodChange(startDate, endDate, periodType)
    }
  }, [selectedPeriod])

  useEffect(() => {
    if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
      onPeriodChange(customStartDate, customEndDate, 'custom')
    }
  }, [customStartDate, customEndDate])

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    setShowCustom(value === 'custom')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          Période de rapport
        </h3>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        {showCustom && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium">Période sélectionnée :</p>
          {selectedPeriod === 'custom' && customStartDate && customEndDate ? (
            <p>Du {customStartDate} au {customEndDate}</p>
          ) : selectedPeriod !== 'custom' ? (
            <p>Du {getDateRange(selectedPeriod).startDate} au {getDateRange(selectedPeriod).endDate}</p>
          ) : (
            <p>Veuillez sélectionner une période personnalisée</p>
          )}
        </div>
      </div>
    </div>
  )
}
