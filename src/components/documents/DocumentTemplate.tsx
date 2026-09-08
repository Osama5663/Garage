import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PrintStyles } from '../PrintStyles';

export interface DocumentItem {
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DocumentTemplateProps {
  title: string;
  referenceNumber: string;
  date: string | Date;
  companyInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    taxId?: string;
    logo?: string;
    logoUrl?: string;
    ice?: string;
    ifNumber?: string;
    patent?: string;
    rib?: string;
  };
  recipientInfo: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    taxId?: string;
  };
  items: DocumentItem[];
  totals: {
    subtotal: number;
    tax?: number;
    taxLabel?: string;
    total: number;
  };
  paymentTerms?: string;
  notes?: string;
  showSignatures?: boolean;
}

export const DocumentTemplate: React.FC<DocumentTemplateProps> = ({
  title,
  referenceNumber,
  date,
  companyInfo,
  recipientInfo,
  items,
  totals,
  paymentTerms,
  notes,
  showSignatures = true
}) => {
  const { workshop } = useSettingsStore();
  const company: any = companyInfo || workshop || {}
  const companyName = company?.name || 'Nom de l\'entreprise'
  const companyAddress = company?.address
  const companyPhone = company?.phone
  const companyEmail = company?.email
  const companyWebsite = company?.website
  const companyTaxId = company?.taxId
  const companyLogo = company?.logo || company?.logoUrl

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto print-container">
      <PrintStyles isVisible={true} />
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b pb-6 print-header">
        <div className="flex items-center">
          {companyLogo && (
            <img 
              src={companyLogo} 
              alt={companyName} 
              className="h-24 w-auto object-contain mr-6"
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
              {companyWebsite && <div>Web: {companyWebsite}</div>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-blue-800 uppercase tracking-wide">{title}</h2>
          <div className="mt-6 space-y-1">
            <div className="flex justify-end gap-2">
              <span className="text-gray-600">Référence:</span>
              <span className="font-bold text-gray-900">{referenceNumber}</span>
            </div>
            <div className="flex justify-end gap-2">
              <span className="text-gray-600">Date:</span>
              <span className="font-bold text-gray-900">{formatDate(typeof date === 'string' ? date : date.toISOString())}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient Info */}
      <div className="mb-8 flex justify-end">
        <div className="w-1/2 bg-gray-50 rounded-lg p-6 border border-gray-200 print-section">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-300 pb-2">Destinataire</h3>
          <div className="text-lg font-bold text-gray-900 mb-1">{recipientInfo.name}</div>
          {recipientInfo.address && <div className="text-gray-700 whitespace-pre-line text-sm mb-3">{recipientInfo.address}</div>}
          <div className="space-y-1 text-sm text-gray-600">
            {recipientInfo.phone && <div>Tél: {recipientInfo.phone}</div>}
            {recipientInfo.email && <div>Email: {recipientInfo.email}</div>}
            {recipientInfo.taxId && <div>ID Fiscal: {recipientInfo.taxId}</div>}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8 overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full print-table">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="py-3 px-4 text-left font-semibold text-gray-700 uppercase text-xs tracking-wider">Description</th>
              <th className="py-3 px-4 text-right font-semibold text-gray-700 uppercase text-xs tracking-wider w-24">Qté</th>
              <th className="py-3 px-4 text-right font-semibold text-gray-700 uppercase text-xs tracking-wider w-32">Prix Unit.</th>
              <th className="py-3 px-4 text-right font-semibold text-gray-700 uppercase text-xs tracking-wider w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500 italic">
                  Aucun article
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{item.description}</div>
                    {item.code && <div className="text-xs text-gray-500 mt-0.5">{item.code}</div>}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-72 space-y-3 print-totals">
          <div className="flex justify-between text-gray-600 border-b border-gray-100 pb-2">
            <span className="font-medium">Sous-total</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.tax !== undefined && (
            <div className="flex justify-between text-gray-600 border-b border-gray-100 pb-2">
              <span className="font-medium">{totals.taxLabel || 'TVA (20%)'}</span>
              <span>{formatCurrency(totals.tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 bg-gray-50 p-3 rounded border border-gray-200">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer / Terms */}
      <div className="grid grid-cols-2 gap-8 mb-12 border-t border-gray-200 pt-6">
        {paymentTerms && (
          <div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm uppercase">Conditions de paiement</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{paymentTerms}</p>
          </div>
        )}
        {notes && (
          <div>
            <h4 className="font-bold text-gray-900 mb-2 text-sm uppercase">Notes</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{notes}</p>
          </div>
        )}
      </div>

      {/* Signatures */}
      {showSignatures && (
        <div className="grid grid-cols-2 gap-12 mt-12 pt-8 print-section page-break-inside-avoid">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-500 uppercase mb-16">Pour {companyName}</div>
            <div className="border-t border-gray-300 mx-8 pt-2 text-xs text-gray-400">Signature & Cachet</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-gray-500 uppercase mb-16">Pour {recipientInfo.name}</div>
            <div className="border-t border-gray-300 mx-8 pt-2 text-xs text-gray-400">Signature & Cachet</div>
          </div>
        </div>
      )}

      {/* Legal Footer */}
      <div className="mt-16 pt-6 border-t border-gray-200 text-center text-xs text-gray-500 print-footer">
        <p className="font-medium text-gray-700">{companyName}</p>
        <p>{companyAddress}</p>
        <div className="mt-2 flex justify-center gap-4 flex-wrap">
          {companyTaxId && <span>TVA: {companyTaxId}</span>}
          {company?.ice && <span>ICE: {company.ice}</span>}
          {company?.ifNumber && <span>IF: {company.ifNumber}</span>}
          {company?.patent && <span>Patente: {company.patent}</span>}
          {company?.rib && <span>RIB: {company.rib}</span>}
        </div>
      </div>
    </div>
  );
};
