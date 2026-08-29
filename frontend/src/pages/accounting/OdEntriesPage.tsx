import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus, Search, X, Paperclip, Link2 } from 'lucide-react'
import type { JournalEntryDto } from '../../api/types'
import { accountingApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'

const sourceLabel: Record<string, string> = {
  Manual: 'Saisie manuelle',
  PurchaseCharge: 'Rattachée à un arrivage',
  PurchaseArrival: 'Arrivage fournisseur',
}

const xof = (v: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(v) + ' XOF'
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const inputClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

function ExpandedEntry({ entry }: { entry: JournalEntryDto }) {
  const totalDebit = entry.lines.reduce((s, l) => s + l.debitAmount, 0)
  const totalCredit = entry.lines.reduce((s, l) => s + l.creditAmount, 0)
  return (
    <div className="px-4 pb-4 pt-2 bg-gray-50/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 font-medium uppercase tracking-wide">
            <th className="text-left py-1.5 w-20">Compte</th>
            <th className="text-left py-1.5">Libellé</th>
            <th className="text-right py-1.5 w-36">Débit</th>
            <th className="text-right py-1.5 w-36">Crédit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entry.lines.map(l => (
            <tr key={l.id}>
              <td className="py-1.5"><span className="font-mono text-brand-700">{l.accountCode}</span></td>
              <td className="py-1.5 text-gray-600">{l.label ?? l.accountName}</td>
              <td className="py-1.5 text-right font-medium text-gray-800">{l.debitAmount > 0 ? xof(l.debitAmount) : ''}</td>
              <td className="py-1.5 text-right font-medium text-gray-800">{l.creditAmount > 0 ? xof(l.creditAmount) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-200 font-semibold text-gray-700">
          <tr>
            <td colSpan={2} className="py-1.5 text-xs uppercase text-gray-400">Total</td>
            <td className="py-1.5 text-right">{xof(totalDebit)}</td>
            <td className="py-1.5 text-right">{xof(totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
      {entry.attachmentFileName && (
        <div className="mt-2 flex items-center gap-2 text-xs text-brand-600">
          <Paperclip size={12} />
          <span>{entry.attachmentFileName}</span>
        </div>
      )}
      {entry.sourceType === 'PurchaseCharge' && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
          <Link2 size={11} />
          Cette écriture est rattachée à un arrivage — elle alimente le prix de revient.
        </div>
      )}
    </div>
  )
}

export function OdEntriesPage() {
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetcher = useCallback(
    (p: number, s: number) =>
      accountingApi.getJournal({
        page: p, size: s,
        journalCode: 'JOD',
        from: from || undefined,
        to: to || undefined,
        search: search || undefined,
      }),
    [from, to, search],
  )
  const { data, loading, page, setPage } = usePagedData({ fetcher })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{data ? `${data.totalCount} opération(s) diverse(s)` : ''}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Saisir ici les charges hors-achats (douane, fret, transport…) — elles peuvent être rattachées à un arrivage pour calculer le prix de revient réel.
          </p>
        </div>
        <Button onClick={() => navigate('/accounting/od/new')} icon={<Plus size={15} />}>
          Nouvelle OD
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Référence, description…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className={`${inputClass} pl-9 w-full`}
          />
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputClass} title="Depuis" />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputClass} title="Jusqu'au" />
        </div>
        {(from || to || searchInput) && (
          <button
            onClick={() => { setFrom(''); setTo(''); setSearchInput(''); setSearch('') }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={14} /> Effacer
          </button>
        )}
      </div>

      <DataTable
        rows={data?.items ?? []}
        loading={loading}
        keyExtractor={r => r.id}
        emptyMessage="Aucune opération diverse."
        columns={[
          {
            key: 'entryDate', header: 'Date', width: 'w-28',
            render: r => <span className="text-sm text-gray-600">{fmtDate(r.entryDate)}</span>,
          },
          {
            key: 'reference', header: 'Référence',
            render: r => (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded">
                  {r.reference}
                </span>
                {r.sourceType === 'PurchaseCharge' && (
                  <span title="Rattachée à un arrivage" className="text-amber-500"><Link2 size={12} /></span>
                )}
                {r.attachmentFileName && <Paperclip size={11} className="text-gray-400" />}
              </div>
            ),
          },
          {
            key: 'description', header: 'Description',
            render: r => (
              <div>
                <p className="text-sm text-gray-800">{r.description}</p>
                <p className="text-xs text-gray-400">{sourceLabel[r.sourceType] ?? r.sourceType}</p>
              </div>
            ),
          },
          {
            key: 'debit', header: 'Montant', width: 'w-36',
            render: r => (
              <span className="text-sm font-medium text-gray-700">
                {xof(r.lines.reduce((s, l) => s + l.debitAmount, 0))}
              </span>
            ),
          },
        ]}
        actions={row => (
          <button
            onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Voir les lignes"
          >
            {expanded === row.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      />

      {(data?.items ?? []).filter(r => r.id === expanded).map(r => (
        <div key={r.id} className="rounded-xl border border-orange-100 bg-white shadow-sm -mt-3">
          <div className="px-4 py-2 text-xs font-semibold text-orange-700 border-b border-orange-100">
            OD {r.reference} — {fmtDate(r.entryDate)}
          </div>
          <ExpandedEntry entry={r} />
        </div>
      ))}

      {data && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
