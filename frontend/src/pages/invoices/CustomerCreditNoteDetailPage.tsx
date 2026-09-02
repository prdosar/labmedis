import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, CheckCircle, RotateCcw } from 'lucide-react'
import { customerCreditNotesApi } from '../../api/endpoints'
import type { CustomerCreditNoteDto } from '../../api/types'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'

function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString('fr-FR') } catch { return s }
}

function statusBadge(s: string) {
  if (s === 'DéduitDeFacture') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><CheckCircle size={10}/>Déduit de facture</span>
  if (s === 'Remboursé') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle size={10}/>Remboursé</span>
  if (s === 'Annulé') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">Annulé</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><RotateCcw size={10}/>En attente</span>
}

const STATUS_OPTIONS = [
  { value: 'EnAttente', label: 'En attente' },
  { value: 'DéduitDeFacture', label: 'Déduit de facture' },
  { value: 'Remboursé', label: 'Remboursé' },
  { value: 'Annulé', label: 'Annulé' },
]

export function CustomerCreditNoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [avoir, setAvoir] = useState<CustomerCreditNoteDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    if (!id) return
    customerCreditNotesApi.getById(Number(id))
      .then(a => { setAvoir(a); setNewStatus(a.status) })
      .catch(() => toast('Avoir introuvable.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleStatusChange() {
    if (!avoir || newStatus === avoir.status) return
    try {
      const updated = await customerCreditNotesApi.updateStatus(avoir.id, newStatus)
      setAvoir(updated)
      toast('Statut mis à jour.')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    }
  }

  async function handleApplyToInvoice() {
    if (!avoir) return
    setApplying(true)
    try {
      const updated = await customerCreditNotesApi.applyToInvoice(avoir.id)
      setAvoir(updated)
      setNewStatus(updated.status)
      toast('Avoir déduit de la facture.')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-40 text-sm text-gray-500">Chargement…</div>
  if (!avoir) return <div className="flex items-center justify-center h-40 text-sm text-red-500">Avoir introuvable.</div>

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices/customers')}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-base font-semibold text-gray-900">Avoir client {avoir.reference}</h2>
        {statusBadge(avoir.status)}
      </div>

      {/* Header info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 md:grid-cols-3 gap-5">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Client</p>
          <p className="text-sm font-semibold text-gray-900">{avoir.customerName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Date</p>
          <p className="text-sm text-gray-700">{fmtDate(avoir.creditNoteDate)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Facture liée</p>
          {avoir.invoiceId ? (
            <button onClick={() => navigate(`/invoices/customers/${avoir.invoiceId}`)}
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              {avoir.invoiceReference} <ExternalLink size={12} />
            </button>
          ) : <p className="text-sm text-gray-400">—</p>}
        </div>
        {avoir.notes && (
          <div className="col-span-2 md:col-span-3">
            <p className="text-xs text-gray-400 font-medium mb-0.5">Notes</p>
            <p className="text-sm text-gray-700">{avoir.notes}</p>
          </div>
        )}
      </div>

      {/* Lines */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Produits retournés</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '700px' }}>
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">Produit</th>
                <th className="px-4 py-2.5 text-left">Magasin</th>
                <th className="px-4 py-2.5 text-left">N° Lot</th>
                <th className="px-4 py-2.5 text-right">Qté</th>
                <th className="px-4 py-2.5 text-right">Prix u. HT</th>
                <th className="px-4 py-2.5 text-right">TVA</th>
                <th className="px-4 py-2.5 text-right">Total TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {avoir.lines.map(l => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-gray-900">{l.productDesignation ?? l.productCode ?? `#${l.productId}`}</span>
                    {l.productCode && <span className="text-xs text-gray-400 ml-1">({l.productCode})</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{l.warehouseName ?? `#${l.warehouseId}`}</td>
                  <td className="px-4 py-2.5 text-gray-500">{l.lotNumber ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-800">{l.quantityReturned}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{fmtXof(l.unitPriceHt)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{l.tvaRate}%</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-amber-700">{fmtXof(l.lineTotalTtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 bg-amber-50 border-t border-amber-100 flex justify-end">
          <div className="flex flex-col gap-1 text-sm min-w-48">
            <div className="flex justify-between text-gray-600">
              <span>Total HT</span><span className="font-medium">{fmtXof(avoir.totalAmountHt)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>TVA</span><span className="font-medium">{fmtXof(avoir.totalTva)}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold border-t border-amber-200 pt-1 mt-1">
              <span>Total TTC</span><span className="text-amber-700">{fmtXof(avoir.totalAmountTtc)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {avoir.status === 'EnAttente' && (
        <div className="bg-white border border-amber-200 rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-amber-800">Traitement de l'avoir</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Changer le statut</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <Button variant="secondary" onClick={handleStatusChange}
              disabled={newStatus === avoir.status}>
              Enregistrer statut
            </Button>
            {avoir.invoiceId && (
              <Button onClick={handleApplyToInvoice} loading={applying}>
                Déduire de la facture {avoir.invoiceReference}
              </Button>
            )}
          </div>
          {!avoir.invoiceId && (
            <p className="text-xs text-gray-500">Cet avoir n'est pas lié à une facture. Pour rembourser, changez le statut à « Remboursé ».</p>
          )}
        </div>
      )}

      {avoir.resolvedAt && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircle size={15} />
          <span>Avoir traité le {fmtDate(avoir.resolvedAt)}</span>
        </div>
      )}
    </div>
  )
}
