import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Calendar } from 'lucide-react'
import { customersApi, deliveriesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { deliveryStatusBadge } from '../../components/ui/Badge'
import type { CustomerDto } from '../../api/types'

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function firstOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

type Preset = { key: string; label: string; from: () => Date; to: () => Date }

const PRESETS: Preset[] = [
  { key: 'this-month', label: 'Ce mois',
    from: () => firstOfMonth(new Date()), to: () => new Date() },
  { key: 'last-month', label: 'Mois dernier',
    from: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return firstOfMonth(d) },
    to: () => { const d = new Date(); d.setDate(0); return d } },
  { key: 'last-30d', label: '30 derniers jours',
    from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d },
    to: () => new Date() },
  { key: 'this-year', label: 'Année en cours',
    from: () => new Date(new Date().getFullYear(), 0, 1), to: () => new Date() },
]

export function DeliveriesPage() {
  const [dateFrom, setDateFrom] = useState(toIsoDate(firstOfMonth(new Date())))
  const [dateTo, setDateTo] = useState(toIsoDate(new Date()))
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [customers, setCustomers] = useState<CustomerDto[]>([])

  useEffect(() => {
    customersApi.getForSelect().then(setCustomers).catch(() => setCustomers([]))
  }, [])

  const fetcher = useCallback(
    (page: number, size: number) => deliveriesApi.getAll({
      page, size,
      customerId: customerId === '' ? undefined : customerId,
      dateFrom, dateTo,
    }),
    [customerId, dateFrom, dateTo],
  )
  const { data, loading, page, setPage } = usePagedData({ fetcher })

  const activePresetKey = useMemo(() => {
    for (const p of PRESETS) {
      if (toIsoDate(p.from()) === dateFrom && toIsoDate(p.to()) === dateTo) return p.key
    }
    return null
  }, [dateFrom, dateTo])

  function applyPreset(p: Preset) {
    setDateFrom(toIsoDate(p.from()))
    setDateTo(toIsoDate(p.to()))
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
          <Calendar size={16} className="text-brand-500" />
          Période
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <span className="text-sm text-gray-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border
                ${activePresetKey === p.key
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <label className="text-sm text-gray-600 font-medium">Client</label>
          <select
            value={customerId}
            onChange={e => setCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Tous</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          {data ? `${data.totalCount} livraison(s)` : ''}
        </div>
      </div>

      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucune livraison sur cette période."
        columns={[
          { key: 'reference', header: 'Référence', render: r => <span className="font-mono font-semibold text-gray-900">{r.reference}</span> },
          { key: 'deliveryDate', header: 'Date', width: 'w-28', render: r => <span className="text-sm">{new Date(r.deliveryDate).toLocaleDateString('fr-FR')}</span> },
          { key: 'customerName', header: 'Client', render: r => r.customerName ?? <span className="text-gray-300">—</span> },
          { key: 'invoiceReference', header: 'Facture', render: r => <span className="font-mono text-sm text-brand-600">{r.invoiceReference ?? '—'}</span> },
          { key: 'status', header: 'Statut', width: 'w-32', render: r => deliveryStatusBadge(r.status) },
          { key: 'recipientName', header: 'Destinataire', render: r => r.recipientName ?? <span className="text-gray-300">—</span> },
          { key: 'carrierName', header: 'Transporteur', render: r => r.carrierName ?? <span className="text-gray-300">—</span> },
          { key: 'lines', header: 'Lignes', width: 'w-16', render: r => <span className="text-sm text-gray-600">{r.lines?.length ?? 0}</span> },
        ]}
        actions={() => (
          <button title="Voir détail" className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
            <Eye size={14} />
          </button>
        )}
      />
      {data && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}
    </div>
  )
}
