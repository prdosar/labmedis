import { useEffect, useState } from 'react'
import { BookOpen, Search, X } from 'lucide-react'
import type { ChartAccountDto } from '../../api/types'
import { accountingApi } from '../../api/endpoints'

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

const searchInputClass = 'rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartAccountDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    accountingApi.getChartOfAccounts()
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = accounts.filter(a =>
    a.code.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase()),
  )

  const grouped = filtered.reduce<Record<string, ChartAccountDto[]>>((acc, a) => {
    const cls = a.accountClass
    if (!acc[cls]) acc[cls] = []
    acc[cls].push(a)
    return acc
  }, {})

  const classOrder = ['Asset', 'Liability', 'Equity', 'ThirdParty', 'Expense', 'Income']

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{accounts.length} comptes SYSCOHADA</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher un compte…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={searchInputClass}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
            <X size={13} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {classOrder.filter(cls => grouped[cls]?.length).map(cls => (
            <div key={cls} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <BookOpen size={15} className="text-gray-400" />
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
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Sens</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Tiers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grouped[cls].map(a => (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-2.5">
                        <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${a.parentCode ? 'bg-gray-50 text-gray-600' : 'bg-brand-50 text-brand-700'}`}>{a.code}</span>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`text-gray-800 ${a.parentCode ? 'pl-4 text-gray-500' : 'font-medium'}`}>{a.parentCode ? '↳ ' : ''}{a.name}</span>
                        {a.isSystem && <span className="ml-2 text-xs text-gray-300">système</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`text-xs font-medium ${a.normalBalance === 'Debit' ? 'text-blue-600' : 'text-orange-600'}`}>
                          {a.normalBalance === 'Debit' ? 'Débit' : 'Crédit'}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        {a.isThirdParty && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">Tiers</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
