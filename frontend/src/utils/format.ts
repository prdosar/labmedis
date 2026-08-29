// Montant XOF arrondi, séparateurs de milliers, suffixe FCFA
export function fmtXof(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

// Montant en devise étrangère (EUR, USD, GBP…) avec 2 décimales
// Si currency === 'XOF', délègue à fmtXof
export function fmtForeign(n: number, currency: string): string {
  if (currency === 'XOF') return fmtXof(n)
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }
}

// Nombre brut avec séparateurs (pour taux, coefficients, quantités)
export function fmtNum(n: number, decimals = 0): string {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
