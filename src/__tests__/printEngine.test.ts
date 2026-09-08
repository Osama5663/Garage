import { describe, it, expect } from 'vitest'
import { renderDocument, convertWorkshopSettings } from '../utils/renderDocument'

const ws = convertWorkshopSettings({
  name: 'Garage Dupont', address: '1 Rue', postalCode: '75001', city: 'Paris', phone: '01 02 03 04 05', email: 'a@b.fr', siret: '12345678901234', vatNumber: 'FR12345678901', rcs: 'Paris B 123', website: 'dupont.fr', logoUrl: ''
})
const customer = { name: 'Jean', address: '2 Rue', postalCode: '75002', city: 'Paris', phone: '06 11 22 33 44' }
const vehicle = { make: 'Renault', model: 'Clio', registration: 'AB-123-CD', vin: 'VF1XXX', year: 2022 }

describe('renderDocument strictness', () => {
  it('throws when required variables missing', () => {
    const doc: any = { number: 'F-001', date: '2024-01-01', lines: [], subtotal: 0, vatTotal: 0, grandTotal: 0 }
    expect(() => renderDocument('facture', ws, doc, customer, vehicle)).toThrow()
  })

  it('renders facture with complete data', () => {
    const doc = { number: 'F-001', date: '2024-01-01', dueDate: '2024-02-01', lines: [{ ref: 'P1', description: 'Pièce', quantity: 1, unitPrice: 10, lineTotal: 10 }], subtotal: 10, vatTotal: 2, grandTotal: 12, paid: 0, balance: 12 }
    const html = renderDocument('facture', ws, doc, customer, vehicle)
    expect(html).toContain('FACTURE')
    expect(html).toContain('F-001')
  })
})

describe('renderDocument performance', () => {
  it('renders 1000 documents quickly', () => {
    const docBase = { number: 'F-BASE', date: '2024-01-01', dueDate: '2024-02-01', lines: [{ ref: 'P1', description: 'Pièce', quantity: 1, unitPrice: 10, lineTotal: 10 }], subtotal: 10, vatTotal: 2, grandTotal: 12, paid: 0, balance: 12 }
    const start = Date.now()
    for (let i = 0; i < 1000; i++) {
      renderDocument('facture', ws, { ...docBase, number: 'F-' + i }, customer, vehicle)
    }
    const ms = Date.now() - start
    expect(ms).toBeLessThan(2000)
  })
})
