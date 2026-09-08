import { formatEuroAmount, formatFrenchDate, formatFrenchNumber } from './frenchFormatters'
import { buildRepairDeliveryTemplate } from '../templates/repairDeliveryMaster'
import { buildDeliveryNoteTemplate } from '../templates/deliveryNoteTemplate'
import { buildSNTLInvoiceTemplate } from '../templates/sntlInvoiceTemplate'
import { standardPrintCss, getSignatureSection, getFooterSection } from '../templates/standardTemplates'

export interface Workshop {
  name: string
  companyName?: string
  address: string
  postalCode: string
  city: string
  phone: string
  email: string
  siret?: string
  vatNumber?: string
  rcs?: string
  website?: string
  logoUrl?: string
  rc?: string
  ice?: string
  if?: string
  patent?: string
  rib?: string
  bankName?: string
  accountNumber?: string
  footerAddress?: string
  footerContact?: string
  footerLegal?: string
}

export function convertWorkshopSettings(settings: any): Workshop {
  const s = settings || {}
  // Construct dynamic footer columns based on basic info
   const footerAddress = [
     s.companyName || s.name,
     s.address,
     s.postalCode || s.city ? `${s.postalCode} ${s.city}`.trim() : ''
   ].filter(Boolean).join('\n')

  const footerContact = [
    s.phone,
    s.email,
    s.website
  ].filter(Boolean).join('\n')

  const footerLegal = [
    s.rib ? `RIB: ${s.rib}` : '',
    s.ice ? `ICE: ${s.ice}` : '',
    s.rc || s.patent ? `RC: ${s.rc || s.patent}` : '', // Note: some users put RC in patent field
    s.ifNumber || s.if ? `IF: ${s.ifNumber || s.if}` : '',
    s.patent ? `Patente: ${s.patent}` : '',
    s.vatNumber ? `TVA: ${s.vatNumber}` : ''
  ].filter(Boolean).join('\n')

  return {
    name: s.name || s.companyName || '',
    companyName: s.companyName || s.name || '',
    address: s.address || '',
    postalCode: s.postalCode || '',
    city: s.city || '',
    phone: s.phone || '',
    email: s.email || '',
    siret: s.siret || s.taxId,
    vatNumber: s.vatNumber || s.vatNumber || '',
    rcs: s.rcs || s.rc || s.patent || '',
    website: s.website,
    logoUrl: s.logoUrl || s.logo,
    rc: s.rc || '',
    ice: s.ice || '',
    if: s.ifNumber || s.if || '',
    patent: s.patent || '',
    rib: s.rib || '',
    bankName: s.bankName || '',
    accountNumber: s.accountNumber || '',
    footerAddress,
    footerContact,
    footerLegal
  }
}

export interface Customer {
  name: string
  address: string
  postalCode: string
  city: string
  phone: string
  email?: string
  tvaNumber?: string
}

export interface Vehicle {
  make: string
  model: string
  registration: string
  vin: string
  year: number
  mileage?: number
}

export interface DocumentLine {
  type?: string
  category?: string
  ref: string
  description: string
  shortDescription?: string
  quantity: number
  unitPrice: number
  discount?: number
  lineTotal: number
  tvaRate?: number
}

export interface Document {
  number: string
  date: string
  dueDate?: string
  validUntil?: string
  status?: string
  terms?: string
  lines: DocumentLine[]
  subtotal: number
  vatTotal: number
  grandTotal: number
  paid?: number
  balance?: number
  description?: string
  labor?: { category?: string; description: string; shortDescription?: string; hours: number; hourlyRate: number; discount?: number; totalAmount: number; tvaRate?: number }[]
  partsSubtotal?: number
  laborSubtotal?: number
  notes?: string
  payments?: Array<{ date: string; amount: number; method?: string; reference?: string }>
}

function interpolate(template: string, vars: Record<string, string>): string {
  // Supports keys with dots and hyphens, and optional whitespace inside {{ }}
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => (vars[key] ?? ''))
}

function interpolateAll(template: string, vars: Record<string, string>, maxPasses = 3): { content: string; unresolved: string[] } {
  let content = template
  let pass = 0
  let unresolved: string[] = []
  while (pass < maxPasses) {
    const next = interpolate(content, vars)
    content = next
    const tokens = content.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g) || []
    if (tokens.length === 0) break
    unresolved = tokens
    pass++
  }
  return { content, unresolved }
}

function renderLines(lines: DocumentLine[], showPrices = true, mode = 'standard'): string {
  const effectiveLines = (lines || []).filter(l => {
    const ref = String(l?.ref ?? '').trim()
    const description = String(l?.description ?? '').trim()
    const shortDescription = String(l?.shortDescription ?? '').trim()
    const quantity = Number(l?.quantity ?? 0)
    const unitPrice = Number(l?.unitPrice ?? 0)
    const lineTotal = Number(l?.lineTotal ?? 0)
    return ref.length > 0 || description.length > 0 || shortDescription.length > 0 || quantity !== 0 || unitPrice !== 0 || lineTotal !== 0
  })

  const colCount = !showPrices ? 3 : mode === 'pricing' ? 7 : mode === 'devis' ? 5 : 6

  const out: string[] = []
  let currentCategory: string | null = null

  for (const l of effectiveLines) {
    const category = String(l.category ?? '').trim()
    if (category && category !== currentCategory) {
      out.push(`
    <tr>
      <td colspan="${colCount}" style="background:#f3f4f6; font-weight:700; padding:6px 8px; border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb;">${category}</td>
    </tr>`)
      currentCategory = category
    } else if (!category) {
      currentCategory = null
    }

    if (!showPrices) {
      out.push(`
    <tr>
      <td>${l.ref}</td>
      <td>${l.description}${l.shortDescription ? `<div class="muted" style="font-size:10px">${l.shortDescription}</div>` : ''}</td>
      <td class="text-right">${l.quantity}</td>
    </tr>`)
      continue
    }

    if (mode === 'pricing') {
      const r = Math.min(100, Math.max(0, Number(l.discount ?? 0)))
      const unitNet = Number(l.unitPrice) * (1 - r / 100)
      out.push(`
    <tr>
      <td>${l.ref}</td>
      <td>${l.description}${l.shortDescription ? `<div class="muted" style="font-size:10px">${l.shortDescription}</div>` : ''}</td>
      <td class="text-right">${formatFrenchNumber(l.quantity)}</td>
      <td class="text-right">${formatFrenchNumber(l.unitPrice)}</td>
      <td class="text-right">${r ? `${formatFrenchNumber(r)} %` : ''}</td>
      <td class="text-right">${formatFrenchNumber(unitNet)}</td>
      <td class="text-right" style="font-weight:bold">${formatFrenchNumber(l.lineTotal)}</td>
    </tr>`)
      continue
    }

    if (mode === 'devis') {
      out.push(`
    <tr>
      <td>${l.type || l.ref}</td>
      <td>${l.description}${l.shortDescription ? `<div class="muted" style="font-size:10px">${l.shortDescription}</div>` : ''}</td>
      <td class="text-right">${l.quantity}</td>
      <td class="text-right">${formatFrenchNumber(l.unitPrice)}</td>
      <td class="text-right" style="font-weight:bold">${formatFrenchNumber(l.lineTotal)}</td>
    </tr>`)
      continue
    }

    out.push(`
    <tr>
      <td>${l.ref}</td>
      <td>${l.description}${l.shortDescription ? `<div class="muted" style="font-size:10px">${l.shortDescription}</div>` : ''}</td>
      <td class="text-right">${l.quantity}</td>
      <td class="text-right">${formatFrenchNumber(l.unitPrice)}</td>
      <td class="text-right">${l.discount ? l.discount + ' %' : ''}</td>
      <td class="text-right">${formatFrenchNumber(l.lineTotal)}</td>
    </tr>`)
  }

  return out.join('')
}

function renderLabor(labor: Document['labor'], showPrices = true, mode = 'standard'): string {
  if (!labor) return ''
  const effectiveLabor = (labor || []).filter(l => {
    const description = String(l?.description ?? '').trim()
    const shortDescription = String(l?.shortDescription ?? '').trim()
    const hours = Number((l as any)?.hours ?? 0)
    const hourlyRate = Number((l as any)?.hourlyRate ?? 0)
    const totalAmount = Number((l as any)?.totalAmount ?? 0)
    return description.length > 0 || shortDescription.length > 0 || hours !== 0 || hourlyRate !== 0 || totalAmount !== 0
  })

  const colCount = !showPrices ? 2 : mode === 'pricing' ? 6 : 4

  const out: string[] = []
  let currentCategory: string | null = null

  for (const l of effectiveLabor) {
    const category = String((l as any)?.category ?? '').trim()
    if (category && category !== currentCategory) {
      out.push(`
    <tr>
      <td colspan="${colCount}" style="background:#f3f4f6; font-weight:700; padding:6px 8px; border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb;">${category}</td>
    </tr>`)
      currentCategory = category
    } else if (!category) {
      currentCategory = null
    }

    if (!showPrices) {
      out.push(`
    <tr>
      <td>${l.description}${l.shortDescription ? `<div class="muted" style="font-size:10px">${l.shortDescription}</div>` : ''}</td>
      <td class="text-right">${(l as any).hours}</td>
    </tr>`)
      continue
    }

    if (mode === 'pricing') {
      const r = Math.min(100, Math.max(0, Number((l as any).discount ?? 0)))
      const hourlyRate = Number((l as any).hourlyRate ?? 0)
      const hourlyRateNet = hourlyRate * (1 - r / 100)
      out.push(`
    <tr>
      <td>${l.description}${l.shortDescription ? `<div class="muted" style="font-size:10px">${l.shortDescription}</div>` : ''}</td>
      <td class="text-right">${formatFrenchNumber((l as any).hours)}</td>
      <td class="text-right">${formatFrenchNumber(hourlyRate)}</td>
      <td class="text-right">${r ? `${formatFrenchNumber(r)} %` : ''}</td>
      <td class="text-right">${formatFrenchNumber(hourlyRateNet)}</td>
      <td class="text-right" style="font-weight:bold">${formatFrenchNumber((l as any).totalAmount)}</td>
    </tr>`)
      continue
    }

    out.push(`
    <tr>
      <td>${l.description}${l.shortDescription ? `<div class="muted" style="font-size:10px">${l.shortDescription}</div>` : ''}</td>
      <td class="text-right">${(l as any).hours}</td>
      <td class="text-right">${formatFrenchNumber((l as any).hourlyRate)}</td>
      <td class="text-right">${formatFrenchNumber((l as any).totalAmount)}</td>
    </tr>`)
  }

  return out.join('')
}

function renderPayments(payments: Document['payments']): string {
  if (!payments || payments.length === 0) return ''
  return payments.map(p => `
    <tr>
      <td>${formatFrenchDate(p.date)}</td>
      <td>${(p.method || '').replace('_', ' ')}</td>
      <td>${p.reference || ''}</td>
      <td class="text-right">${formatEuroAmount(p.amount)}</td>
    </tr>`).join('')
}

function stripSection(html: string, section: 'parts' | 'labor'): string {
  const pattern = new RegExp(`<(?:(section|div))[^>]*data-doc-section="${section}"[^>]*>[\\s\\S]*?<\\/\\1>`, 'g')
  return html.replace(pattern, '')
}

function stripEnclosingSectionByHeading(html: string, heading: RegExp): string {
  const headingPattern = new RegExp(`<div\\s+class="h2">\\s*${heading.source}\\s*<\\/div>`, 'ig')
  let out = html
  let m: RegExpExecArray | null

  while ((m = headingPattern.exec(out))) {
    const headingIndex = m.index
    const before = out.slice(0, headingIndex)
    const sectionOpenRe = /<(section|div)[^>]*class="[^"]*\bsection\b[^"]*"[^>]*>/ig
    let last: RegExpExecArray | null = null
    let mm: RegExpExecArray | null
    while ((mm = sectionOpenRe.exec(before))) last = mm
    if (!last) continue

    const tagName = String(last[1]).toLowerCase()
    const startIndex = last.index
    const tagRe = new RegExp(`<\\/?${tagName}\\b`, 'ig')
    tagRe.lastIndex = startIndex
    let depth = 0
    let closeEnd = -1

    while ((mm = tagRe.exec(out))) {
      const isClose = out.slice(mm.index, mm.index + 2) === '</'
      depth += isClose ? -1 : 1
      if (depth === 0 && isClose) {
        const gt = out.indexOf('>', mm.index)
        closeEnd = gt >= 0 ? gt + 1 : -1
        break
      }
    }

    if (closeEnd > startIndex) {
      out = out.slice(0, startIndex) + out.slice(closeEnd)
      headingPattern.lastIndex = Math.max(0, startIndex - 1)
    } else {
      break
    }
  }

  return out
}

function applySectionVisibility(html: string, hasLines: boolean, hasLabor: boolean): string {
  let out = html
  if (!hasLines) out = stripSection(out, 'parts')
  if (!hasLabor) out = stripSection(out, 'labor')

  if (!hasLabor) {
    out = stripEnclosingSectionByHeading(out, /Main d[’']œuvre/i)
  }
  return out
}

export function renderDocument(
  type: 'facture' | 'bon-livraison' | 'devis' | 'ordre-reparation' | 'facture-sntl',
  workshop: Workshop,
  document: Document,
  customer: Customer,
  vehicle?: Vehicle
): string {
  const operationId = String(Date.now())
  const start = Date.now()
  const vars: Record<string, string> = {
    'workshop.name': workshop.name,
    'workshop.companyName': workshop.companyName ?? workshop.name,
    'workshop.address': workshop.address,
    'workshop.postalCode': workshop.postalCode,
    'workshop.city': workshop.city,
    'workshop.phone': workshop.phone,
    'workshop.email': workshop.email,
    'workshop.siret': workshop.siret ?? '',
    'workshop.vatNumber': workshop.vatNumber ?? '',
    'workshop.rcs': workshop.rcs ?? '',
    'workshop.website': workshop.website ?? '',
    'workshop.logoUrl': workshop.logoUrl ?? '',
    'workshop.rc': workshop.rc ?? '',
    'workshop.ice': workshop.ice ?? '',
    'workshop.if': workshop.if ?? '',
    'workshop.patent': workshop.patent ?? '',
    'workshop.rib': workshop.rib ?? '',
    'workshop.bankName': workshop.bankName ?? '',
    'workshop.accountNumber': workshop.accountNumber ?? '',
    'workshop.footerAddress': workshop.footerAddress ?? '',
    'workshop.footerContact': workshop.footerContact ?? '',
    'workshop.footerLegal': workshop.footerLegal ?? '',
    'document.number': document.number,
    'document.date': formatFrenchDate(document.date),
    'document.dueDate': document.dueDate ? formatFrenchDate(document.dueDate) : '',
    'document.validUntil': document.validUntil ? formatFrenchDate(document.validUntil) : '',
    'document.description': document.description ?? '',
    'document.notes': document.notes ?? '',
    'document.banner': document.status === 'draft' ? '<div class="banner">BROUILLON</div>' : '',
    'document.terms': document.terms ? `<div class="section"><div class="h2">Conditions Générales de Vente</div><div>${document.terms}</div></div>` : '',
    'customer.name': customer.name,
    'customer.address': customer.address,
    'customer.postalCode': customer.postalCode,
    'customer.city': customer.city,
    'customer.phone': customer.phone,
    'customer.email': customer.email ?? '',
    'totals.subtotal': formatEuroAmount(document.subtotal),
    'totals.vatTotal': formatEuroAmount(document.vatTotal),
    'totals.grandTotal': formatEuroAmount(document.grandTotal),
    'totals.paid': formatEuroAmount(document.paid ?? 0),
    'totals.balance': formatEuroAmount(document.balance ?? document.grandTotal)
  }
  const computedPartsSubtotal =
    typeof document.partsSubtotal === 'number'
      ? document.partsSubtotal
      : (document.lines || []).reduce((sum, l) => sum + Number((l as any)?.lineTotal ?? 0), 0)
  const computedLaborSubtotal =
    typeof document.laborSubtotal === 'number'
      ? document.laborSubtotal
      : (document.labor || []).reduce((sum, l) => sum + Number((l as any)?.totalAmount ?? 0), 0)
  vars['totals.partsSubtotal'] = formatEuroAmount(computedPartsSubtotal)
  vars['totals.laborSubtotal'] = formatEuroAmount(computedLaborSubtotal)

  if (vehicle) {
    vars['vehicle.make'] = vehicle.make
    vars['vehicle.model'] = vehicle.model
    vars['vehicle.registration'] = vehicle.registration
    vars['vehicle.vin'] = vehicle.vin
    vars['vehicle.year'] = String(vehicle.year)
  }

  // Determine price visibility first to ensure consistency across template and lines
  let showPrices = true
  const requestedShowPrices = (document as any)?.showPrices
  if (type === 'bon-livraison') {
    // Force showPrices to true for Delivery Notes as per requirement
    showPrices = true
    // Return immediately for BL since we use the smart template builder which returns full HTML
    const html = buildDeliveryNoteTemplate(showPrices, workshop, document, customer, vehicle)
    // Add logic to log the success
    try { console.info('[print]', { operationId, type, length: html.length, mode: 'built-in-new-bl-forced' }) } catch {}
    return html
  } else if (type === 'facture-sntl') {
    // SNTL Invoice
    const html = buildSNTLInvoiceTemplate(workshop, document, customer, vehicle)
    try { console.info('[print]', { operationId, type, length: html.length, mode: 'built-in-sntl' }) } catch {}
    return html
  } else if (type === 'ordre-reparation') {
    showPrices = typeof requestedShowPrices === 'boolean' ? requestedShowPrices : true
  }

  const pricingMode = type === 'facture' || type === 'devis' ? 'pricing' : 'standard'
  const lines = renderLines(document.lines, showPrices, pricingMode)
  const labor = renderLabor(document.labor, showPrices, pricingMode)
  const payments = renderPayments(document.payments)

  const customModel = (document as any)?.modelHtml
  if (customModel && String(customModel).trim().length > 0) {
    const raw = String(customModel)
    const firstPass = interpolateAll(raw, vars)
    const withBlocks = firstPass.content
      .replace('{{#each document.lines}}', lines)
      .replace('{{/each}}', '')
      .replace('{{#each document.labor}}', labor)
      .replace('{{/each}}', '')
    const finalPass = interpolateAll(withBlocks, vars)
    const hasLines = lines.trim().length > 0
    const hasLabor = labor.trim().length > 0
    const content = applySectionVisibility(finalPass.content, hasLines, hasLabor)
    const unresolved = finalPass.unresolved
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${type} ${vars['document.number'] || ''}</title>
  <style>${standardPrintCss}</style>
</head>
<body>
  <div class="wrapper">${content}</div>
</body>
</html>`
    const duration = Date.now() - start
    try { console.info('[print]', { operationId, type, duration, length: html.length, mode: 'model-only', varsUsed: Object.keys(vars).length, unresolvedCount: unresolved.length, unresolved }) } catch {}
    return html
  }

  // Fallback to built-in safe templates by type
  let base: string | null = null
  if (type === 'facture') base = factureTemplate
  else if (type === 'devis') base = devisTemplate
  else if (type === 'ordre-reparation') {
    base = buildRepairDeliveryTemplate('ordre-reparation', showPrices)
  }

  if (!base) {
    const safe = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><title>${type}</title></head><body><div style="padding:16px;font-family:system-ui,Arial,sans-serif;color:#b91c1c">Aucun modèle disponible pour ${type}</div></body></html>`
    try { console.error('[print]', { operationId, type, error: 'No base template', mode: 'fallback-error' }) } catch {}
    return safe
  }

  const issues: string[] = []
  if (!customer?.name) issues.push('Client manquant')
  if (vehicle && (!vehicle.make || !vehicle.model)) issues.push('Véhicule incomplet')
  
  const hasLines = lines.trim().length > 0
  const hasLabor = labor.trim().length > 0
  
  if (!hasLines && !hasLabor) issues.push('Aucune ligne à afficher')

  let baseTemplate = base
  baseTemplate = applySectionVisibility(baseTemplate, hasLines, hasLabor)

  const firstPass = interpolateAll(baseTemplate, vars)

  const withBlocks = firstPass.content
    .replace('{{#each document.lines}}', lines)
    .replace('{{/each}}', '')
    .replace('{{#each document.labor}}', labor)
    .replace('{{/each}}', '')
    .replace('{{#each document.payments}}', payments)
    .replace('{{/each}}', '')
  const finalPass = interpolateAll(withBlocks, vars)
  const content = finalPass.content
  const unresolved = finalPass.unresolved
  const duration = Date.now() - start
  const dataInfo = { linesCount: document.lines?.length || 0, laborCount: document.labor?.length || 0, hasCustomer: !!customer?.name, hasVehicle: !!vehicle?.make }
  try { console.info('[print]', { operationId, type, duration, length: content.length, mode: 'built-in-default', varsUsed: Object.keys(vars).length, unresolvedCount: unresolved.length, unresolved, dataInfo, issues }) } catch {}

  if (issues.length > 0) {
    const warn = `<div style="margin:8px 0;padding:8px;border:1px solid #fecaca;background:#fee2e2;color:#b91c1c;border-radius:6px">Données manquantes: ${issues.join(', ')}</div>`
    const injected = content.replace('<div class="wrapper">', `<div class="wrapper">${warn}`)
    return injected
  }
  return content
}

const factureTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture {{document.number}}</title>
  <style>${standardPrintCss}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-box">
        <img class="logo" src="{{workshop.logoUrl}}" alt="Logo" />
        <div class="company">
          <div style="font-weight:700; font-size:14px; margin-bottom:4px;">{{workshop.name}}</div>
          <div>{{workshop.address}}</div>
          <div>{{workshop.postalCode}} {{workshop.city}}</div>
          <div>{{workshop.phone}} – {{workshop.email}}</div>
          <div><a href="{{workshop.website}}" style="color:inherit; text-decoration:none;">{{workshop.website}}</a></div>
        </div>
      </div>
      <div class="title-box">
        <div class="doc-title">FACTURE</div>
        <div class="doc-meta">
          <div>N°</div><div>{{document.number}}</div>
          <div>Date</div><div>{{document.date}}</div>
          <div>Échéance</div><div>{{document.dueDate}}</div>
        </div>
      </div>
    </div>

    <div class="grid2 section">
      <div>
        <div class="h2">CLIENT</div>
        <div style="font-weight:600; margin-bottom:4px;">{{customer.name}}</div>
        <div class="muted">{{customer.address}}</div>
        <div class="muted">{{customer.postalCode}} {{customer.city}}</div>
        <div class="muted">{{customer.phone}}</div>
      </div>
      <div>
        <div class="h2">VÉHICULE</div>
        <div><span class="muted">Marque/Modèle:</span> {{vehicle.make}} {{vehicle.model}}</div>
        <div><span class="muted">Immat.:</span> {{vehicle.registration}}</div>
        <div><span class="muted">VIN:</span> {{vehicle.vin}}</div>
        <div><span class="muted">Année:</span> {{vehicle.year}}</div>
      </div>
    </div>

    <section class="section" data-doc-section="parts">
      <div class="h2">Pièces</div>
      <div class="muted" style="font-size:10px; margin-top:-6px; margin-bottom:8px;">Prix HT</div>
      <table>
        <colgroup>
          <col style="width:12%" />
          <col style="width:42%" />
          <col style="width:8%" />
          <col style="width:10%" />
          <col style="width:8%" />
          <col style="width:10%" />
          <col style="width:10%" />
        </colgroup>
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Description</th>
            <th class="text-right">Qté</th>
            <th class="text-right">PU HT</th>
            <th class="text-right">R</th>
            <th class="text-right">PU HT NET</th>
            <th class="text-right">P.Total HT</th>
          </tr>
        </thead>
        <tbody>
          {{#each document.lines}}
        </tbody>
      </table>
    </section>

    <section class="section" data-doc-section="labor">
      <div class="h2">Main d’œuvre</div>
      <div class="muted" style="font-size:10px; margin-top:-6px; margin-bottom:8px;">Prix HT</div>
      <table>
        <thead>
          <tr>
            <th>Tâche</th>
            <th class="text-right">Heures</th>
            <th class="text-right">PU HT</th>
            <th class="text-right">R</th>
            <th class="text-right">PU HT NET</th>
            <th class="text-right">P.Total HT</th>
          </tr>
        </thead>
        <tbody>
          {{#each document.labor}}
        </tbody>
      </table>
    </section>

    <div class="section" style="display:flex; justify-content:flex-end">
      <div class="totals">
        <div class="totals-row"><span>Sous-total pièces <span class="muted" style="font-size:10px">(HT)</span></span><span>{{totals.partsSubtotal}}</span></div>
        <div class="totals-row"><span>Sous-total main d’œuvre <span class="muted" style="font-size:10px">(HT)</span></span><span>{{totals.laborSubtotal}}</span></div>
        <div class="totals-row"><span>Sous-total <span class="muted" style="font-size:10px">(HT)</span></span><span>{{totals.subtotal}}</span></div>
        <div class="totals-row"><span>Total TVA</span><span>{{totals.vatTotal}}</span></div>
        <div class="totals-row"><span>Total TTC</span><span>{{totals.grandTotal}}</span></div>
        <div class="totals-row"><span>Acompte</span><span>{{totals.paid}}</span></div>
        <div class="totals-row"><span>Reste à payer</span><span>{{totals.balance}}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="h2">Historique des paiements</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Méthode</th>
            <th>Référence</th>
            <th class="text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {{#each document.payments}}
        </tbody>
      </table>
    </div>

    ${getFooterSection(
      '{{workshop.footerAddress}}',
      '{{workshop.footerContact}}',
      '{{workshop.footerLegal}}',
      'Paiement à réception de facture'
    )}
  </div>
</body>
</html>`

const devisTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Devis {{document.number}}</title>
  <style>${standardPrintCss}
    .banner { text-align: center; font-weight: 700; text-transform: uppercase; border: 2px solid #f97316; background-color: #ffedd5; color: #c2410c; padding: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-box">
        <img class="logo" src="{{workshop.logoUrl}}" alt="Logo" />
        <div class="company">
          <div style="font-weight:700; font-size:14px; margin-bottom:4px;">{{workshop.name}}</div>
          <div>{{workshop.address}}</div>
          <div>{{workshop.postalCode}} {{workshop.city}}</div>
          <div>{{workshop.phone}} – {{workshop.email}}</div>
          <div><a href="{{workshop.website}}" style="color:inherit; text-decoration:none;">{{workshop.website}}</a></div>
        </div>
      </div>
      <div class="title-box">
        <div class="doc-title">DEVIS</div>
        <div class="doc-meta">
          <div>N°</div><div>{{document.number}}</div>
          <div>Date</div><div>{{document.date}}</div>
          <div>Échéance</div><div>{{document.dueDate}}</div>
        </div>
      </div>
    </div>

    {{document.banner}}

    <div class="grid2 section">
      <div>
        <div class="h2">CLIENT</div>
        <div style="font-weight:600; margin-bottom:4px;">{{customer.name}}</div>
        <div class="muted">{{customer.address}}</div>
        <div class="muted">{{customer.postalCode}} {{customer.city}}</div>
        <div class="muted">{{customer.phone}}</div>
      </div>
      <div>
        <div class="h2">VÉHICULE</div>
        <div><span class="muted">Marque/Modèle:</span> {{vehicle.make}} {{vehicle.model}}</div>
        <div><span class="muted">Immat.:</span> {{vehicle.registration}}</div>
        <div><span class="muted">VIN:</span> {{vehicle.vin}}</div>
        <div><span class="muted">Année:</span> {{vehicle.year}}</div>
      </div>
    </div>

    <div class="section">
      <div class="h2">Détails du devis</div>
      <div>{{document.notes}}</div>
    </div>

    <section class="section" data-doc-section="parts">
      <div class="muted" style="font-size:10px; margin-top:-2px; margin-bottom:8px;">Prix HT</div>
      <table>
        <colgroup>
          <col style="width:12%" />
          <col style="width:42%" />
          <col style="width:8%" />
          <col style="width:10%" />
          <col style="width:8%" />
          <col style="width:10%" />
          <col style="width:10%" />
        </colgroup>
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Description</th>
            <th class="text-right">Qté</th>
            <th class="text-right">PU HT</th>
            <th class="text-right">R</th>
            <th class="text-right">PU HT NET</th>
            <th class="text-right">P.Total HT</th>
          </tr>
        </thead>
        <tbody>
          {{#each document.lines}}
        </tbody>
      </table>
    </section>

    <section class="section" data-doc-section="labor">
      <div class="h2">Main d’œuvre</div>
      <div class="muted" style="font-size:10px; margin-top:-6px; margin-bottom:8px;">Prix HT</div>
      <table>
        <thead>
          <tr>
            <th>Tâche</th>
            <th class="text-right">Heures</th>
            <th class="text-right">PU HT</th>
            <th class="text-right">R</th>
            <th class="text-right">PU HT NET</th>
            <th class="text-right">P.Total HT</th>
          </tr>
        </thead>
        <tbody>
          {{#each document.labor}}
        </tbody>
      </table>
    </section>

    <div class="section" style="display:flex; justify-content:flex-end">
      <div class="totals" style="width: 40%; min-width: 250px;">
        <div class="totals-row"><span>Sous-total pièces</span><span>{{totals.partsSubtotal}}</span></div>
        <div class="totals-row"><span>Sous-total main d’œuvre</span><span>{{totals.laborSubtotal}}</span></div>
        <div class="totals-row"><span>Total HT</span><span>{{totals.subtotal}}</span></div>
        <div class="totals-row"><span>Total TVA</span><span>{{totals.vatTotal}}</span></div>
        <div class="totals-row" style="font-weight:bold; font-size:1.1em; border-top:2px solid #000; margin-top:4px; padding-top:4px;"><span>Total TTC</span><span>{{totals.grandTotal}}</span></div>
        <div class="note">Validité du devis jusqu’au {{document.validUntil}}</div>
      </div>
    </div>

    {{document.terms}}

    ${getSignatureSection('Validé par (Nom & Cachet)', 'Bon pour accord (Client)')}

    ${getFooterSection(
      '{{workshop.footerAddress}}',
      '{{workshop.footerContact}}',
      '{{workshop.footerLegal}}',
      'Devis valable 30 jours'
    )}
  </div>
</body>
</html>`
