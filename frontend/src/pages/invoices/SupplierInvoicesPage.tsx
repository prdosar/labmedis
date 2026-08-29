import { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { supplierOrdersApi } from '../../api/endpoints'
import type { SupplierOrderSummaryDto } from '../../api/types'
import { DataTable } from '../../components/ui/DataTable'
import { supplierOrderStatusBadge } from '../../components/ui/Badge'

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
  { value: 'Brouillon', label: 'Brouillon' },
  { value: 'Envoyée', label: 'Envoyée' },
  { value: 'ProformaReçue', label: 'Proforma reçue' },
  { value: 'Convertie', label: 'Convertie' },
  { value: 'Annulée', label: 'Annulée' },
]

const inputCls =
  'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white'

export function SupplierInvoicesPage() {
  const [all, setAll] = useState<SupplierOrderSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(startOfMonth)
  const [dateTo, setDateTo] = useState(endOfMonth)
  const [status, setStatus] = useState('')

  useEffect(() => {
    supplierOrdersApi.getAll({ page: 1, size: 500 })
      .then(r => setAll(r.items))
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => all.filter(order => {
    const d = order.orderDate.slice(0, 10)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    if (status && order.status !== status) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !order.supplierName.toLowerCase().includes(q) &&
        !order.reference.toLowerCase().includes(q)
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
      {/* Barre de filtres */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Recherche</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Fournisseur, référence…"
              className={`w-full pl-8 pr-3 ${inputCls}`}
            />
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
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={14} /> Réinitialiser
        </button>
      </div>

      <p className="text-sm text-gray-500">{loading ? '' : `${rows.length} commande(s) fournisseur`}</p>

      <DataTable
        rows={rows}
        loading={loading}
        keyExtractor={r => r.id}
        emptyMessage="Aucune facture fournisseur pour cette période."
        columns={[
          {
            key: 'reference', header: 'Référence',
            render: r => <span className="font-mono font-semibold text-gray-900">{r.reference}</span>,
          },
          {
            key: 'supplierName', header: 'Fournisseur',
            render: r => <span className="font-medium">{r.supplierName}</span>,
          },
          {
            key: 'orderDate', header: 'Date', width: 'w-28',
            render: r => <span className="text-sm">{new Date(r.orderDate).toLocaleDateString('fr-FR')}</span>,
          },
          {
            key: 'status', header: 'Statut', width: 'w-36',
            render: r => supplierOrderStatusBadge(r.status),
          },
          {
            key: 'currency', header: 'Devise', width: 'w-24',
            render: r => <span className="text-sm font-medium text-gray-700">{r.currency}</span>,
          },
          {
            key: 'lineCount', header: 'Articles', width: 'w-24',
            render: r => <span className="text-sm text-gray-600">{r.lineCount} ligne(s)</span>,
          },
        ]}
      />
    </div>
  )
}
