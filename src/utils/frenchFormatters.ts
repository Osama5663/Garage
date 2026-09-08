export function formatFrenchNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n).replace(/\s/g, ' ')
}

export function formatEuroAmount(n: number): string {
  return formatFrenchNumber(n) + ' MAD'
}

export function formatFrenchDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('fr-FR')
}

export const frenchLabels = {
  invoice: 'FACTURE',
  deliveryNote: 'BON DE LIVRAISON',
  estimate: 'DEVIS',
  workOrder: 'ORDRE DE RÉPARATION',
  customer: 'CLIENT',
  vehicle: 'VÉHICULE',
  quantity: 'Qté',
  unitPriceHT: 'PU HT',
  discount: 'Remise',
  amountHT: 'Montant HT',
  subTotalHT: 'Sous-total HT',
  totalTVA: 'Total TVA',
  totalTTC: 'Total TTC',
  deposit: 'Acompte',
  remaining: 'Reste à payer'
} as const