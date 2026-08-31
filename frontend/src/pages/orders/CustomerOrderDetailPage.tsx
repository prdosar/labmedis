import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Upload, Trash2, FileText, Mail, X, Edit2 } from 'lucide-react'
import type { CustomerOrderDto, CustomerOrderDocumentDto } from '../../api/types'
import { customerOrdersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { fmtXof } from '../../utils/format'

const READONLY_STATUSES = ['Terminée', 'Annulée']
const DOC_TYPES = ['BonCommande', 'Proforma', 'Facture', 'Autre']
const DOC_TYPE_COLORS: Record<string, string> = {
  BonCommande: 'bg-purple-50 text-purple-700 border border-purple-200',
  Proforma:    'bg-amber-50 text-amber-700 border border-amber-200',
  Facture:     'bg-blue-50 text-blue-700 border border-blue-200',
  Autre:       'bg-gray-50 text-gray-600 border border-gray-200',
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1024 / 1024).toFixed(1)} Mo`
}

const STATUS_COLORS: Record<string, string> = {
  EnAttente: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Validée:   'bg-blue-50 text-blue-700 border border-blue-200',
  Terminée:  'bg-green-50 text-green-700 border border-green-200',
  Annulée:   'bg-red-50 text-red-500 border border-red-200',
}
const STATUS_LABELS: Record<string, string> = {
  EnAttente: 'En attente',
  Validée:   'Validée',
  Terminée:  'Terminée',
  Annulée:   'Annulée',
}

export function CustomerOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [order, setOrder] = useState<CustomerOrderDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<CustomerOrderDocumentDto[]>([])
  const [uploadingDocType, setUploadingDocType] = useState('BonCommande')
  const [uploading, setUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const [sendingEmail, setSendingEmail] = useState<'proforma' | 'facture' | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      customerOrdersApi.getById(Number(id)),
      customerOrdersApi.getDocuments(Number(id)),
    ])
      .then(([o, docs]) => { setOrder(o); setDocuments(docs) })
      .catch(() => toast('Commande introuvable.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

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
      {/* ── Print area ── */}
      <div className="hidden print:block">
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', padding: '15mm 20mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>BON DE LIVRAISON</div>
              <div style={{ fontSize: '10pt', color: '#555', marginTop: '4px' }}>N° {order.reference}</div>
              <div style={{ fontSize: '10pt', marginTop: '2px' }}>Date : {printDate}</div>
            </div>
            <div style={{ textAlign: 'right', border: '1px solid #ccc', padding: '8px 12px', borderRadius: '4px', minWidth: '200px' }}>
              <div style={{ fontWeight: 'bold' }}>LABMEDIS SARL</div>
              <div style={{ fontSize: '9pt', color: '#555' }}>QAT. GBOSSIME, 380 RUE BD DE LA KARA</div>
              <div style={{ fontSize: '9pt', color: '#555' }}>08 BP 80859 — LOMÉ, Togo</div>
            </div>
          </div>
          <div style={{ marginBottom: '12px', padding: '8px', border: '1px solid #eee', borderRadius: '4px' }}>
            <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>CLIENT</div>
            <div style={{ fontSize: '10pt' }}>{order.customerName}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'left' }}>Désignation</th>
                <th style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'center', width: '60px' }}>Qté</th>
                <th style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right', width: '90px' }}>Prix HT</th>
                <th style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right', width: '100px' }}>Total HT</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l, i) => (
                <tr key={l.id} style={{ backgroundColor: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                    <div>{l.productDesignation}</div>
                    <div style={{ fontSize: '8pt', color: '#888' }}>{l.productCode}</div>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'center' }}>{l.quantity}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right' }}>{fmtXof(l.unitPriceHt)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right' }}>{fmtXof(l.lineTotalHt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', fontSize: '10pt' }}>
            <div>
              <div><strong>Total HT :</strong> {fmtXof(order.totalHt)}</div>
              {order.vatApplied && <div><strong>TVA 18% :</strong> {fmtXof(order.totalTva)}</div>}
              <div style={{ fontWeight: 'bold', fontSize: '12pt', borderTop: '1px solid #000', marginTop: '4px', paddingTop: '4px' }}>
                Total TTC : {fmtXof(order.totalTtc)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '10pt' }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '30px' }}>Signature client</div>
              <div style={{ borderTop: '1px solid #000', width: '150px' }} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '30px' }}>Signature LabMedis</div>
              <div style={{ borderTop: '1px solid #000', width: '150px' }} />
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '9pt', color: '#777', borderTop: '1px solid #ccc', paddingTop: '6px', marginTop: '20px' }}>
            {order.customerName} — {order.reference}
          </div>
        </div>
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
                {order.lines.map(l => (
                  <div key={l.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{l.productDesignation}</p>
                      <p className="text-xs text-gray-400 font-mono">{l.productCode}</p>
                    </div>
                    <div className="text-sm text-gray-600 w-16 text-right">Qté {l.quantity}</div>
                    <div className="text-sm text-gray-600 w-28 text-right">{fmtXof(l.unitPriceHt)} / u.</div>
                    <div className="text-sm font-semibold text-gray-900 w-28 text-right">{fmtXof(l.lineTotalHt)}</div>
                  </div>
                ))}
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
              </div>
            </div>

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

            {/* Actions print */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Impression</p>
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Printer size={14} />
                Bon de livraison (BL)
              </button>
              {order.invoiceReference && (
                <button
                  onClick={() => window.print()}
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
