import { formatEuroAmount, formatFrenchDate, formatFrenchNumber } from '../utils/frenchFormatters'

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
  rc?: string
  patente?: string
  if?: string
  ice?: string
  rib?: string
  bankName?: string
  accountNumber?: string
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
  mileage?: number
}

interface DocumentLine {
  ref: string
  description: string
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
  labor?: { description: string; hours: number; hourlyRate: number; totalAmount: number }[]
  partsSubtotal?: number
  laborSubtotal?: number
  notes?: string
  blNumber?: string // Added specifically for SNTL
  description?: string // Added for Accord SNTL
}

export function buildSNTLInvoiceTemplate(
  workshop: Workshop,
  document: Document,
  customer: Customer,
  vehicle?: Vehicle
): string {
  // Calculations specific to SNTL
  const totalHT = document.subtotal
  const tva20 = document.vatTotal
  const totalTTC = document.grandTotal
  
  // Commission SNTL is 10% of HT
  const commissionSNTL = totalHT * 0.10
  // TVA on Commission is 20% of Commission
  const tvaCommission = commissionSNTL * 0.20
  // Net to Pay
  const netToPay = totalTTC - commissionSNTL - tvaCommission

  // CSS for this specific template
  const css = `
    @page { size: A4; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #000; }
    .container { width: 100%; max-width: 210mm; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
    th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
    .no-border { border: none; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .header-table td { height: 20px; }
    .field-label { font-weight: normal; }
    .field-value { font-weight: bold; }
    .section-title { font-weight: bold; margin-bottom: 5px; text-transform: uppercase; font-size: 11pt; }
    .footer { margin-top: 20px; text-align: center; font-size: 9pt; }
    .signature-box { margin-top: 30px; text-align: center; font-weight: bold; }
    .totals-table { width: 45%; margin-left: auto; }
    .totals-table td { padding: 4px; }
    .amount-words { margin-top: 10px; font-style: italic; border-bottom: 1px dotted #000; display: inline-block; width: 100%; }
    .logo-img { max-height: 50px; display: block; margin: 0 auto 10px auto; }
    .header-band { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px; }
  `

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture SNTL ${document.number}</title>
  <style>${css}</style>
</head>
<body>
  <div class="container">
    
    <!-- SNTL Branding Header -->
    <div class="header-band">
      <div style="width: 30%;">
        ${workshop.logoUrl ? `<img src="${workshop.logoUrl}" class="logo-img" alt="Logo" />` : '<div style="font-weight:bold; font-size:16pt;">SNTL</div>'}
      </div>
      <div style="width: 40%; text-align: center;">
        <div style="font-size: 16pt; font-weight: bold;">FACTURE</div>
        <div>N°: ${document.number}</div>
        <div>Date: ${formatFrenchDate(document.date)}</div>
      </div>
      <div style="width: 30%; text-align: right; font-size: 9pt;">
        <div>Société Nationale des Transports et de la Logistique</div>
      </div>
    </div>

    <!-- Top Info Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 35%">Partenaire</th>
          <th style="width: 35%">Véhicule</th>
          <th style="width: 30%">Accord SNTL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <!-- Partenaire Column -->
          <td>
            <div class="row">N° Agrément SNTL: ........................</div>
            <div class="row">Raison sociale: <b>${workshop.companyName || workshop.name}</b></div>
            <div class="row">Adresse: ${workshop.address}</div>
            <div class="row">Ville: ${workshop.city}</div>
            <div class="row">RC: ${workshop.rc || ''}</div>
            <div class="row">Patente: ${workshop.patente || ''}</div>
            <div class="row">IF: ${workshop.if || ''}</div>
            <div class="row">ICE: ${workshop.ice || ''}</div>
            <div class="row">N° RIB: ${workshop.rib || ''}</div>
          </td>
          <!-- Véhicule Column -->
          <td>
            <div class="row">Matricule: <b>${vehicle?.registration || ''}</b></div>
            <div class="row">Marque et Modèle*: ${vehicle?.make || ''} ${vehicle?.model || ''}</div>
            <div class="row">Kilométrage*: ${vehicle?.mileage || '................'}</div>
            <div class="row">Administration: <b>${customer.name}</b></div>
            <div class="row">N° de Bon: ${document.blNumber || '................'}</div>
          </td>
          <!-- Accord SNTL Column -->
          <td>
            <div class="row">N° Accord SNTL*: ${document.description || '........................'}</div>
            <div style="height: 100px;"></div> <!-- Space for stamps or notes -->
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Line Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 15%">Référence article</th>
          <th style="width: 45%">Désignation article</th>
          <th style="width: 10%">Quantité</th>
          <th style="width: 15%">PU HT</th>
          <th style="width: 15%">Total HT</th>
        </tr>
      </thead>
      <tbody>
        <!-- Parts -->
        ${document.lines.map(line => `
        <tr>
          <td>${line.ref}</td>
          <td>${line.description}</td>
          <td class="text-center">${line.quantity}</td>
          <td class="text-right">${formatFrenchNumber(line.unitPrice)}</td>
          <td class="text-right">${formatFrenchNumber(line.lineTotal)}</td>
        </tr>
        `).join('')}
        
        <!-- Empty rows filler -->
        ${Array(Math.max(0, 10 - document.lines.length)).fill(0).map(() => `
        <tr>
          <td>&nbsp;</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals Block -->
    <table class="totals-table no-border">
      <tr>
        <td class="text-right">Montant Total HT (1)</td>
        <td class="text-right bold" style="border: 1px solid #000; width: 100px;">${formatEuroAmount(totalHT)}</td>
      </tr>
      <tr>
        <td class="text-right">TVA 20% (2)</td>
        <td class="text-right bold" style="border: 1px solid #000;">${formatEuroAmount(tva20)}</td>
      </tr>
      <tr>
        <td class="text-right bold">Montant Total TTC (1 + 2) (3)</td>
        <td class="text-right bold" style="border: 1px solid #000;">${formatEuroAmount(totalTTC)}</td>
      </tr>
      <tr>
        <td class="text-right">Commission SNTL (1 x 10%) (4)</td>
        <td class="text-right" style="border: 1px solid #000;">${formatEuroAmount(commissionSNTL)}</td>
      </tr>
      <tr>
        <td class="text-right">TVA 20% sur la commission (4 x 20%) (5)</td>
        <td class="text-right" style="border: 1px solid #000;">${formatEuroAmount(tvaCommission)}</td>
      </tr>
      <tr style="font-size: 11pt;">
        <td class="text-right bold">Montant Net à régler (3 - 4 - 5)</td>
        <td class="text-right bold" style="border: 2px solid #000;">${formatEuroAmount(netToPay)}</td>
      </tr>
    </table>

    <!-- Footer Text -->
    <div style="margin-top: 10px; margin-bottom: 30px;">
      Arrêté la présente facture à la somme de ........................................................................................................................................
    </div>

    <!-- Signature -->
    <div class="signature-box">
      Cachet et signature
      <div style="height: 80px;"></div>
    </div>

  </div>
</body>
</html>
`
}
