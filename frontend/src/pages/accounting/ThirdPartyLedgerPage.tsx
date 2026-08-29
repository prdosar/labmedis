import { useState, useEffect, useCallback } from 'react'
import { BookUser, Calendar, ChevronsUpDown } from 'lucide-react'
import type { ThirdPartyLedgerDto, SupplierDto, CustomerDto } from '../../api/types'
import { accountingApi, suppliersApi, customersApi } from '../../api/endpoints'
import { fmtXof } from '../../utils/format'

const inputClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
const selectClass = `${inputClass} pr-8 appearance-none cursor-pointer`

const fmt = fmtXof

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR')
}

export function ThirdPartyLedgerPage() {
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer')
  const [partyId, setPartyId] = useState<number | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [ledger, setLedger] = useState<ThirdPartyLedgerDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    customersApi.getForSelect().then(setCustomers).catch(() => {})
    suppliersApi.getForSelect().then(setSuppliers).catch(() => {})
  }, [])

  const load = useCallback(() => {
    if (!partyId) return
    setLoading(true)
    const call = partyType === 'customer'
      ? accountingApi.getCustomerLedger(partyId as number, from || undefined, to || undefined)
      : accountingApi.getSupplierLedger(partyId as number, from || undefined, to || undefined)
    call
      .then(d => { setLedger(d); setLoaded(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [partyType, partyId, from, to])

  const parties = partyType === 'customer' ? customers : suppliers
  const balanceColor = ledger
    ? (ledger.balance > 0 ? 'text-blue-700' : ledger.balance < 0 ? 'text-red-700' : 'text-gray-700')
    : 'text-gray-700'

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={partyType}
            onChange={e => { setPartyType(e.target.value as 'customer' | 'supplier'); setPartyId(''); setLedger(null); setLoaded(false) }}
            className={selectClass}
          >
            <option value="customer">Clients</option>
            <option value="supplier">Fournisseurs</option>
          </select>
          <ChevronsUpDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={partyId}
            onChange={e => setPartyId(e.target.value ? Number(e.target.value) : '')}
            className={selectClass + ' min-w-52'}
          >
            <option value="">— Sélectionner un tiers —</option>
            {parties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronsUpDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputClass} />
        </div>
        <span className="text-gray-400 text-sm">→</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputClass} />

        <button
          onClick={load}
          disabled={loading || !partyId}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          <BookUser size={14} />
          {loading ? 'Chargement…' : 'Afficher le grand livre'}
        </button>
      </div>

      {!loaded && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BookUser size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez un tiers et cliquez sur "Afficher le grand livre"</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {loaded && !loading && ledger && (
        <div className="flex flex-col gap-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-500 font-medium mb-1">Total débit</p>
              <p className="font-mono text-lg font-bold text-blue-700">{fmt(ledger.totalDebit)} XOF</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-500 font-medium mb-1">Total crédit</p>
              <p className="font-mono text-lg font-bold text-orange-700">{fmt(ledger.totalCredit)} XOF</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
              <p className="text-xs text-gray-500 font-medium mb-1">Solde</p>
              <p className={`font-mono text-lg font-bold ${balanceColor}`}>
                {fmt(Math.abs(ledger.balance))} XOF
                {ledger.balance > 0 && <span className="ml-1 text-xs font-normal">débiteur</span>}
                {ledger.balance < 0 && <span className="ml-1 text-xs font-normal">créditeur</span>}
              </p>
            </div>
          </div>

          {/* Entries table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
              <BookUser size={15} className="text-gray-400" />
              <span className="font-semibold text-sm text-gray-700">{ledger.thirdPartyName}</span>
              <span className="text-xs text-gray-400">{ledger.entries.length} écriture{ledger.entries.length !== 1 ? 's' : ''}</span>
            </div>

            {ledger.entries.length === 0 ? (
              <p className="px-5 py-10 text-sm text-gray-400 text-center">Aucune écriture sur cette période.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Date</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Journal</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Référence</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Libellé</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Débit</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Crédit</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Solde cumulé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ledger.entries.map((e, i) => (
                    <tr key={`${e.journalEntryId}-${i}`} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-2.5 text-gray-600 text-xs">{fmtDate(e.entryDate)}</td>
                      <td className="px-5 py-2.5">
                        <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{e.journalCode}</span>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="font-mono text-xs text-gray-600">{e.reference}</span>
                      </td>
                      <td className="px-5 py-2.5 text-gray-700">{e.description}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-xs text-blue-700">
                        {e.debitAmount > 0 ? fmt(e.debitAmount) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-xs text-orange-700">
                        {e.creditAmount > 0 ? fmt(e.creditAmount) : '—'}
                      </td>
                      <td className={`px-5 py-2.5 text-right font-mono text-xs font-semibold ${e.runningBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                        {fmt(Math.abs(e.runningBalance))}{e.runningBalance < 0 ? ' Cr' : e.runningBalance > 0 ? ' Db' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
