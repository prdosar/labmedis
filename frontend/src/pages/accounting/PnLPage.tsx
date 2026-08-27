import { useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import type { PnLDto } from '../../api/types'
import { accountingApi } from '../../api/endpoints'

const inputClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export function PnLPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<PnLDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    accountingApi.getPnL(from || undefined, to || undefined)
      .then(d => { setData(d); setLoaded(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [from, to])

  const isProfit = data ? data.netResult >= 0 : true

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputClass} />
        </div>
        <span className="text-gray-400 text-sm">→</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputClass} />
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          <TrendingUp size={14} />
          {loading ? 'Chargement…' : 'Générer le compte de résultat'}
        </button>
      </div>

      {!loaded && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <TrendingUp size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez une période et cliquez sur "Générer le compte de résultat"</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {loaded && !loading && data && (
        <div className="flex flex-col gap-5">
          {/* Net result banner */}
          <div className={`rounded-2xl px-6 py-5 flex items-center justify-between ${isProfit ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            <div className="flex items-center gap-3">
              {isProfit
                ? <TrendingUp size={24} />
                : <TrendingDown size={24} />
              }
              <div>
                <p className="text-sm font-medium opacity-80">{isProfit ? 'Résultat net (bénéfice)' : 'Résultat net (perte)'}</p>
                <p className="text-2xl font-bold font-mono">{fmt(Math.abs(data.netResult))} XOF</p>
              </div>
            </div>
            <div className="flex gap-8 text-right">
              <div>
                <p className="text-xs opacity-70 mb-0.5">Total produits</p>
                <p className="font-mono font-semibold">{fmt(data.totalIncome)} XOF</p>
              </div>
              <div>
                <p className="text-xs opacity-70 mb-0.5">Total charges</p>
                <p className="font-mono font-semibold">{fmt(data.totalExpenses)} XOF</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Income */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-green-50">
                <TrendingUp size={15} className="text-green-600" />
                <span className="text-sm font-semibold text-green-700">Produits (Classe 7)</span>
                <span className="ml-auto font-mono text-sm font-bold text-green-700">{fmt(data.totalIncome)} XOF</span>
              </div>
              {data.income.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucun produit sur la période</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Code</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Compte</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant (XOF)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.income.map(l => (
                      <tr key={l.accountId} className="hover:bg-gray-50/50">
                        <td className="px-5 py-2.5">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-green-50 text-green-700">{l.accountCode}</span>
                        </td>
                        <td className="px-5 py-2.5 text-gray-700">{l.accountName}</td>
                        <td className="px-5 py-2.5 text-right font-mono text-xs font-medium text-green-700">{fmt(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-green-50/50">
                      <td colSpan={2} className="px-5 py-2.5 text-sm font-semibold text-gray-700">Total produits</td>
                      <td className="px-5 py-2.5 text-right font-mono text-sm font-bold text-green-700">{fmt(data.totalIncome)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-red-50">
                <TrendingDown size={15} className="text-red-600" />
                <span className="text-sm font-semibold text-red-700">Charges (Classe 6)</span>
                <span className="ml-auto font-mono text-sm font-bold text-red-700">{fmt(data.totalExpenses)} XOF</span>
              </div>
              {data.expenses.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucune charge sur la période</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Code</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Compte</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant (XOF)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.expenses.map(l => (
                      <tr key={l.accountId} className="hover:bg-gray-50/50">
                        <td className="px-5 py-2.5">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700">{l.accountCode}</span>
                        </td>
                        <td className="px-5 py-2.5 text-gray-700">{l.accountName}</td>
                        <td className="px-5 py-2.5 text-right font-mono text-xs font-medium text-red-700">{fmt(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-red-50/50">
                      <td colSpan={2} className="px-5 py-2.5 text-sm font-semibold text-gray-700">Total charges</td>
                      <td className="px-5 py-2.5 text-right font-mono text-sm font-bold text-red-700">{fmt(data.totalExpenses)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
