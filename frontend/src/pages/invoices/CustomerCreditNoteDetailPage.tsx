import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, CheckCircle, RotateCcw, Printer } from 'lucide-react'
import { customerCreditNotesApi, customersApi } from '../../api/endpoints'
import type { CustomerCreditNoteDto, CustomerDto } from '../../api/types'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { montantXofEnLettres } from '../../utils/numberToFrenchWords'
import logo from '../../assets/logo.png'

function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function fmtXofPlain(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n))
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

// ── Print layout ─────────────────────────────────────────────────────────────

function AvoirPrintLayout({ avoir, customer, printDate }: { avoir: CustomerCreditNoteDto; customer: CustomerDto | null; printDate: string }) {
  const creditDateStr = avoir.creditNoteDate
    ? new Date(avoir.creditNoteDate).toLocaleDateString('fr-FR')
    : printDate

  const cellHeader: React.CSSProperties = { border: '1px solid #333', padding: '4px 8px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }
  const cellBody: React.CSSProperties = { border: '1px solid #333', padding: '4px 8px', fontSize: '10pt' }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', padding: '15mm 15mm', color: '#000' }}>
      {/* Title bar */}
      <div style={{ textAlign: 'center', border: '1px solid #333', padding: '6px', marginBottom: '10px', fontWeight: 'bold', fontSize: '12pt' }}>
        FACTURE AVOIR N° {avoir.reference}
      </div>

      {/* Header : left = LabMedis identity + logo | right = client block */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <div style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <img src={logo} alt="LabMedis" style={{ height: '55px', objectFit: 'contain' }} />
          <div style={{ fontSize: '10pt', lineHeight: '1.4' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>LABMEDIS SARL</div>
            <div>380 Bd de la Kara</div>
            <div>08 BP 80859</div>
            <div>Tél : +228 92 26 99 33 / +228 72 14 08 47</div>
            <div style={{ marginTop: '4px' }}>RCCM : TG-LOM 2019 B2318</div>
            <div>NIF : 1001536704</div>
          </div>
        </div>

        <div style={{ width: '260px', border: '1px solid #333', padding: '6px 8px', fontSize: '9.5pt', lineHeight: '1.5' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', rowGap: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>Client</span>
            <span>: {customer?.name ?? avoir.customerName}</span>
            <span style={{ fontWeight: 'bold' }}>Adresse</span>
            <span>: {customer?.address ?? '—'}</span>
            <span style={{ fontWeight: 'bold' }}>BP</span>
            <span>: {customer?.postalBox ?? '—'}{customer?.city ? ` ${customer.city}` : ''}</span>
            <span style={{ fontWeight: 'bold' }}>Tél</span>
            <span>: {customer?.phone ?? '—'}</span>
            <span style={{ fontWeight: 'bold' }}>Code Client</span>
            <span>: {customer?.code ?? '—'}</span>
            <span style={{ fontWeight: 'bold' }}>Date avoir</span>
            <span>: {creditDateStr}</span>
            <span style={{ fontWeight: 'bold' }}>Facture d'origine</span>
            <span>: {avoir.invoiceReference ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Reason */}
      {avoir.notes && (
        <div style={{ marginBottom: '10px', fontSize: '10pt', border: '1px solid #333', padding: '5px 8px' }}>
          <span style={{ fontWeight: 'bold' }}>Motif du retour : </span>{avoir.notes}
        </div>
      )}

      {/* Lines table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <thead>
          <tr>
            <th style={{ ...cellHeader, width: '32px' }}>N°</th>
            <th style={{ ...cellHeader, textAlign: 'left' }}>Description</th>
            <th style={{ ...cellHeader, width: '95px' }}>N° Lot</th>
            <th style={{ ...cellHeader, width: '80px' }}>PU HT</th>
            <th style={{ ...cellHeader, width: '55px' }}>Qté ret.</th>
            <th style={{ ...cellHeader, width: '90px' }}>Montant HT</th>
          </tr>
        </thead>
        <tbody>
          {avoir.lines.map((l, i) => (
            <tr key={l.id}>
              <td style={{ ...cellBody, textAlign: 'center' }}>{i + 1}</td>
              <td style={{ ...cellBody, textAlign: 'left' }}>
                {l.productDesignation ?? l.productCode ?? `#${l.productId}`}
              </td>
              <td style={{ ...cellBody, textAlign: 'left', fontFamily: 'monospace', fontSize: '9pt' }}>
                {l.lotNumber ?? '—'}
              </td>
              <td style={{ ...cellBody, textAlign: 'right' }}>{fmtXofPlain(l.unitPriceHt)}</td>
              <td style={{ ...cellBody, textAlign: 'right' }}>{l.quantityReturned}</td>
              <td style={{ ...cellBody, textAlign: 'right' }}>{fmtXofPlain(l.lineTotalHt)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>TOTAL HT</td>
            <td style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>{fmtXofPlain(avoir.totalAmountHt)}</td>
          </tr>
          <tr>
            <td colSpan={5} style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>TOTAL TVA</td>
            <td style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>{fmtXofPlain(avoir.totalTva)}</td>
          </tr>
          <tr>
            <td colSpan={5} style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>TOTAL AVOIR TTC</td>
            <td style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>{fmtXofPlain(avoir.totalAmountTtc)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: '10px', fontSize: '10pt', fontStyle: 'italic' }}>
        Arrêté le présent avoir à la somme de : {montantXofEnLettres(avoir.totalAmountTtc)}.
      </div>

      <div style={{ marginTop: '8px', fontSize: '9.5pt', color: '#444' }}>
        {avoir.status === 'DéduitDeFacture' && avoir.invoiceReference
          ? `Cet avoir a été déduit de la facture ${avoir.invoiceReference}.`
          : avoir.status === 'Remboursé'
          ? 'Cet avoir a été remboursé au client.'
          : 'Cet avoir sera imputé sur la facture d\'origine ou remboursé au client.'}
      </div>

      {/* Signatures footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', gap: '20px', fontSize: '10pt' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '55px' }}>Le Comptable</div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontStyle: 'italic' }}>ITITO Kossivi</div>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Le Pharmacien responsable</div>
          <div style={{
            display: 'inline-block',
            border: '2px solid #1e40af',
            padding: '6px 10px',
            fontSize: '9pt',
            lineHeight: '1.4',
            textAlign: 'left',
            color: '#1e40af',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}>
            <div style={{ fontWeight: 'bold' }}>LABMEDIS SARL</div>
            <div>380 Bd de la Kara</div>
            <div>08 BP 80859 Tél : +228 92 26 99 33</div>
            <div>pharmacien@labmedis-togo.com</div>
          </div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '4px', marginTop: '30px', fontStyle: 'italic' }}>Dr ODOULAMI Doris</div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export function CustomerCreditNoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [avoir, setAvoir] = useState<CustomerCreditNoteDto | null>(null)
  const [customer, setCustomer] = useState<CustomerDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!id) return
    customerCreditNotesApi.getById(Number(id))
      .then(a => {
        setAvoir(a)
        setNewStatus(a.status)
        return customersApi.getById(a.customerId).catch(() => null)
      })
      .then(c => { if (c) setCustomer(c) })
      .catch(() => toast('Avoir introuvable.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!printing) return
    const timer = setTimeout(() => window.print(), 100)
    const onAfterPrint = () => setPrinting(false)
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [printing])

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

  const printDate = new Date().toLocaleDateString('fr-FR')

  return (
    <>
      {/* ── Print area ── */}
      <div className={printing ? 'hidden print:block' : 'hidden'}>
        <AvoirPrintLayout avoir={avoir} customer={customer} printDate={printDate} />
      </div>

      {/* ── Screen layout ── */}
      <div className="flex flex-col gap-5 max-w-4xl print:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/invoices/customers')}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-base font-semibold text-gray-900">Avoir client {avoir.reference}</h2>
            {statusBadge(avoir.status)}
          </div>
          <button
            onClick={() => setPrinting(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer size={14} />
            Imprimer l'avoir
          </button>
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
    </>
  )
}
