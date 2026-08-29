import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, Trash2, FileText, X } from 'lucide-react'
import type { SupplierOrderDto, SupplierOrderDocumentDto } from '../../api/types'
import { supplierOrdersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'

const EUR_XOF = 655.957

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1024 / 1024).toFixed(1)} Mo`
}

export function ReceiveInvoicePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [order, setOrder] = useState<SupplierOrderDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Invoice fields
  const [invoiceReference, setInvoiceReference] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [totalAmountForeign, setTotalAmountForeign] = useState('')
  const [exchangeRateToXof, setExchangeRateToXof] = useState(String(EUR_XOF))
  const [discountAmountForeign, setDiscountAmountForeign] = useState('')
  const [advanceAmountForeign, setAdvanceAmountForeign] = useState('')
  const [notes, setNotes] = useState('')

  // Documents
  const [documents, setDocuments] = useState<SupplierOrderDocumentDto[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    supplierOrdersApi.getById(Number(id))
      .then(o => {
        setOrder(o)
        setCurrency(o.currency)
        setExchangeRateToXof(
          o.currency === 'EUR' ? String(EUR_XOF)
          : o.currency === 'XOF' ? '1'
          : '600'
        )
        // Pré-remplir depuis la proforma : total lignes + fret
        const proformaTotal = o.lines.reduce(
          (sum, l) => sum + (l.unitFobPrice ?? 0) * l.quantity, 0
        ) + (o.freightAmount ?? 0)
        if (proformaTotal > 0)
          setTotalAmountForeign(proformaTotal.toFixed(2))
        setDocuments(o.documents ?? [])
      })
      .catch(() => toast('Commande introuvable.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  // Calculs en temps réel
  const rate = Number(exchangeRateToXof) || 0
  const total = Number(totalAmountForeign) || 0
  const discount = Number(discountAmountForeign) || 0
  const advance = Number(advanceAmountForeign) || 0

  const totalXof = Math.round(total * rate * 100) / 100
  const discountXof = Math.round(discount * rate * 100) / 100
  const netXof = totalXof - discountXof
  const advanceXof = Math.round(advance * rate * 100) / 100
  const balanceXof = netXof - advanceXof

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const fmtF = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  async function handleSave() {
    if (!invoiceReference.trim()) { setFormError('La référence de la facture est requise.'); return }
    if (!total || total <= 0) { setFormError('Le montant total doit être supérieur à zéro.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await supplierOrdersApi.receiveInvoice(Number(id), {
        invoiceReference: invoiceReference.trim(),
        invoiceDate,
        dueDate: dueDate || null,
        totalAmountForeign: total,
        currency,
        exchangeRateToXof: rate,
        discountAmountForeign: discount > 0 ? discount : null,
        advanceAmountForeign: advance > 0 ? advance : null,
        notes: notes.trim() || null,
      })
      toast('Facture fournisseur enregistrée — écritures comptables générées.', 'success')
      navigate('/orders/suppliers')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const doc = await supplierOrdersApi.uploadDocument(Number(id), file, 'Facture')
      setDocuments(prev => [doc, ...prev])
      toast('Facture uploadée.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur upload.', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteDoc(docId: number) {
    setDeletingDocId(docId)
    try {
      await supplierOrdersApi.deleteDocument(docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
      toast('Document supprimé.', 'info')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setDeletingDocId(null)
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Chargement…</div>
  if (!order) return null

  const showForeign = currency !== 'XOF'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/orders/suppliers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} />
          Retour aux commandes fournisseurs
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          Facture fournisseur — {order.reference}
        </h2>
      </div>

      {formError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {formError}
        </div>
      )}

      <div className="flex gap-5 items-start">
        {/* ── Left column ─────────────────────────────────────────────────────── */}
        <div className="w-3/4 min-w-0 flex flex-col gap-5">

          {/* Invoice data card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Données de la facture</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="N° facture fournisseur *">
                <input
                  value={invoiceReference}
                  onChange={e => setInvoiceReference(e.target.value)}
                  placeholder="ex : INV-2026-0089"
                  className={inputCls}
                />
              </Field>
              <Field label="Date de facture *">
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Date d'échéance">
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Devise">
                <select
                  value={currency}
                  onChange={e => {
                    setCurrency(e.target.value)
                    if (e.target.value === 'EUR') setExchangeRateToXof(String(EUR_XOF))
                    else if (e.target.value === 'XOF') setExchangeRateToXof('1')
                  }}
                  className={inputCls}
                >
                  <option value="EUR">EUR – Euro</option>
                  <option value="USD">USD – Dollar US</option>
                  <option value="XOF">XOF – Franc CFA</option>
                  <option value="GBP">GBP – Livre sterling</option>
                </select>
              </Field>
              <Field label={`Montant total facture (${currency}) *`}>
                <input
                  type="number" step="0.01" min={0}
                  value={totalAmountForeign}
                  onChange={e => setTotalAmountForeign(e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
                {totalXof > 0 && (
                  <span className="text-xs text-gray-400 mt-0.5">= {fmt(totalXof)} XOF</span>
                )}
              </Field>
              <Field label="Taux de change → XOF *">
                <input
                  type="number" step="0.001" min={0}
                  value={exchangeRateToXof}
                  onChange={e => setExchangeRateToXof(e.target.value)}
                  placeholder="655.957"
                  className={inputCls}
                />
              </Field>
              <Field label={`Remise accordée (${currency})`}>
                <input
                  type="number" step="0.01" min={0}
                  value={discountAmountForeign}
                  onChange={e => setDiscountAmountForeign(e.target.value)}
                  placeholder="0.00 — laisser vide si aucune"
                  className={inputCls}
                />
                {discountXof > 0 && (
                  <span className="text-xs text-emerald-600 mt-0.5">− {fmt(discountXof)} XOF</span>
                )}
              </Field>
              <Field label={`Avance versée au fournisseur (${currency})`}>
                <input
                  type="number" step="0.01" min={0}
                  value={advanceAmountForeign}
                  onChange={e => setAdvanceAmountForeign(e.target.value)}
                  placeholder="0.00 — laisser vide si aucune"
                  className={inputCls}
                />
                {advanceXof > 0 && (
                  <span className="text-xs text-blue-600 mt-0.5">− {fmt(advanceXof)} XOF</span>
                )}
              </Field>
              <div className="col-span-2">
                <Field label="Notes">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Observations…"
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Document upload card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Facture numérique</p>
                <p className="text-xs text-gray-400 mt-0.5">Joindre le fichier PDF ou image de la facture fournisseur</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors disabled:opacity-50"
                >
                  <Upload size={14} />
                  {uploading ? 'Upload…' : 'Joindre'}
                </button>
              </div>
            </div>

            {documents.filter(d => d.documentType === 'Facture').length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-gray-400">
                Aucun document joint — cliquez sur « Joindre » pour uploader la facture.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {documents.filter(d => d.documentType === 'Facture').map(doc => (
                  <div key={doc.id} className="px-5 py-3 flex items-center gap-3">
                    <FileText size={16} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-brand-600 hover:underline truncate block"
                      >
                        {doc.fileName}
                      </a>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatBytes(doc.fileSize)} · {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
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

        {/* ── Right sidebar ────────────────────────────────────────────────────── */}
        <div className="w-1/4 shrink-0 sticky top-6 flex flex-col gap-4">

          {/* Order info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Commande</p>
            <p className="text-sm font-semibold text-gray-900">{order.supplierName}</p>
            <p className="mt-1 text-xs font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded inline-block">
              {order.reference}
            </p>
            {order.proformaReference && (
              <p className="mt-2 text-xs text-gray-500">Proforma : {order.proformaReference}</p>
            )}
          </div>

          {/* Financial summary */}
          {totalXof > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2.5">
              <p className="text-sm font-semibold text-gray-700">Récapitulatif financier</p>

              {/* Total brut */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total brut</span>
                <div className="text-right">
                  {showForeign && (
                    <div className="text-xs text-gray-400">{fmtF(total)} {currency}</div>
                  )}
                  <div className="font-medium text-gray-900">{fmt(totalXof)} XOF</div>
                </div>
              </div>

              {/* Remise */}
              {discountXof > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Remise</span>
                  <div className="text-right">
                    {showForeign && (
                      <div className="text-xs text-emerald-500">− {fmtF(discount)} {currency}</div>
                    )}
                    <div className="font-medium text-emerald-600">− {fmt(discountXof)} XOF</div>
                  </div>
                </div>
              )}

              {/* Net dû */}
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2.5">
                <span className="text-gray-800">Net dû</span>
                <span className="text-gray-900">{fmt(netXof)} XOF</span>
              </div>

              {/* Avance */}
              {advanceXof > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">Avance versée</span>
                    <div className="text-right">
                      {showForeign && (
                        <div className="text-xs text-blue-400">− {fmtF(advance)} {currency}</div>
                      )}
                      <div className="font-medium text-blue-600">− {fmt(advanceXof)} XOF</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t-2 border-gray-300 pt-2.5">
                    <span className="text-gray-900">Solde restant</span>
                    <span className={balanceXof > 0 ? 'text-orange-600' : 'text-emerald-600'}>
                      {fmt(balanceXof)} XOF
                    </span>
                  </div>
                </>
              )}

              {/* Écritures prévues */}
              <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500 font-medium mb-1">Écritures comptables</p>
                <p className="text-xs text-gray-400">D: 601 Achats / C: 401 Fournisseurs</p>
                {advanceXof > 0 && (
                  <p className="text-xs text-gray-400">D: 4094 Avances / C: 521 Banque</p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} loading={saving} className="w-full justify-center">
              Enregistrer la facture
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/orders/suppliers')}
              className="w-full justify-center"
            >
              Annuler
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
