import { useState, useCallback } from 'react'
import { Scale, Calendar } from 'lucide-react'
import type { TrialBalanceLineDto } from '../../api/types'
import { accountingApi } from '../../api/endpoints'
import { fmtNum } from '../../utils/format'

const classLabel: Record<string, string> = {
  Asset: 'Actif',
  Liability: 'Passif',
  Equity: 'Capitaux',
  Income: 'Produits',
  Expense: 'Charges',
  ThirdParty: 'Tiers',
}

const classBadge: Record<string, string> = {
  Asset: 'bg-blue-50 text-blue-700',
  Liability: 'bg-purple-50 text-purple-700',
  Equity: 'bg-indigo-50 text-indigo-700',
  Income: 'bg-green-50 text-green-700',
  Expense: 'bg-red-50 text-red-700',
  ThirdParty: 'bg-orange-50 text-orange-700',
}

const inputClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

const fmt = (n: number) => fmtNum(n)

export function TrialBalancePage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [lines, setLines] = useState<TrialBalanceLineDto[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    accountingApi.getTrialBalance(from || undefined, to || undefined)
      .then(data => { setLines(data); setLoaded(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [from, to])

  const grouped = lines.reduce<Record<string, TrialBalanceLineDto[]>>((acc, l) => {
    if (!acc[l.accountClass]) acc[l.accountClass] = []
    acc[l.accountClass].push(l)
    return acc
  }, {})

  const classOrder = ['Asset', 'Liability', 'Equity', 'ThirdParty', 'Expense', 'Income']
  const totalDebit = lines.reduce((s, l) => s + l.totalDebit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.totalCredit, 0)

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
          <Scale size={14} />
          {loading ? 'Chargement…' : 'Générer la balance'}
        </button>
      </div>

      {!loaded && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Scale size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez une période et cliquez sur "Générer la balance"</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {loaded && !loading && (
        <div className="flex flex-col gap-4">
          {classOrder.filter(cls => grouped[cls]?.length).map(cls => (
            <div key={cls} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${classBadge[cls] ?? 'bg-gray-100 text-gray-600'}`}>
                  {classLabel[cls] ?? cls}
                </span>
                <span className="text-xs text-gray-400">{grouped[cls].length} comptes</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Code</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Intitulé</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Débit (XOF)</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Crédit (XOF)</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Solde (XOF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grouped[cls].map(l => (
                    <tr key={l.accountId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-2.5">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-50 text-gray-600">{l.accountCode}</span>
                      </td>
                      <td className="px-5 py-2.5 text-gray-700">{l.accountName}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-xs text-blue-700">
                        {l.totalDebit > 0 ? fmt(l.totalDebit) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-xs text-orange-700">
                        {l.totalCredit > 0 ? fmt(l.totalCredit) : '—'}
                      </td>
                      <td className={`px-5 py-2.5 text-right font-mono text-xs font-semibold ${l.balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                        {fmt(Math.abs(l.balance))}{l.balance < 0 ? ' Cr' : l.balance > 0 ? ' Db' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Totals */}
          {lines.length > 0 && (
            <div className="bg-gray-900 text-white rounded-2xl px-5 py-4 flex items-center justify-between">
              <span className="font-semibold text-sm">Total général</span>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Débit total</p>
                  <p className="font-mono font-bold text-blue-300">{fmt(totalDebit)} XOF</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Crédit total</p>
                  <p className="font-mono font-bold text-orange-300">{fmt(totalCredit)} XOF</p>
                </div>
                <div className={`text-right ${Math.abs(totalDebit - totalCredit) < 1 ? '' : 'text-red-400'}`}>
                  <p className="text-xs text-gray-400 mb-0.5">Écart</p>
                  <p className="font-mono font-bold">{fmt(Math.abs(totalDebit - totalCredit))} XOF</p>
                </div>
              </div>
            </div>
          )}

          {lines.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">Aucun mouvement sur cette période.</p>
          )}
        </div>
      )}
    </div>
  )
}
