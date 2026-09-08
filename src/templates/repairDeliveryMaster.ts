import { standardPrintCss, getSignatureSection, getFooterSection } from './standardTemplates'

export type RepairDeliveryMode = 'ordre-reparation' | 'bon-livraison'

export function buildRepairDeliveryTemplate(mode: RepairDeliveryMode, showPrices: boolean): string {
  const css = standardPrintCss
  const isOR = mode === 'ordre-reparation'
  const title = isOR ? 'ORDRE DE RÉPARATION' : 'BON DE LIVRAISON'
  const priceHead = showPrices ? `
            <th class="text-right">PU HT</th>
            <th class="text-right">Remise</th>
            <th class="text-right">Montant HT</th>
  ` : ''
  const priceColsColgroup = showPrices ? `
          <col style="width:10%" />
          <col style="width:10%" />
          <col style="width:10%" />
  ` : ''
  
  // Updated totals block to match the image style (right aligned, specific rows)
  const totalsBlock = showPrices ? `
    <div class="section" style="display:flex; justify-content:flex-end">
      <div class="totals" style="width: 40%; min-width: 250px;">
        <div class="totals-row"><span>Sous-total pièces</span><span>{{totals.partsSubtotal}}</span></div>
        <div class="totals-row"><span>Sous-total main d’œuvre</span><span>{{totals.laborSubtotal}}</span></div>
        <div class="totals-row"><span>Total HT</span><span>{{totals.subtotal}}</span></div>
        <div class="totals-row"><span>Total TVA</span><span>{{totals.vatTotal}}</span></div>
        <div class="totals-row" style="font-weight:bold; font-size:1.1em; border-top:2px solid #000; margin-top:4px; padding-top:4px;"><span>Total TTC</span><span>{{totals.grandTotal}}</span></div>
        <div class="totals-row"><span>Acompte</span><span>{{totals.paid}}</span></div>
        <div class="totals-row"><span>Reste à payer</span><span>{{totals.balance}}</span></div>
      </div>
    </div>
  ` : ''
  
  const deliveryExtras = !isOR ? `
    ${getSignatureSection('Livré par', 'Accusé client')}
    <div class="section">
      <div class="h2">Notes / Instructions</div>
      <div style="min-height:24px;border:1px dashed #e5e7eb;padding:8px">{{document.notes}}</div>
    </div>
  ` : `
    ${getSignatureSection('Technicien', 'Client (Ordre de réparation)')}
  `

  // Updated labor section: only show prices (Tarif/Total) if showPrices is true
  const laborSection = (isOR || (showPrices && !isOR)) ? `
    <section class="section" data-doc-section="labor">
      <div class="h2">Main d’œuvre</div>
      <table>
        <thead>
          <tr>
            <th>Tâche</th>
            <th class="text-right">Heures</th>
            ${showPrices ? `
            <th class="text-right">Tarif</th>
            <th class="text-right">Total</th>
            ` : ''}
          </tr>
        </thead>
        <tbody>
          {{#each document.labor}}
        </tbody>
      </table>
    </section>
  ` : ''
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${title} {{document.number}}</title>
  <style>${css}</style>
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
        <div class="doc-title">${title}</div>
        <div class="doc-meta">
          <div>N°</div><div>{{document.number}}</div>
          <div>Date</div><div>{{document.date}}</div>
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
        <div class="h2">${isOR ? 'VÉHICULE' : 'VÉHICULE / LIVRAISON'}</div>
        <div><span class="muted">Marque/Modèle:</span> {{vehicle.make}} {{vehicle.model}}</div>
        <div><span class="muted">Immat.:</span> {{vehicle.registration}}</div>
        <div><span class="muted">VIN:</span> {{vehicle.vin}}</div>
        <div><span class="muted">Année:</span> {{vehicle.year}}</div>
      </div>
    </div>

    ${isOR ? `
    <div class="section">
      <div class="h2">Détails de réparation</div>
      <div>{{document.description}}</div>
    </div>` : ''}

    <section class="section" data-doc-section="parts">
      <table>
        <colgroup>
          <col style="width:14%" />
          <col style="width:46%" />
          <col style="width:10%" />
          ${priceColsColgroup}
        </colgroup>
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Description</th>
            <th class="text-right">Qté</th>
            ${priceHead}
          </tr>
        </thead>
        <tbody>
          {{#each document.lines}}
        </tbody>
      </table>
    </section>

    ${laborSection}
    ${totalsBlock}
    ${deliveryExtras}

    ${getFooterSection(
      '{{workshop.footerAddress}}',
      '{{workshop.footerContact}}',
      '{{workshop.footerLegal}}'
    )}
  </div>
</body>
</html>`
}
