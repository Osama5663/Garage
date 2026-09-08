import { describe, it, expect } from 'vitest'
import { renderVariableTemplate, TemplateDef } from '../utils/variableTemplate'

const tpl: TemplateDef = {
  header: { id: 'header', enabled: true, content: '<div class="h1">{{workshop.companyName}}</div><div class="muted">N° {{document.number}} • {{document.date}}</div>' },
  body: [
    { id: 'customer', enabled: true, content: '<div class="section"><div class="h2">Client</div><div>{{customer.name}}</div><div class="muted">{{customer.address}}</div></div>' },
    { id: 'lines', enabled: true, content: '<div class="section"><table><thead><tr><th>Ref</th><th>Desc</th><th>Qty</th><th>PU</th><th>Total</th></tr></thead><tbody>{{#each document.lines}}<tr><td>{{item.ref}}</td><td>{{item.description}}</td><td>{{item.quantity}}</td><td>{{item.unitPrice}}</td><td>{{item.lineTotal}}</td></tr>{{/each}}</tbody></table></div>' }
  ],
  footer: { id: 'footer', enabled: true, content: '<div class="muted">{{workshop.footerAddress}}</div>' },
  styles: { fontFamily: 'Arial, sans-serif', fontSize: 12, primaryColor: '#2563eb', secondaryColor: '#64748b', lineHeight: 1.5, margin: 10, padding: 8 }
}

describe('variable template engine', () => {
  it('renders variables and loops', () => {
    const vars = {
      'workshop.companyName': 'GaragePro',
      'document.number': 'INV-001',
      'document.date': '2025-12-05',
      'customer.name': 'John',
      'customer.address': '123 Street',
      'workshop.footerAddress': '456 Ave'
    }
    const arrays = {
      'document.lines': [
        { ref: 'L001', description: 'Oil', quantity: 1, unitPrice: 25, lineTotal: 25 },
        { ref: 'L002', description: 'Filter', quantity: 2, unitPrice: 10, lineTotal: 20 }
      ]
    }
    const html = renderVariableTemplate(tpl, vars, arrays)
    expect(html).toContain('GaragePro')
    expect(html).toContain('INV-001')
    expect(html).toContain('Oil')
    expect(html).toContain('Filter')
    expect(html).toContain('456 Ave')
  })

  it('propagates variable updates', () => {
    const vars = {
      'workshop.companyName': 'A',
      'document.number': '1',
      'document.date': '2025-01-01',
      'customer.name': 'X',
      'customer.address': 'Y',
      'workshop.footerAddress': 'Z'
    }
    const html1 = renderVariableTemplate(tpl, vars, { 'document.lines': [] })
    expect(html1).toContain('A')
    const html2 = renderVariableTemplate(tpl, { ...vars, 'workshop.companyName': 'B' }, { 'document.lines': [] })
    expect(html2).toContain('B')
  })
})

