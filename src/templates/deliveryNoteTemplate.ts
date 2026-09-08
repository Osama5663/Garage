
import { formatEuroAmount, formatFrenchDate, formatFrenchNumber } from '../utils/frenchFormatters'
import { standardPrintCss, getSignatureSection, getFooterSection } from './standardTemplates'

interface Workshop {
  name: string
  companyName?: string
  address: string
  postalCode: string
  city: string
  phone: string
  email: string
  siret?: string
  vatNumber?: string
  logoUrl?: string
  footerAddress?: string
  footerContact?: string
  footerLegal?: string
}

interface Customer {
  name: string
  address: string
  postalCode: string
  city: string
  phone: string
  email?: string
}

interface Vehicle {
  make: string
  model: string
  registration: string
  vin: string
  year: number
}

interface DocumentLine {
  ref: string
  description: string
  shortDescription?: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface Document {
  number: string
  date: string
  lines: DocumentLine[]
  subtotal: number
  vatTotal: number
  grandTotal: number
  labor?: { description: string; shortDescription?: string; hours: number; hourlyRate: number; totalAmount: number }[]
  partsSubtotal?: number
  laborSubtotal?: number
  notes?: string
}

  const css = standardPrintCss

export function buildDeliveryNoteTemplate(
  _unusedShowPrices: boolean,
  workshop: Workshop,
  document: Document,
  customer: Customer,
  vehicle?: Vehicle
): string {
  // Always show prices for Delivery Notes as per requirement
  const showPrices = true;
  
  const priceHeaders = showPrices ? `
    <th class="text-right" style="width: 12%">PU HT</th>
    <th class="text-right" style="width: 12%">Total HT</th>
  ` : ''

  const laborRows = (document.labor && document.labor.length > 0) ? `
    <div class="section">
      <div class="h2">Main d'œuvre</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right" style="width: 10%">Heures</th>
            ${showPrices ? `
            <th class="text-right" style="width: 12%">Tarif</th>
            <th class="text-right" style="width: 12%">Total HT</th>
            ` : ''}
          </tr>
        </thead>
        <tbody>
          ${document.labor.map(l => `
          <tr>
            <td>${l.description}${l.shortDescription ? `<div class="muted" style="font-size:10px">${l.shortDescription}</div>` : ''}</td>
            <td class="text-right">${l.hours}</td>
            ${showPrices ? `
            <td class="text-right">${formatFrenchNumber(l.hourlyRate)}</td>
            <td class="text-right">${formatFrenchNumber(l.totalAmount)}</td>
            ` : ''}
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''

  const partsRows = `
    <div class="section">
      <div class="h2">Pièces & Articles</div>
      <table>
        <thead>
          <tr>
            <th style="width: 15%">Réf.</th>
            <th>Description</th>
            <th class="text-right" style="width: 10%">Qté</th>
            ${priceHeaders}
          </tr>
        </thead>
        <tbody>
          ${document.lines.map(l => `
          <tr>
            <td>${l.ref}</td>
            <td>${l.description}${l.shortDescription ? `<div class="muted" style="font-size:10px">${l.shortDescription}</div>` : ''}</td>
            <td class="text-right">${l.quantity}</td>
            ${showPrices ? `
            <td class="text-right">${formatFrenchNumber(l.unitPrice)}</td>
            <td class="text-right">${formatFrenchNumber(l.lineTotal)}</td>
            ` : ''}
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `

  const totalsSection = showPrices ? `
    <div class="totals-section" style="display: flex; justify-content: flex-end; margin-top: 16px;">
      <div class="totals-box" style="width: 40%; min-width: 250px;">
        ${document.laborSubtotal ? `
        <div class="totals-row" style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="color: #6b7280;">Main d'œuvre HT</span>
          <span style="font-weight: 600;">${formatEuroAmount(document.laborSubtotal)}</span>
        </div>` : ''}
        ${document.partsSubtotal ? `
        <div class="totals-row" style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="color: #6b7280;">Pièces HT</span>
          <span style="font-weight: 600;">${formatEuroAmount(document.partsSubtotal)}</span>
        </div>` : ''}
        <div class="totals-row" style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="color: #6b7280;">Total HT</span>
          <span style="font-weight: 600;">${formatEuroAmount(document.subtotal)}</span>
        </div>
        <div class="totals-row" style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="color: #6b7280;">TVA (20%)</span>
          <span style="font-weight: 600;">${formatEuroAmount(document.vatTotal)}</span>
        </div>
        <div class="totals-row final" style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #111827; margin-top: 8px;">
          <span style="font-weight: 800; font-size: 14px;">Total TTC</span>
          <span style="font-weight: 800; font-size: 14px;">${formatEuroAmount(document.grandTotal)}</span>
        </div>
      </div>
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Bon de Livraison ${document.number}</title>
  <style>${css}</style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <div class="logo-box">
        ${workshop.logoUrl ? `<img class="logo" src="${workshop.logoUrl}" alt="Logo" />` : ''}
        <div class="company">
          <div style="font-weight:bold; font-size:14px">${workshop.name}</div>
          <div>${workshop.address}</div>
          <div>${workshop.postalCode} ${workshop.city}</div>
          <div>${workshop.phone}</div>
          <div>${workshop.email}</div>
        </div>
      </div>
      <div class="title-box">
        <div class="doc-title">BON DE LIVRAISON</div>
        ${!showPrices ? '<div style="color:#ef4444; font-size:10px; font-weight:bold; text-transform:uppercase;">(Sans Prix)</div>' : ''}
        <div class="doc-meta" style="margin-top:8px">
          <div style="font-weight:600">N° BL:</div><div>${document.number}</div>
          <div style="font-weight:600">Date:</div><div>${formatFrenchDate(document.date)}</div>
        </div>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="grid2 section">
      <div>
        <div class="h2">CLIENT</div>
        <div style="font-weight:600">${customer.name}</div>
        <div>${customer.address}</div>
        <div>${customer.postalCode} ${customer.city}</div>
        <div>${customer.phone}</div>
        <div>${customer.email || ''}</div>
      </div>
      <div>
        <div class="h2">VÉHICULE</div>
        ${vehicle && vehicle.make ? `
        <div><strong>${vehicle.make} ${vehicle.model}</strong></div>
        <div>Immat: ${vehicle.registration}</div>
        <div>VIN: ${vehicle.vin}</div>
        <div>Année: ${vehicle.year}</div>
        ` : `
        <div class="muted">Aucun véhicule associé</div>
        `}
      </div>
    </div>

    <!-- Content -->
    ${laborRows}
    ${partsRows}
    ${totalsSection}

    <!-- Notes -->
    ${document.notes ? `
    <div class="section" style="margin-top:24px">
      <div class="h2">Notes</div>
      <div style="font-style:italic; color:#4b5563">${document.notes}</div>
    </div>
    ` : ''}

    <!-- Signatures -->
    ${getSignatureSection('Livré par', 'Accusé client')}

    <!-- Footer -->
    ${getFooterSection(
      workshop.footerAddress || '',
      workshop.footerContact || '',
      workshop.footerLegal || ''
    )}
  </div>
</body>
</html>`
}
