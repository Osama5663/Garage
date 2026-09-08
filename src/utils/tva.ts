export type TVALine = {
  description: string
  unitPriceHT: number
  quantity: number
  rate: number // e.g., 0.20 or 0 for exempt
}

export const roundCurrency = (v: number) => {
  const sign = v < 0 ? -1 : 1
  const abs = Math.abs(v)
  return sign * Math.round(abs * 100) / 100
}

export const computeLineHT = (unitPriceHT: number, quantity: number) => {
  return roundCurrency((unitPriceHT || 0) * (quantity || 0))
}

export const computeLineTVA = (lineHT: number, rate: number) => {
  return roundCurrency((lineHT || 0) * (rate || 0))
}

export const computeTotals = (lines: TVALine[]) => {
  const breakdownByRate: Record<string, { baseHT: number; tva: number }> = {}
  let sousTotalHT = 0
  let tvaTotal = 0
  for (const line of lines) {
    const ht = computeLineHT(line.unitPriceHT, line.quantity)
    const tva = computeLineTVA(ht, line.rate)
    sousTotalHT += ht
    tvaTotal += tva
    const key = String(line.rate)
    const cur = breakdownByRate[key] || { baseHT: 0, tva: 0 }
    breakdownByRate[key] = { baseHT: roundCurrency(cur.baseHT + ht), tva: roundCurrency(cur.tva + tva) }
  }
  sousTotalHT = roundCurrency(sousTotalHT)
  tvaTotal = roundCurrency(tvaTotal)
  const totalTTC = roundCurrency(sousTotalHT + tvaTotal)
  return { sousTotalHT, tvaTotal, totalTTC, breakdownByRate }
}

