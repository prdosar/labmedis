import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Upload, Trash2, FileText, Mail, X, Edit2, Package } from 'lucide-react'
import logo from '../../assets/logo.png'
import type { CustomerOrderDto, CustomerOrderDocumentDto, InvoiceDto, CustomerDto } from '../../api/types'
import { customerOrdersApi, invoicesApi, customersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { fmtXof } from '../../utils/format'
import { montantXofEnLettres } from '../../utils/numberToFrenchWords'

const READONLY_STATUSES = ['Terminée', 'Annulée', 'EnPréparation']

const DOC_TYPES = ['BonCommande', 'Proforma', 'Facture', 'Autre']
const DOC_TYPE_COLORS: Record<string, string> = {
  BonCommande: 'bg-purple-50 text-purple-700 border border-purple-200',
  Proforma:    'bg-amber-50 text-amber-700 border border-amber-200',
  Facture:     'bg-blue-50 text-blue-700 border border-blue-200',
  Autre:       'bg-gray-50 text-gray-600 border border-gray-200',
}

const STATUS_COLORS: Record<string, string> = {
  EnAttente:      'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Validée:        'bg-blue-50 text-blue-700 border border-blue-200',
  EnPréparation:  'bg-purple-50 text-purple-700 border border-purple-200',
  Terminée:       'bg-green-50 text-green-700 border border-green-200',
  Annulée:        'bg-red-50 text-red-500 border border-red-200',
}
const STATUS_LABELS: Record<string, string> = {
  EnAttente:      'En attente',
  Validée:        'Validée',
  EnPréparation:  'En préparation',
  Terminée:       'Terminée',
  Annulée:        'Annulée',
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1024 / 1024).toFixed(1)} Mo`
}

// ── Shared print header ──────────────────────────────────────────────────────

function PrintHeader({ title, reference, date }: { title: string; reference: string; date: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '2px solid #863bff', paddingBottom: '12px' }}>
      {/* Logo + company */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src={logo} alt="LabMedis" style={{ height: '60px', objectFit: 'contain' }} />
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '14pt', color: '#1a1a1a' }}>LABMEDIS SARL</div>
          <div style={{ fontSize: '8pt', color: '#666' }}>QAT. GBOSSIME, 380 RUE BD DE LA KARA</div>
          <div style={{ fontSize: '8pt', color: '#666' }}>08 BP 80859 — LOMÉ, Togo</div>
          <div style={{ fontSize: '8pt', color: '#666', marginTop: '3px' }}>Tél : +228 92 26 99 33 / +228 72 14 08 47</div>
          <div style={{ fontSize: '8pt', color: '#666' }}>Email : pharmacien@labmedis-togo.com</div>
        </div>
      </div>
      {/* Document title */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold', fontSize: '16pt', color: '#863bff', letterSpacing: '1px' }}>{title}</div>
        <div style={{ fontSize: '10pt', color: '#444', marginTop: '4px' }}>N° {reference}</div>
        <div style={{ fontSize: '9pt', color: '#666' }}>Date : {date}</div>
      </div>
    </div>
  )
}

function PrintCustomerBlock({ name }: { name: string }) {
  return (
    <div style={{ marginBottom: '16px', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
      <div style={{ fontSize: '8pt', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>Client</div>
      <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>{name}</div>
    </div>
  )
}

// ── BL print layout (quantities only, no prices) ────────────────────────────

function fmtBLDate(s: string | null) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('fr-FR') } catch { return s }
}

function BLPrintLayout({ order, printDate }: { order: CustomerOrderDto; printDate: string }) {
  const hasLots = order.lotLines.length > 0

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', padding: '15mm 20mm' }}>
      <PrintHeader title="BON DE LIVRAISON" reference={order.reference} date={printDate} />
      <PrintCustomerBlock name={order.customerName} />

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f0ff' }}>
            <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'left', fontSize: '10pt' }}>Désignation</th>
            <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'left', fontSize: '10pt', width: '100px' }}>Code</th>
            {hasLots && <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'left', fontSize: '10pt', width: '110px' }}>N° Lot</th>}
            {hasLots && <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'left', fontSize: '10pt', width: '90px' }}>Exp.</th>}
            <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', fontSize: '10pt', width: '80px' }}>Quantité</th>
          </tr>
        </thead>
        <tbody>
          {hasLots
            ? order.lotLines.map((l, i) => (
                <tr key={l.id} style={{ backgroundColor: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ border: '1px solid #e0e0e0', padding: '5px 10px' }}>{l.productDesignation}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: '5px 10px', fontFamily: 'monospace', fontSize: '9pt', color: '#555' }}>{l.productCode}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: '5px 10px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '9pt' }}>{l.lotNumber}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: '5px 10px', fontSize: '9pt', color: '#555' }}>{fmtBLDate(l.expirationDate)}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: '5px 10px', textAlign: 'center', fontWeight: 'bold' }}>{l.quantityAllocated}</td>
                </tr>
              ))
            : order.lines.map((l, i) => (
                <tr key={l.id} style={{ backgroundColor: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ border: '1px solid #e0e0e0', padding: '5px 10px' }}>{l.productDesignation}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: '5px 10px', fontFamily: 'monospace', fontSize: '9pt', color: '#555' }}>{l.productCode}</td>
                  <td style={{ border: '1px solid #e0e0e0', padding: '5px 10px', textAlign: 'center', fontWeight: 'bold' }}>{l.quantity}</td>
                </tr>
              ))
          }
        </tbody>
      </table>

      {/* Signature zones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '10pt' }}>
        <div style={{ textAlign: 'center', width: '200px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Signature & cachet client</div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '4px', color: '#888', fontSize: '9pt' }}>{order.customerName}</div>
        </div>
        <div style={{ textAlign: 'center', width: '200px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Signature LabMedis</div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '4px', color: '#888', fontSize: '9pt' }}>LabMedis SARL</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '8pt', color: '#aaa', borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '6px' }}>
        LabMedis SARL — {order.reference}
      </div>
    </div>
  )
}

// ── Facture print layout (sample-based: sober B&W, montant en lettres, délais, signatures) ──

function FacturePrintLayout({ order, invoice, customer, printDate }: { order: CustomerOrderDto; invoice: InvoiceDto | null; customer: CustomerDto | null; printDate: string }) {
  const reference = invoice?.reference ?? order.reference
  const invoiceDateStr = invoice?.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')
    : printDate

  const cellHeader: React.CSSProperties = { border: '1px solid #333', padding: '4px 8px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }
  const cellBody: React.CSSProperties = { border: '1px solid #333', padding: '4px 8px', fontSize: '10pt' }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', padding: '15mm 15mm', color: '#000' }}>
      {/* Title bar */}
      <div style={{ textAlign: 'center', border: '1px solid #333', padding: '6px', marginBottom: '10px', fontWeight: 'bold', fontSize: '12pt' }}>
        FACTURE N° {reference}
      </div>

      {/* Header : left = LabMedis identity + logo | right = client block in bordered box */}
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

        {/* Client box */}
        <div style={{ width: '260px', border: '1px solid #333', padding: '6px 8px', fontSize: '9.5pt', lineHeight: '1.5' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', rowGap: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>Client</span>
            <span>: {customer?.name ?? order.customerName}</span>
            <span style={{ fontWeight: 'bold' }}>Adresse</span>
            <span>: {customer?.address ?? '—'}</span>
            <span style={{ fontWeight: 'bold' }}>BP</span>
            <span>: {customer?.postalBox ?? '—'} {customer?.city ? ` ${customer.city}` : ''}</span>
            <span style={{ fontWeight: 'bold' }}>Tél</span>
            <span>: {customer?.phone ?? '—'}</span>
            <span style={{ fontWeight: 'bold' }}>Code Client</span>
            <span>: {customer?.code ?? '—'}</span>
            <span style={{ fontWeight: 'bold' }}>Date</span>
            <span>: {invoiceDateStr}</span>
            <span style={{ fontWeight: 'bold' }}>Commande N°</span>
            <span>: {order.reference}</span>
          </div>
        </div>
      </div>

      {/* Lines table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <thead>
          <tr>
            <th style={{ ...cellHeader, width: '32px' }}>N°</th>
            <th style={{ ...cellHeader, textAlign: 'left' }}>Description</th>
            <th style={{ ...cellHeader, width: '80px' }}>PU HT</th>
            <th style={{ ...cellHeader, width: '55px' }}>Qté</th>
            <th style={{ ...cellHeader, width: '90px' }}>Montant HT</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l, i) => (
            <tr key={l.id}>
              <td style={{ ...cellBody, textAlign: 'center' }}>{i + 1}</td>
              <td style={{ ...cellBody, textAlign: 'left' }}>{l.productDesignation}</td>
              <td style={{ ...cellBody, textAlign: 'right' }}>{formatXofPlain(l.unitPriceHt)}</td>
              <td style={{ ...cellBody, textAlign: 'right' }}>{l.quantity}</td>
              <td style={{ ...cellBody, textAlign: 'right' }}>{formatXofPlain(l.lineTotalHt)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>TOTAL HT</td>
            <td style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>{formatXofPlain(order.totalHt)}</td>
          </tr>
          <tr>
            <td colSpan={4} style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>TOTAL TVA</td>
            <td style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>{formatXofPlain(order.totalTva)}</td>
          </tr>
          <tr>
            <td colSpan={4} style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>TOTAL TTC</td>
            <td style={{ ...cellBody, textAlign: 'right', fontWeight: 'bold' }}>{formatXofPlain(order.totalTtc)}</td>
          </tr>
        </tbody>
      </table>

      {/* Montant en lettres */}
      <div style={{ marginTop: '10px', fontSize: '10pt', fontStyle: 'italic' }}>
        Arrêtée la présente facture à la somme de : {montantXofEnLettres(order.totalTtc)}.
      </div>

      {/* Délais */}
      <div style={{ marginTop: '10px', fontSize: '10pt' }}>
        <div>Délai de livraison : {order.deliveryDelayLabel ?? '—'}</div>
        <div>Délai de paiement : {order.paymentDelayLabel ?? '—'}</div>
      </div>

      {/* Signatures footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', gap: '20px', fontSize: '10pt' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '55px' }}>Le Comptable</div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontStyle: 'italic' }}>ITITO Kossivi</div>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Le Pharmacien responsable</div>
          <div style={{ display: 'inline-block', border: '1px solid #333', padding: '6px 10px', fontSize: '9pt', lineHeight: '1.4', textAlign: 'left' }}>
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

function formatXofPlain(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n))
}

// ── Main page ────────────────────────────────────────────────────────────────

export function CustomerOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [order, setOrder] = useState<CustomerOrderDto | null>(null)
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null)
  const [customer, setCustomer] = useState<CustomerDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<CustomerOrderDocumentDto[]>([])
  const [uploadingDocType, setUploadingDocType] = useState('BonCommande')
  const [uploading, setUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const [sendingEmail, setSendingEmail] = useState<'proforma' | 'facture' | null>(null)
  const [printMode, setPrintMode] = useState<'bl' | 'facture' | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      customerOrdersApi.getById(Number(id)),
      customerOrdersApi.getDocuments(Number(id)),
    ])
      .then(([o, docs]) => {
        setOrder(o)
        setDocuments(docs)
        if (o.invoiceId) {
          invoicesApi.getById(o.invoiceId).then(setInvoice).catch(() => null)
        }
        customersApi.getById(o.customerId).then(setCustomer).catch(() => null)
      })
      .catch(() => toast('Commande introuvable.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  // Trigger print after printMode state is applied to the DOM
  useEffect(() => {
    if (!printMode) return
    const timer = setTimeout(() => {
      window.print()
    }, 100)
    const onAfterPrint = () => setPrintMode(null)
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [printMode])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const doc = await customerOrdersApi.uploadDocument(Number(id), file, uploadingDocType)
      setDocuments(prev => [doc, ...prev])
      toast(`${uploadingDocType} uploadé.`, 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur upload.', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteDoc(docId: number) {
    setDeletingDocId(docId)
    try {
      await customerOrdersApi.deleteDocument(docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
      toast('Document supprimé.', 'info')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setDeletingDocId(null)
    }
  }

  async function handleSendEmail(type: 'proforma' | 'facture') {
    setSendingEmail(type)
    try {
      await customerOrdersApi.sendEmail(Number(id), type)
      toast(`${type === 'proforma' ? 'Proforma' : 'Facture'} envoyée par email.`, 'success')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur envoi email.', 'error')
    } finally {
      setSendingEmail(null)
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Chargement…</div>
  if (!order) return null

  const isReadonly = READONLY_STATUSES.includes(order.status)
  const printDate = new Date(order.orderDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      {/* ── BL print area ── */}
      <div className={printMode === 'bl' ? 'hidden print:block' : 'hidden'}>
        <BLPrintLayout order={order} printDate={printDate} />
      </div>

      {/* ── Facture print area ── */}
      <div className={printMode === 'facture' ? 'hidden print:block' : 'hidden'}>
        <FacturePrintLayout order={order} invoice={invoice} customer={customer} printDate={printDate} />
      </div>

      {/* ── Screen layout ── */}
      <div className="flex flex-col gap-5 print:hidden">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/orders/customers')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={14} />
            Retour aux commandes
          </button>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            <h2 className="text-base font-semibold text-gray-800">{order.reference}</h2>
          </div>
        </div>

        <div className="flex gap-5 items-start">
          {/* Left */}
          <div className="w-3/4 min-w-0 flex flex-col gap-5">

            {/* Order info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Détails de la commande</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Client</p>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Date</p>
                  <p className="text-gray-700">{printDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Devise</p>
                  <p className="text-gray-700">{order.currency}</p>
                </div>
                {order.vatApplied && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">TVA</p>
                    <p className="text-green-600 font-medium">18% appliquée</p>
                  </div>
                )}
                {order.invoiceReference && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Facture</p>
                    <p className="font-mono text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded inline-block">{order.invoiceReference}</p>
                  </div>
                )}
                {order.notes && (
                  <div className="col-span-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-gray-600 text-sm">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lines */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Lignes de commande</p>
              </div>
              <div className="divide-y divide-gray-50">
                {order.lines.map(l => {
                  const hasPackaging = l.unitsPerCarton > 1
                  const cartons = hasPackaging ? Math.round(l.quantity / l.unitsPerCarton) : null
                  return (
                    <div key={l.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{l.productDesignation}</p>
                        <p className="text-xs text-gray-400 font-mono">{l.productCode}</p>
                      </div>
                      <div className="text-sm text-gray-600 text-right">
                        {l.quantityRequested > 0 && l.quantityRequested !== l.quantity && (
                          <p className="text-xs text-gray-400">Demandé : {l.quantityRequested}</p>
                        )}
                        <p className="font-medium">
                          {hasPackaging && cartons !== null
                            ? <>{cartons} ctn × {l.unitsPerCarton} = <strong>{l.quantity}</strong> u.</>
                            : <>{l.quantity} u.</>
                          }
                        </p>
                      </div>
                      <div className="text-sm text-gray-600 w-28 text-right">{fmtXof(l.unitPriceHt)} / u.</div>
                      <div className="text-sm font-semibold text-gray-900 w-28 text-right">{fmtXof(l.lineTotalHt)}</div>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total HT</span>
                  <span className="font-medium">{fmtXof(order.totalHt)}</span>
                </div>
                {order.vatApplied && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">TVA 18%</span>
                    <span className="font-medium">{fmtXof(order.totalTva)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1">
                  <span className="text-gray-800">Total TTC</span>
                  <span className="text-gray-900">{fmtXof(order.totalTtc)}</span>
                </div>
                {invoice && invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Acompte versé</span>
                      <span>- {fmtXof(invoice.amountPaid)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1 ${invoice.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <span>Reste à payer</span>
                      <span>{fmtXof(invoice.balanceDue)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Lot lines (when prepared or completed) */}
            {order.lotLines.length > 0 && (
              <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-purple-100 bg-purple-50 flex items-center gap-2">
                  <Package size={14} className="text-purple-500" />
                  <p className="text-sm font-semibold text-purple-800">Lots préparés pour livraison</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: '560px' }}>
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Produit</th>
                        <th className="px-4 py-2.5 text-left">N° Lot</th>
                        <th className="px-4 py-2.5 text-left">Date exp.</th>
                        <th className="px-4 py-2.5 text-right">Qté</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {order.lotLines.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-900">{l.productDesignation}</p>
                            <p className="text-xs text-gray-400 font-mono">{l.productCode}</p>
                          </td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-gray-800">{l.lotNumber}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs">
                            {l.expirationDate ? new Date(l.expirationDate).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900">{l.quantityAllocated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Documents joints</p>
                  <p className="text-xs text-gray-400 mt-0.5">Bon de commande client, proformas, factures et autres pièces</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={uploadingDocType}
                    onChange={e => setUploadingDocType(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  >
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {uploading ? 'Upload…' : 'Ajouter'}
                  </button>
                </div>
              </div>
              {documents.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  Aucun document joint — cliquez sur Ajouter pour uploader.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {documents.map(doc => (
                    <div key={doc.id} className="px-5 py-3 flex items-center gap-3">
                      <FileText size={16} className="text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-brand-600 hover:underline truncate block"
                        >
                          {doc.fileName}
                        </a>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {formatBytes(doc.fileSize)} · {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DOC_TYPE_COLORS[doc.documentType] ?? DOC_TYPE_COLORS['Autre']}`}>
                        {doc.documentType}
                      </span>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        disabled={deletingDocId === doc.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingDocId === doc.id ? <X size={14} /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-1/4 shrink-0 sticky top-6 flex flex-col gap-4">

            {/* Client */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Client</p>
              <p className="text-sm font-semibold text-gray-900">{order.customerName}</p>
              <p className="text-xs text-gray-500 mt-1">Solde : {fmtXof(order.customerBalance)}</p>
            </div>

            {/* Print actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Impression</p>
              <button
                onClick={() => setPrintMode('bl')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Printer size={14} />
                Bon de livraison (BL)
              </button>
              {order.invoiceReference && (
                <button
                  onClick={() => setPrintMode('facture')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Printer size={14} />
                  Facture {order.invoiceReference}
                </button>
              )}
            </div>

            {/* Email */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Envoi email</p>
              <button
                onClick={() => handleSendEmail('proforma')}
                disabled={sendingEmail !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <Mail size={14} />
                {sendingEmail === 'proforma' ? 'Envoi…' : 'Envoyer proforma'}
              </button>
              {order.invoiceReference && (
                <button
                  onClick={() => handleSendEmail('facture')}
                  disabled={sendingEmail !== null}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <Mail size={14} />
                  {sendingEmail === 'facture' ? 'Envoi…' : 'Envoyer facture'}
                </button>
              )}
            </div>

            {/* Prepare (only if Validée) */}
            {order.status === 'Validée' && (
              <Button
                onClick={() => navigate(`/orders/customers/${id}/prepare`)}
                className="w-full justify-center"
              >
                <Package size={14} />
                Préparer la commande
              </Button>
            )}

            {/* Edit (only if not readonly) */}
            {!isReadonly && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/orders/customers/${id}/edit`)}
                className="w-full justify-center"
              >
                <Edit2 size={14} />
                Modifier la commande
              </Button>
            )}

            <Button variant="secondary" onClick={() => navigate('/orders/customers')} className="w-full justify-center">
              Retour à la liste
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
