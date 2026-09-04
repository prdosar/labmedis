const UNITS = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
]

const TENS = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt',
]

function twoDigits(n: number): string {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t === 7 || t === 9) {
    const base = TENS[t]
    const rest = 10 + u
    if (t === 7 && u === 1) return `${base} et onze`
    return `${base}-${UNITS[rest]}`
  }
  if (u === 0) return t === 8 ? 'quatre-vingts' : TENS[t]
  if (u === 1 && t !== 8) return `${TENS[t]} et un`
  return `${TENS[t]}-${UNITS[u]}`
}

function threeDigits(n: number, plural: boolean): string {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const rest = n % 100
  const parts: string[] = []
  if (h === 1) parts.push('cent')
  else if (h > 1) parts.push(`${UNITS[h]} cent${rest === 0 && plural ? 's' : ''}`)
  if (rest > 0) parts.push(twoDigits(rest))
  return parts.join(' ')
}

export function nombreEnLettres(n: number): string {
  if (!Number.isFinite(n)) return ''
  n = Math.round(n)
  if (n === 0) return 'zéro'
  if (n < 0) return `moins ${nombreEnLettres(-n)}`

  const millions = Math.floor(n / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000

  const parts: string[] = []
  if (millions > 0) {
    if (millions === 1) parts.push('un million')
    else parts.push(`${threeDigits(millions, false)} millions`)
  }
  if (thousands > 0) {
    if (thousands === 1) parts.push('mille')
    else parts.push(`${threeDigits(thousands, false)} mille`)
  }
  if (rest > 0) {
    // Le pluriel de "vingts" / "cents" ne s'applique qu'en fin de nombre
    // (pas suivi d'un autre nombre).
    parts.push(threeDigits(rest, true))
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function montantXofEnLettres(n: number): string {
  return `${nombreEnLettres(n)} francs CFA`
}
