import React from 'react'
import { DocumentTemplate, DocumentItem } from './documents/DocumentTemplate'

interface BonDeSortieRecipient {
  name: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
}

interface BonDeSortieVehicle {
  make: string
  model: string
  year: number
  vin: string
  registration: string
}

interface BonDeSortieTask {
  description: string
  hours?: number
  mechanic?: string
}

interface PrintableBonDeSortieProps {
  referenceNumber: string
  date: string
  recipient: BonDeSortieRecipient
  vehicle: BonDeSortieVehicle
  jobNumber: string
  jobDescription: string
  exitMileage?: number
  notes?: string
  tasks?: BonDeSortieTask[]
}

export const PrintableBonDeSortie: React.FC<PrintableBonDeSortieProps> = ({
  referenceNumber,
  date,
  recipient,
  vehicle,
  jobNumber,
  jobDescription,
  exitMileage,
  notes,
  tasks
}) => {
  const items: DocumentItem[] =
    tasks && tasks.length > 0
      ? tasks.map(task => ({
          description: task.mechanic
            ? `${task.description} (Mécanicien: ${task.mechanic})`
            : task.description,
          quantity: typeof task.hours === 'number' && !Number.isNaN(task.hours) ? task.hours : 1,
          unitPrice: 0,
          total: 0
        }))
      : [
          {
            description: 'Restitution du véhicule',
            quantity: 1,
            unitPrice: 0,
            total: 0
          }
        ]

  const extraLines: string[] = []

  if (jobNumber) {
    extraLines.push(`Ordre de réparation: ${jobNumber}`)
  }

  if (jobDescription) {
    extraLines.push(`Travaux effectués (résumé): ${jobDescription}`)
  }

  if (tasks && tasks.length > 0) {
    extraLines.push('Détail des interventions:')
    tasks.forEach((task, index) => {
      const parts = []
      parts.push(`${index + 1}. ${task.description}`)
      if (typeof task.hours === 'number' && !Number.isNaN(task.hours)) {
        parts.push(`Durée: ${task.hours} h`)
      }
      if (task.mechanic) {
        parts.push(`Mécanicien: ${task.mechanic}`)
      }
      extraLines.push(parts.join(' | '))
    })
  }

  if (typeof exitMileage === 'number' && !Number.isNaN(exitMileage)) {
    extraLines.push(`Kilométrage à la sortie: ${exitMileage} km`)
  }

  if (notes && notes.trim()) {
    extraLines.push(`Observations: ${notes.trim()}`)
  }

  extraLines.push('Le client reconnaît avoir récupéré son véhicule et avoir été informé des travaux réalisés.')

  const fullNotes = extraLines.join('\n')

  return (
    <DocumentTemplate
      title="Bon de Sortie"
      referenceNumber={referenceNumber}
      date={date}
      recipientInfo={recipient}
      items={items}
      totals={{
        subtotal: 0,
        total: 0
      }}
      paymentTerms="Ce document atteste la sortie du véhicule du garage."
      notes={`Véhicule: ${vehicle.make} ${vehicle.model} (${vehicle.year})\nVIN: ${vehicle.vin}\nImmatriculation: ${vehicle.registration}\n\n${fullNotes}`}
      showSignatures={true}
    />
  )
}

export default PrintableBonDeSortie
