import { describe, it, expect } from 'vitest'
import { buildRepairDeliveryTemplate } from '../templates/repairDeliveryMaster'
import { renderDocument, convertWorkshopSettings } from '../utils/renderDocument'

describe('repairDeliveryMaster', () => {
  it('excludes price columns when showPrices=false (BL)', () => {
    const html = buildRepairDeliveryTemplate('bon-livraison', false)
    expect(html).toContain('BON DE LIVRAISON')
    expect(html).not.toContain('PU HT')
    expect(html).not.toContain('Montant HT')
  })

  it('includes price columns when showPrices=true (OR)', () => {
    const html = buildRepairDeliveryTemplate('ordre-reparation', true)
    expect(html).toContain('ORDRE DE RÉPARATION')
    expect(html).toContain('PU HT')
    expect(html).toContain('Montant HT')
  })
})

describe('renderDocument sections', () => {
  const workshop = convertWorkshopSettings({ name: 'G', address: '', postalCode: '', city: '', phone: '', email: '' })
  const customer = { name: 'C', address: '', postalCode: '', city: '', phone: '' }
  const vehicle = { make: 'M', model: 'X', registration: '', vin: '', year: 2020 }

  it('removes parts section when there are no lines', () => {
    const doc = {
      number: 'T',
      date: new Date().toISOString(),
      lines: [],
      labor: [{ description: 'L', hours: 1, hourlyRate: 10, totalAmount: 10 }],
      subtotal: 10,
      vatTotal: 2,
      grandTotal: 12,
      notes: ''
    }
    const html = renderDocument('devis', workshop, doc, customer, vehicle)
    expect(html).not.toContain('data-doc-section="parts"')
    expect(html).toContain('data-doc-section="labor"')
  })

  it('removes labor section when there is no labor', () => {
    const doc = {
      number: 'T',
      date: new Date().toISOString(),
      lines: [{ ref: 'P1', description: 'Part', quantity: 1, unitPrice: 10, lineTotal: 10, discount: 0, tvaRate: 20 }],
      labor: [],
      subtotal: 10,
      vatTotal: 2,
      grandTotal: 12,
      notes: ''
    }
    const html = renderDocument('devis', workshop, doc, customer, vehicle)
    expect(html).toContain('data-doc-section="parts"')
    expect(html).not.toContain('data-doc-section="labor"')
  })

  it('removes labor section in custom template when labor is empty', () => {
    const doc: any = {
      number: 'T',
      date: new Date().toISOString(),
      lines: [{ ref: 'P1', description: 'Part', quantity: 1, unitPrice: 10, lineTotal: 10, discount: 0, tvaRate: 20 }],
      labor: [],
      subtotal: 10,
      vatTotal: 2,
      grandTotal: 12,
      notes: '',
      modelHtml: `
        <div class="wrapper">
          <div class="section"><div class="h2">Pièces</div><table><tbody>{{#each document.lines}}{{/each}}</tbody></table></div>
          <div class="section"><div class="h2">Main d’œuvre</div><table><tbody>{{#each document.labor}}{{/each}}</tbody></table></div>
        </div>
      `
    }
    const html = renderDocument('devis', workshop, doc, customer, vehicle)
    expect(html).toContain('Pièces')
    expect(html).not.toContain('Main d’œuvre')
  })
})
