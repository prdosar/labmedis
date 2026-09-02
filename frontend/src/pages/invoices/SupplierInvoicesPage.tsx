import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Eye } from 'lucide-react'
import { supplierOrdersApi } from '../../api/endpoints'
import type { SupplierCreditNoteDto, SupplierInvoiceDto } from '../../api/types'
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

const STATUS_INVOICE = [
  { value: '', label: 'Tous les statuts' },
  { value: 'NonReglée', label: 'Non réglée' },
  { value: 'PartReglée', label: 'Part. réglée' },
  { value: 'Réglée', label: 'Réglée' },
]

const STATUS_AVOIR = [
  { value: '', label: 'Tous les statuts' },
  { value: 'EnAttente', label: 'En attente' },
  { value: 'AvoirReçu', label: 'Avoir reçu' },
  { value: 'Remboursé', label: 'Remboursé' },
  { value: 'Remplacé', label: 'Remplacé' },
  { value: 'Annulé', label: 'Annulé' },
]

const inputCls = 'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white'

function invoiceStatusBadge(s: string) {
  if (s === 'Réglée') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Réglée</span>
  if (s === 'PartReglée') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Part. réglée</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Non réglée</span>
}


type Tab = 'invoices' | 'avoirs'

export function SupplierInvoicesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('invoices')

  // Invoices
  const [invoices, setInvoices] = useState<SupplierInvoiceDto[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  // Avoirs
  const [avoirs, setAvoirs] = useState<SupplierCreditNoteDto[]>([])
  const [loadingAvoirs, setLoadingAvoirs] = useState(true)

  // Filters (shared date range + search, status per tab)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(startOfMonth)
  const [dateTo, setDateTo] = useState(endOfMonth)
  const [statusInvoice, setStatusInvoice] = useState('')
  const [statusAvoir, setStatusAvoir] = useState('')

  useEffect(() => {
    supplierOrdersApi.getAllInvoices({ page: 1, size: 500 })
      .then(r => setInvoices(r.items))
      .finally(() => setLoadingInvoices(false))
    supplierOrdersApi.getAllCreditNotes({ page: 1, size: 500 })
      .then(r => setAvoirs(r.items))
      .finally(() => setLoadingAvoirs(false))
  }, [])

  // Filtered avoirs — also allow updating status inline
  async function handleAvoirStatusChange(av: SupplierCreditNoteDto, newStatus: string) {
    const updated = await supplierOrdersApi.updateCreditNoteStatus(av.id, newStatus)
    setAvoirs(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  const invoiceRows = useMemo(() => invoices.filter(inv => {
    const d = String(inv.invoiceDate).slice(0, 10)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    if (statusInvoice && inv.status !== statusInvoice) return false
    if (search) {
      const q = search.toLowerCase()
      if (!inv.supplierName.toLowerCase().includes(q) && !inv.invoiceReference.toLowerCase().includes(q)) return false
    }
    return true
  }), [invoices, search, dateFrom, dateTo, statusInvoice])

  const avoirRows = useMemo(() => avoirs.filter(av => {
    const d = av.creditNoteDate.slice(0, 10)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    if (statusAvoir && av.status !== statusAvoir) return false
    if (search) {
      const q = search.toLowerCase()
      if (!av.supplierName.toLowerCase().includes(q) && !av.reference.toLowerCase().includes(q)) return false
    }
    return true
  }), [avoirs, search, dateFrom, dateTo, statusAvoir])

  function reset() {
    setSearch('')
    setDateFrom(startOfMonth())
    setDateTo(endOfMonth())
    setStatusInvoice('')
    setStatusAvoir('')
  }

  // Stats
  const pendingAvoirs = avoirs.filter(a => a.status === 'EnAttente' || a.status === 'AvoirReçu').length
  const pendingAvoirAmount = avoirs
    .filter(a => a.status === 'EnAttente' || a.status === 'AvoirReçu')
    .reduce((s, a) => s + a.amountXof, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setTab('invoices')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'invoices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Factures fournisseurs
          </button>
          <button
            onClick={() => setTab('avoirs')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'avoirs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Avoirs fournisseurs
            {pendingAvoirs > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingAvoirs}</span>
            )}
          </button>
        </div>

        {/* Avoir pending alert */}
        {tab === 'avoirs' && pendingAvoirs > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <span className="font-semibold">{pendingAvoirs} avoir(s) en attente</span>
            <span className="text-amber-500">·</span>
            <span>{fmtXof(pendingAvoirAmount)} à récupérer</span>
          </div>
        )}
      </div>

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
          {tab === 'invoices'
            ? <select value={statusInvoice} onChange={e => setStatusInvoice(e.target.value)} className={inputCls}>
                {STATUS_INVOICE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            : <select value={statusAvoir} onChange={e => setStatusAvoir(e.target.value)} className={inputCls}>
                {STATUS_AVOIR.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
          }
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <X size={14} /> Réinitialiser
        </button>
      </div>

      {/* Invoice table */}
      {tab === 'invoices' && (
        <>
          <p className="text-sm text-gray-500">{loadingInvoices ? '' : `${invoiceRows.length} facture(s) fournisseur`}</p>
          <DataTable
            rows={invoiceRows}
            loading={loadingInvoices}
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
                render: r => invoiceStatusBadge(r.status),
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
        </>
      )}

      {/* Avoirs table */}
      {tab === 'avoirs' && (
        <>
          <p className="text-sm text-gray-500">{loadingAvoirs ? '' : `${avoirRows.length} avoir(s) fournisseur`}</p>
          <DataTable
            rows={avoirRows}
            loading={loadingAvoirs}
            keyExtractor={r => r.id}
            emptyMessage="Aucun avoir fournisseur pour cette période."
            columns={[
              {
                key: 'reference', header: 'Référence avoir',
                render: r => <span className="font-mono font-semibold text-amber-700">{r.reference}</span>,
              },
              {
                key: 'supplierName', header: 'Fournisseur',
                render: r => <span className="font-medium">{r.supplierName}</span>,
              },
              {
                key: 'invoiceReference', header: 'Facture liée',
                render: r => r.invoiceReference
                  ? <button
                      onClick={() => r.supplierInvoiceId && navigate(`/invoices/suppliers/${r.supplierInvoiceId}`)}
                      className="font-mono text-brand-600 hover:underline text-sm"
                    >
                      {r.invoiceReference}
                    </button>
                  : <span className="text-gray-400 text-xs">—</span>,
              },
              {
                key: 'creditNoteDate', header: 'Date', width: 'w-28',
                render: r => <span className="text-sm">{fmtDate(r.creditNoteDate)}</span>,
              },
              {
                key: 'lostBoxesCount', header: 'Boîtes perdues', width: 'w-28',
                render: r => <span className="font-mono text-red-600 font-semibold">{r.lostBoxesCount}</span>,
              },
              {
                key: 'amountXof', header: 'Montant (XOF)', width: 'w-36',
                render: r => <span className="font-semibold text-gray-900">{fmtXof(r.amountXof)}</span>,
              },
              {
                key: 'status', header: 'Statut', width: 'w-36',
                render: r => (
                  <select
                    value={r.status}
                    onChange={e => handleAvoirStatusChange(r, e.target.value)}
                    className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500
                      ${r.status === 'EnAttente' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                        r.status === 'AvoirReçu' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                        r.status === 'Remboursé' || r.status === 'Remplacé' ? 'border-green-300 bg-green-50 text-green-700' :
                        'border-gray-200 bg-gray-50 text-gray-400'
                      }`}
                  >
                    {STATUS_AVOIR.filter(o => o.value).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ),
              },
              {
                key: 'purchaseReference', header: 'Arrivage', width: 'w-32',
                render: r => <span className="font-mono text-xs text-gray-500">{r.purchaseReference}</span>,
              },
            ]}
          />
        </>
      )}
    </div>
  )
}
