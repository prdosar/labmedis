import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Eye, Plus, RotateCcw } from 'lucide-react'
import { invoicesApi, customerCreditNotesApi } from '../../api/endpoints'
import type { InvoiceDto, CustomerCreditNoteDto } from '../../api/types'
import { DataTable } from '../../components/ui/DataTable'
import { invoiceStatusBadge } from '../../components/ui/Badge'
import { useToast } from '../../contexts/ToastContext'

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
  { value: 'Draft', label: 'Brouillon' },
  { value: 'Issued', label: 'Émise' },
  { value: 'PartiallyPaid', label: 'Part. payée' },
  { value: 'Paid', label: 'Payée' },
  { value: 'Cancelled', label: 'Annulée' },
]

const STATUS_AVOIR = [
  { value: '', label: 'Tous les statuts' },
  { value: 'EnAttente', label: 'En attente' },
  { value: 'DéduitDeFacture', label: 'Déduit de facture' },
  { value: 'Remboursé', label: 'Remboursé' },
  { value: 'Annulé', label: 'Annulé' },
]

const inputCls =
  'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white'

type Tab = 'invoices' | 'avoirs'

export function CustomerInvoicesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('invoices')

  // Invoices
  const [invoices, setInvoices] = useState<InvoiceDto[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  // Avoirs
  const [avoirs, setAvoirs] = useState<CustomerCreditNoteDto[]>([])
  const [loadingAvoirs, setLoadingAvoirs] = useState(true)

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(startOfMonth)
  const [dateTo, setDateTo] = useState(endOfMonth)
  const [statusInvoice, setStatusInvoice] = useState('')
  const [statusAvoir, setStatusAvoir] = useState('')

  useEffect(() => {
    invoicesApi.getAll(1, 500)
      .then(r => setInvoices(r.items))
      .finally(() => setLoadingInvoices(false))
  }, [])

  useEffect(() => {
    customerCreditNotesApi.getAll({ size: 500 })
      .then(r => setAvoirs(r.items))
      .finally(() => setLoadingAvoirs(false))
  }, [])

  const invoiceRows = useMemo(() => invoices.filter(inv => {
    const d = inv.invoiceDate.slice(0, 10)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    if (statusInvoice && inv.status !== statusInvoice) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(inv.customerName ?? '').toLowerCase().includes(q) && !inv.reference.toLowerCase().includes(q)) return false
    }
    return true
  }), [invoices, search, dateFrom, dateTo, statusInvoice])

  const avoirRows = useMemo(() => avoirs.filter(a => {
    const d = a.creditNoteDate.slice(0, 10)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    if (statusAvoir && a.status !== statusAvoir) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.customerName.toLowerCase().includes(q) && !a.reference.toLowerCase().includes(q)) return false
    }
    return true
  }), [avoirs, search, dateFrom, dateTo, statusAvoir])

  const pendingAvoirs = avoirs.filter(a => a.status === 'EnAttente').length
  const pendingAvoirAmount = avoirs.filter(a => a.status === 'EnAttente').reduce((s, a) => s + a.totalAmountTtc, 0)

  function reset() {
    setSearch('')
    setDateFrom(startOfMonth())
    setDateTo(endOfMonth())
    setStatusInvoice('')
    setStatusAvoir('')
  }

  async function handleAvoirStatusChange(avoir: CustomerCreditNoteDto, newStatus: string) {
    try {
      const updated = await customerCreditNotesApi.updateStatus(avoir.id, newStatus)
      setAvoirs(prev => prev.map(a => a.id === updated.id ? updated : a))
      toast('Statut mis à jour.')
    } catch {
      toast('Erreur lors de la mise à jour.', 'error')
    }
  }

  async function handleApplyToInvoice(avoir: CustomerCreditNoteDto) {
    try {
      const updated = await customerCreditNotesApi.applyToInvoice(avoir.id)
      setAvoirs(prev => prev.map(a => a.id === updated.id ? updated : a))
      setInvoices(prev => prev.map(inv => {
        if (inv.id === avoir.invoiceId) {
          return { ...inv, amountPaid: inv.amountPaid + avoir.totalAmountTtc, balanceDue: inv.balanceDue - avoir.totalAmountTtc }
        }
        return inv
      }))
      toast('Avoir déduit de la facture.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur.'
      toast(msg, 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs + action */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('invoices')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'invoices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Factures clients
          </button>
          <button
            onClick={() => setTab('avoirs')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'avoirs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Avoirs clients
            {pendingAvoirs > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingAvoirs}</span>
            )}
          </button>
        </div>
        {tab === 'avoirs' && (
          <button
            onClick={() => navigate('/invoices/customers/credit-notes/new')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus size={15} /> Nouveau retour client
          </button>
        )}
        {tab === 'avoirs' && pendingAvoirs > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <RotateCcw size={14} />
            <span className="font-semibold">{pendingAvoirs} avoir(s) en attente</span>
            <span className="text-amber-500">·</span>
            <span>{fmtXof(pendingAvoirAmount)} à traiter</span>
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
              placeholder="Client, référence…" className={`w-full pl-8 pr-3 ${inputCls}`} />
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
          <p className="text-sm text-gray-500">{loadingInvoices ? '' : `${invoiceRows.length} facture(s)`}</p>
          <DataTable
            rows={invoiceRows}
            loading={loadingInvoices}
            keyExtractor={r => r.id}
            emptyMessage="Aucune facture pour cette période."
            columns={[
              { key: 'reference', header: 'Référence', render: r => <span className="font-mono font-semibold text-gray-900">{r.reference}</span> },
              { key: 'invoiceDate', header: 'Date', width: 'w-28', render: r => <span className="text-sm">{fmtDate(r.invoiceDate)}</span> },
              { key: 'customerName', header: 'Client', render: r => <span className="font-medium">{r.customerName ?? '—'}</span> },
              { key: 'status', header: 'Statut', width: 'w-32', render: r => invoiceStatusBadge(r.status) },
              { key: 'totalTtc', header: 'Total TTC', width: 'w-36', render: r => <span className="font-semibold text-gray-900">{fmtXof(r.totalTtc)}</span> },
              { key: 'amountPaid', header: 'Encaissé', width: 'w-32', render: r => <span className="font-medium text-green-600">{fmtXof(r.amountPaid)}</span> },
              { key: 'balanceDue', header: 'Solde dû', width: 'w-32', render: r => <span className={r.balanceDue > 0 ? 'font-semibold text-red-600' : 'font-medium text-gray-400'}>{fmtXof(r.balanceDue)}</span> },
              {
                key: 'pct', header: '%', width: 'w-20',
                render: r => {
                  const pct = r.totalTtc > 0 ? Math.round((r.amountPaid / r.totalTtc) * 100) : 0
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
              <button title="Voir détail" onClick={() => navigate(`/invoices/customers/${r.id}`)}
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
          <p className="text-sm text-gray-500">{loadingAvoirs ? '' : `${avoirRows.length} avoir(s) client`}</p>
          <DataTable
            rows={avoirRows}
            loading={loadingAvoirs}
            keyExtractor={r => r.id}
            emptyMessage="Aucun avoir client pour cette période."
            columns={[
              { key: 'reference', header: 'Référence avoir', render: r => <span className="font-mono font-semibold text-amber-700">{r.reference}</span> },
              { key: 'customerName', header: 'Client', render: r => <span className="font-medium">{r.customerName}</span> },
              {
                key: 'invoiceReference', header: 'Facture liée',
                render: r => r.invoiceReference
                  ? <button onClick={() => r.invoiceId && navigate(`/invoices/customers/${r.invoiceId}`)}
                      className="font-mono text-brand-600 hover:underline text-sm">
                      {r.invoiceReference}
                    </button>
                  : <span className="text-gray-400 text-xs">—</span>,
              },
              { key: 'creditNoteDate', header: 'Date', width: 'w-28', render: r => <span className="text-sm">{fmtDate(r.creditNoteDate)}</span> },
              { key: 'totalAmountTtc', header: 'Montant TTC', width: 'w-36', render: r => <span className="font-semibold text-amber-700">{fmtXof(r.totalAmountTtc)}</span> },
              {
                key: 'status', header: 'Statut', width: 'w-44',
                render: r => (
                  <select value={r.status} onChange={e => handleAvoirStatusChange(r, e.target.value)}
                    className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500
                      ${r.status === 'EnAttente' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                        r.status === 'DéduitDeFacture' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                        r.status === 'Remboursé' ? 'border-green-300 bg-green-50 text-green-700' :
                        'border-gray-200 bg-gray-50 text-gray-400'}`}>
                    <option value="EnAttente">En attente</option>
                    <option value="DéduitDeFacture">Déduit de facture</option>
                    <option value="Remboursé">Remboursé</option>
                    <option value="Annulé">Annulé</option>
                  </select>
                ),
              },
            ]}
            actions={r => (
              <div className="flex items-center gap-1">
                {r.status === 'EnAttente' && r.invoiceId && (
                  <button title="Déduire de la facture" onClick={() => handleApplyToInvoice(r)}
                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium">
                    Déduire
                  </button>
                )}
                <button title="Voir détail" onClick={() => navigate(`/invoices/customers/credit-notes/${r.id}`)}
                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                  <Eye size={14} />
                </button>
              </div>
            )}
          />
        </>
      )}
    </div>
  )
}
