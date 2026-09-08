import React from 'react'
import { DocumentTemplate, DocumentItem } from './documents/DocumentTemplate'

interface ClientDetails {
  name: string
  phone: string
  address: string
  clientId: string
}

interface VehicleInfo {
  make: string
  model: string
  year: number
  vin: string
  licensePlate: string
}

interface PartItem {
  partNumber: string
  description: string
  quantity: number
}

interface LaborItem {
  description: string
  hours: number
  rate: number
  total: number
}

interface BillOfLadingData {
  blNumber: string
  issueDate: string
  dueDate: string
  client: ClientDetails
  vehicle: VehicleInfo
  parts: PartItem[]
  labor: LaborItem[]
}

interface PrintableBillOfLadingProps {
  data: BillOfLadingData
  companyInfo?: {
    name: string
    address: string
    phone: string
    email: string
  }
}

export const PrintableBillOfLading: React.FC<PrintableBillOfLadingProps> = ({
  data,
  companyInfo
}) => {
  // Combine parts and labor into generic items
  const items: DocumentItem[] = [
    ...data.parts.map(part => ({
      code: part.partNumber,
      description: part.description,
      quantity: part.quantity,
      unitPrice: 0,
      total: 0
    })),
    ...data.labor.map(labor => ({
      description: labor.description,
      quantity: labor.hours,
      unitPrice: labor.rate,
      total: labor.total
    }))
  ]

  const totalLabor = data.labor.reduce((sum, item) => sum + item.total, 0)

  return (
    <DocumentTemplate
      title="Bon de Livraison"
      referenceNumber={data.blNumber}
      date={data.issueDate}
      companyInfo={companyInfo}
      recipientInfo={{
        name: data.client.name,
        address: data.client.address,
        phone: data.client.phone
      }}
      items={items}
      totals={{
        subtotal: totalLabor,
        total: totalLabor
      }}
      notes={`Véhicule: ${data.vehicle.make} ${data.vehicle.model} (${data.vehicle.year})\nVIN: ${data.vehicle.vin}\nImmatriculation: ${data.vehicle.licensePlate}`}
      paymentTerms="Marchandises reçues en bon état et conformes à la commande."
    />
  )
}

export default PrintableBillOfLading
