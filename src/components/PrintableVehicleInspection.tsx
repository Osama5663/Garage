import React from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { VehicleInspection } from '../types/jobOrder'
import { PrintStyles } from './PrintStyles'

interface PrintableRecipient {
  name: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
}

interface PrintableVehicle {
  make: string
  model: string
  year: number
  vin: string
  registration: string
}

interface PrintableVehicleInspectionProps {
  referenceNumber: string
  date: string
  recipient: PrintableRecipient
  vehicle: PrintableVehicle
  jobNumber: string
  inspection: VehicleInspection
}

const statusLabel = (s: VehicleInspection['sections'][number]['items'][number]['status']) => {
  if (s === 'ok') return 'OK'
  if (s === 'monitor') return 'À surveiller'
  if (s === 'action') return 'À réparer'
  return '—'
}

export const PrintableVehicleInspection: React.FC<PrintableVehicleInspectionProps> = ({
  referenceNumber,
  date,
  recipient,
  vehicle,
  jobNumber,
  inspection
}) => {
  const { workshop } = useSettingsStore()
  const company: any = workshop || {}
  const companyName = company?.name || 'Nom de l\'entreprise'
  const companyLogo = company?.logo || company?.logoUrl
  const companyAddress = company?.address
  const companyPhone = company?.phone
  const companyEmail = company?.email

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto print-container">
      <PrintStyles isVisible={true} />
      <div className="flex justify-between items-start mb-8 border-b pb-6 print-header">
        <div className="flex items-center">
          {companyLogo && (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-20 w-auto object-contain mr-6"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
            <div className="text-sm text-gray-600 mt-2 whitespace-pre-line max-w-xs">
              {companyAddress}
            </div>
            <div className="text-sm text-gray-600 mt-2 space-y-0.5">
              {companyPhone && <div>Tél: {companyPhone}</div>}
              {companyEmail && <div>Email: {companyEmail}</div>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-blue-800 uppercase tracking-wide">Contrôle véhicule</h2>
          <div className="mt-6 space-y-1">
            <div className="flex justify-end gap-2">
              <span className="text-gray-600">Référence:</span>
              <span className="font-bold text-gray-900">{referenceNumber}</span>
            </div>
            <div className="flex justify-end gap-2">
              <span className="text-gray-600">Date:</span>
              <span className="font-bold text-gray-900">{new Date(date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 flex justify-end">
        <div className="w-1/2 bg-gray-50 rounded-lg p-6 border border-gray-200 print-section">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-300 pb-2">Destinataire</h3>
          <div className="text-lg font-bold text-gray-900 mb-1">{recipient.name}</div>
          {recipient.address && <div className="text-gray-700 whitespace-pre-line text-sm mb-3">{recipient.address}</div>}
          <div className="space-y-1 text-sm text-gray-600">
            {recipient.phone && <div>Tél: {recipient.phone}</div>}
            {recipient.email && <div>Email: {recipient.email}</div>}
            {recipient.taxId && <div>ID Fiscal: {recipient.taxId}</div>}
          </div>
        </div>
      </div>

      <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
          <div><span className="text-gray-600">Ordre:</span> <span className="font-semibold">{jobNumber}</span></div>
          <div><span className="text-gray-600">Véhicule:</span> <span className="font-semibold">{vehicle.make} {vehicle.model} ({vehicle.year})</span></div>
          <div><span className="text-gray-600">Immatriculation:</span> <span className="font-semibold">{vehicle.registration}</span></div>
          <div><span className="text-gray-600">VIN:</span> <span className="font-semibold">{vehicle.vin}</span></div>
          {typeof inspection.mileage === 'number' && <div><span className="text-gray-600">Kilométrage:</span> <span className="font-semibold">{inspection.mileage} km</span></div>}
          {inspection.inspectorName && <div><span className="text-gray-600">Contrôle par:</span> <span className="font-semibold">{inspection.inspectorName}</span></div>}
        </div>
      </div>

      <div className="mb-8 overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full print-table">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs tracking-wider">Section</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs tracking-wider">Élément</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs tracking-wider w-40">Statut</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs tracking-wider">Commentaire</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs tracking-wider">Preuve</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {inspection.sections.flatMap(section =>
              section.items.map(item => (
                <tr key={`${section.id}_${item.id}`}>
                  <td className="py-3 px-4 text-gray-700">{section.label}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{item.label}</td>
                  <td className="py-3 px-4 text-gray-700">{statusLabel(item.status)}</td>
                  <td className="py-3 px-4 text-gray-700">{item.comment || '—'}</td>
                  <td className="py-3 px-4 text-gray-700">
                    {item.evidenceImages?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {item.evidenceImages.slice(0, 2).map((img) => (
                          <img
                            key={img.id}
                            src={img.url}
                            alt={img.filename}
                            className="h-10 w-10 object-cover border border-gray-200 rounded"
                          />
                        ))}
                        {item.evidenceImages.length > 2 && (
                          <span className="text-xs text-gray-600">+{item.evidenceImages.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {inspection.globalRemarks && (
        <div className="mb-12 border-t border-gray-200 pt-6">
          <h4 className="font-bold text-gray-900 mb-2 text-sm uppercase">Remarques</h4>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{inspection.globalRemarks}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-12 mt-12 pt-8 print-section page-break-inside-avoid">
        <div className="text-center">
          <div className="text-xs font-bold text-gray-500 uppercase mb-16">Pour {companyName}</div>
          <div className="border-t border-gray-300 mx-8 pt-2 text-xs text-gray-400">Signature & Cachet</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-gray-500 uppercase mb-16">Pour {recipient.name}</div>
          <div className="border-t border-gray-300 mx-8 pt-2 text-xs text-gray-400">Signature</div>
        </div>
      </div>
    </div>
  )
}

export default PrintableVehicleInspection
