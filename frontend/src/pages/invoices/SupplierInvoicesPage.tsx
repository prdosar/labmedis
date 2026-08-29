import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Eye } from 'lucide-react'
import { supplierOrdersApi } from '../../api/endpoints'
import type { SupplierInvoiceDto } from '../../api/types'
import { DataTable } from '../../components/ui/DataTable'

function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString('fr-FR') } catch { return s }
}

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function endOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'NonReglée', label: 'Non réglée' },
  { value: 'PartReglée', label: 'Part. réglée' },
  { value: 'Réglée', label: 'Réglée' },
]

const inputCls = 'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white'

function statusBadge(s: string) {
  if (s === 'Réglée') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Réglée</span>
  if (s === 'PartReglée') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Part. réglée</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Non réglée</span>
}

export function SupplierInvoicesPage() {
  const navigate = useNavigate()
  const [all, setAll] = useState<SupplierInvoiceDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(startOfMonth)
  const [dateTo, setDateTo] = useState(endOfMonth)
  const [status, setStatus] = useState('')

  useEffect(() => {
    supplierOrdersApi.getAllInvoices({ page: 1, size: 500 })
      .then(r => setAll(r.items))
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => all.filter(inv => {
    const d = String(inv.invoiceDate).slice(0, 10)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    if (status && inv.status !== status) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !inv.supplierName.toLowerCase().includes(q) &&
        !inv.invoiceReference.toLowerCase().includes(q)
      ) return false
    }
    return true
  }), [all, search, dateFrom, dateTo, status])

  function reset() {
    setSearch('')
    setDateFrom(startOfMonth())
    setDateTo(endOfMonth())
    setStatus('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Recherche</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Fournisseur, référence…" className={`w-full pl-8 pr-3 ${inputCls}`} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <X size={14} /> Réinitialiser
        </button>
      </div>

      <p className="text-sm text-gray-500">{loading ? '' : `${rows.length} facture(s) fournisseur`}</p>

      <DataTable
        rows={rows}
        loading={loading}
        keyExtractor={r => r.id}
        emptyMessage="Aucune facture fournisseur pour cette période."
        columns={[
          {
            key: 'invoiceReference', header: 'Référence',
            render: r => <span className="font-mono font-semibold text-gray-900">{r.invoiceReference}</span>,
          },
          {
            key: 'supplierName', header: 'Fournisseur',
            render: r => <span className="font-medium">{r.supplierName}</span>,
          },
          {
            key: 'invoiceDate', header: 'Date', width: 'w-28',
            render: r => <span className="text-sm">{fmtDate(String(r.invoiceDate))}</span>,
          },
          {
            key: 'status', header: 'Statut', width: 'w-32',
            render: r => statusBadge(r.status),
          },
          {
            key: 'netAmountXof', header: 'Total net', width: 'w-36',
            render: r => <span className="font-semibold text-gray-900">{fmtXof(r.netAmountXof)}</span>,
          },
          {
            key: 'amountPaid', header: 'Réglé', width: 'w-32',
            render: r => <span className="font-medium text-green-600">{fmtXof(r.amountPaid + r.advanceAmountXof)}</span>,
          },
          {
            key: 'balanceDue', header: 'Solde', width: 'w-32',
            render: r => (
              <span className={r.balanceDue > 0 ? 'font-semibold text-red-600' : 'font-medium text-gray-400'}>
                {fmtXof(r.balanceDue)}
              </span>
            ),
          },
          {
            key: 'pct', header: '%', width: 'w-24',
            render: r => {
              const pct = r.netAmountXof > 0
                ? Math.min(100, Math.round(((r.amountPaid + r.advanceAmountXof) / r.netAmountXof) * 100))
                : 0
              return (
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{pct}%</span>
                </div>
              )
            },
          },
        ]}
        actions={r => (
          <button title="Voir détail" onClick={() => navigate(`/invoices/suppliers/${r.id}`)}
            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
            <Eye size={14} />
          </button>
        )}
      />
    </div>
  )
}
