import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Upload, Trash2, FileText, Printer, CheckCircle, X } from 'lucide-react'
import type { CountryDto, SupplierOrderDto, SupplierOrderDocumentDto } from '../../api/types'
import { countriesApi, supplierOrdersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'

const GRID_TPL = '1fr 5rem 6rem 8rem 8rem'

interface LineInput {
  lineId: number
  productDesignation: string
  packagingName: string | null
  dosageName: string | null
  quantity: number
  orderUnit: string
  unitFobPrice: string
}

const DOC_TYPES = ['Proforma', 'Facture', 'Autre']

const DOC_TYPE_COLORS: Record<string, string> = {
  Proforma: 'bg-amber-50 text-amber-700 border border-amber-200',
  Facture: 'bg-blue-50 text-blue-700 border border-blue-200',
  Autre: 'bg-gray-50 text-gray-600 border border-gray-200',
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1024 / 1024).toFixed(1)} Mo`
}

export function ReceiveProformaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [order, setOrder] = useState<SupplierOrderDto | null>(null)
  const [loading, setLoading] = useState(true)

  // Proforma header fields
  const [proformaRef, setProformaRef] = useState('')
  const [containerRef, setContainerRef] = useState('')
  const [freightAmount, setFreightAmount] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [brand, setBrand] = useState('')
  const [origin, setOrigin] = useState('')
  const [expectedShippingDate, setExpectedShippingDate] = useState('')

  // Line prices
  const [lines, setLines] = useState<LineInput[]>([])

  // Countries for origin dropdown
  const [countries, setCountries] = useState<CountryDto[]>([])

  // Documents
  const [documents, setDocuments] = useState<SupplierOrderDocumentDto[]>([])
  const [uploadingDocType, setUploadingDocType] = useState('Proforma')
  const [uploading, setUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      supplierOrdersApi.getById(Number(id)),
      countriesApi.getForSelect(),
    ])
      .then(([o, ctrs]) => {
        setCountries(ctrs)
        setOrder(o)
        setProformaRef(o.proformaReference ?? '')
        setContainerRef(o.containerReference ?? '')
        setFreightAmount(o.freightAmount != null ? String(o.freightAmount) : '')
        setPaymentTerms(o.paymentTerms ?? '')
        setBrand(o.brand ?? '')
        // Default origin to supplier's country if not already set on the order
        setOrigin(o.origin ?? o.supplierCountryName ?? '')
        setExpectedShippingDate(o.expectedShippingDate ?? '')
        setLines(o.lines.map(l => ({
          lineId: l.id,
          productDesignation: l.productDesignation,
          packagingName: l.packagingName,
          dosageName: l.dosageName,
          quantity: l.quantity,
          orderUnit: l.orderUnit,
          unitFobPrice: l.unitFobPrice != null ? String(l.unitFobPrice) : '',
        })))
        setDocuments(o.documents ?? [])
      })
      .catch(() => toast('Commande introuvable.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  function updateLinePrice(idx: number, value: string) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, unitFobPrice: value } : l))
  }

  async function handleSave() {
    setSaving(true)
    setFormError(null)
    try {
      await supplierOrdersApi.receiveProforma(Number(id), {
        proformaReference: proformaRef.trim() || null,
        containerReference: containerRef.trim() || null,
        freightAmount: freightAmount ? Number(freightAmount) : null,
        paymentTerms: paymentTerms.trim() || null,
        brand: brand.trim() || null,
        origin: origin.trim() || null,
        expectedShippingDate: expectedShippingDate || null,
        lines: lines.map(l => ({
          lineId: l.lineId,
          unitFobPrice: l.unitFobPrice ? Number(l.unitFobPrice) : null,
        })),
      })
      toast('Proforma enregistrée.', 'success')
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
      const doc = await supplierOrdersApi.uploadDocument(Number(id), file, uploadingDocType)
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
      await supplierOrdersApi.deleteDocument(docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
      toast('Document supprimé.', 'info')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setDeletingDocId(null)
    }
  }

  // Summary
  const totalLines = lines.reduce((acc, l) => {
    const price = Number(l.unitFobPrice) || 0
    return acc + price * l.quantity
  }, 0)
  const freight = Number(freightAmount) || 0
  const grandTotal = totalLines + freight
  const currency = order?.currency ?? 'EUR'

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Print layout
  const printDate = order
    ? new Date(order.orderDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Chargement…</div>
  if (!order) return null

  return (
    <>
      {/* ── Print area ────────────────────────────────────────────────────────── */}
      <div className="hidden print:block">
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', padding: '15mm 20mm' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>PROFORMA</div>
              {proformaRef && <div style={{ fontSize: '10pt', color: '#555' }}>N° {proformaRef}</div>}
              <div style={{ marginTop: '4px', fontSize: '10pt' }}>Date : {printDate}</div>
            </div>
            <div style={{ textAlign: 'right', border: '1px solid #ccc', padding: '8px 12px', borderRadius: '4px', minWidth: '200px' }}>
              <div style={{ fontWeight: 'bold' }}>LABMEDIS SARL</div>
              <div style={{ fontSize: '9pt', color: '#555' }}>QAT. GBOSSIME, 380 RUE BD DE LA KARA</div>
              <div style={{ fontSize: '9pt', color: '#555' }}>08 BP 80859 — LOMÉ, Togo</div>
            </div>
          </div>
          {containerRef && (
            <div style={{ marginBottom: '10px', fontSize: '10pt' }}>
              <strong>N / Référence :</strong> {containerRef}
            </div>
          )}
          {/* Lines table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'left' }}>Désignation</th>
                <th style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'center', width: '70px' }}>Qté</th>
                <th style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right', width: '90px' }}>Prix Unitaire</th>
                <th style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right', width: '100px' }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const price = Number(l.unitFobPrice) || 0
                const amount = price * l.quantity
                const label = `${l.productDesignation}${l.packagingName ? ` (${l.packagingName})` : ''}${l.dosageName ? ` — ${l.dosageName}` : ''}`
                return (
                  <tr key={l.lineId} style={{ backgroundColor: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{label}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'center' }}>{l.quantity}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right' }}>{fmt(price)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right' }}>{fmt(amount)}</td>
                  </tr>
                )
              })}
              {freight > 0 && (
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #ccc', padding: '4px 8px', fontStyle: 'italic' }}>FOB + FRET à rendu Lomé</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right' }}>1</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right' }}>{fmt(freight)}</td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Footer info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '10pt' }}>
            <div>
              {brand && <div><strong>Marque :</strong> {brand}</div>}
              {origin && <div><strong>Origine :</strong> {origin}</div>}
              {expectedShippingDate && <div><strong>Embarquement :</strong> {new Date(expectedShippingDate).toLocaleDateString('fr-FR')}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><strong>Sous-total :</strong> {fmt(totalLines)} {currency}</div>
              {freight > 0 && <div><strong>FOB+FRET :</strong> {fmt(freight)} {currency}</div>}
              <div style={{ fontSize: '12pt', fontWeight: 'bold', borderTop: '1px solid #000', marginTop: '4px', paddingTop: '4px' }}>
                <strong>Montant Total :</strong> {fmt(grandTotal)} {currency}
              </div>
              {paymentTerms && <div style={{ marginTop: '4px', color: '#555' }}>{paymentTerms}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '9pt', color: '#777', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
            {order.supplierName}
          </div>
        </div>
      </div>

      {/* ── Screen layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 print:hidden">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/orders/suppliers')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour aux commandes fournisseurs
          </button>
          <h2 className="text-base font-semibold text-gray-800">
            Saisie proforma — {order.reference}
          </h2>
        </div>

        {formError && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {formError}
          </div>
        )}

        <div className="flex gap-5 items-start">
          {/* ── LEFT COLUMN ── */}
          <div className="w-3/4 min-w-0 flex flex-col gap-5">

            {/* Header card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Informations proforma</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="N° proforma fournisseur">
                  <input
                    value={proformaRef}
                    onChange={e => setProformaRef(e.target.value)}
                    placeholder="ex : 2026P0073"
                    className={inputCls}
                  />
                </Field>
                <Field label="N/Référence (chargement)">
                  <input
                    value={containerRef}
                    onChange={e => setContainerRef(e.target.value)}
                    placeholder="ex : 1 X 40'HC LAITS INFANTILES / LABMEDIS"
                    className={inputCls}
                  />
                </Field>
                <Field label="Marque">
                  <input
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="ex : FRANCE LAIT"
                    className={inputCls}
                  />
                </Field>
                <Field label="Origine">
                  <select
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Sélectionner un pays —</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Date d'embarquement prévue">
                  <input
                    type="date"
                    value={expectedShippingDate}
                    onChange={e => setExpectedShippingDate(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Conditions de paiement">
                  <input
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    placeholder="ex : VIREMENT 90 JOURS DATE DE BL"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* Lines card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Prix unitaires FOB par produit</p>
                <p className="text-xs text-gray-400 mt-0.5">Saisir les prix tels qu'indiqués sur la proforma fournisseur</p>
              </div>

              <div
                className="px-5 py-2 border-b border-gray-100 grid gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                style={{ gridTemplateColumns: GRID_TPL }}
              >
                <span>Produit</span>
                <span className="text-right">Qté</span>
                <span className="text-right">Unité</span>
                <span className="text-right">Prix unit. {currency}</span>
                <span className="text-right">Montant {currency}</span>
              </div>

              <div className="divide-y divide-gray-50">
                {lines.map((line, idx) => {
                  const price = Number(line.unitFobPrice) || 0
                  const amount = price * line.quantity
                  const label = `${line.productDesignation}${line.packagingName ? ` (${line.packagingName})` : ''}`
                  return (
                    <div
                      key={line.lineId}
                      className="px-5 py-2.5 grid gap-3 items-center"
                      style={{ gridTemplateColumns: GRID_TPL }}
                    >
                      <div>
                        <div className="text-sm text-gray-900">{label}</div>
                        {line.dosageName && <div className="text-xs text-gray-400">{line.dosageName}</div>}
                      </div>
                      <div className="text-sm text-gray-700 text-right">{line.quantity}</div>
                      <div className="text-xs text-gray-500 text-right">{line.orderUnit}</div>
                      <div className="flex justify-end">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={line.unitFobPrice}
                          onChange={e => updateLinePrice(idx, e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <div className="text-sm font-medium text-gray-900 text-right">
                        {amount > 0 ? `${fmt(amount)}` : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Products subtotal */}
              <div className="px-5 py-2.5 border-t border-gray-200 bg-gray-50/60 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Montant total produits FOB</span>
                <span className="text-sm font-bold text-gray-900">{fmt(totalLines)} {currency}</span>
              </div>

              {/* Freight line */}
              <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-gray-600 italic">FOB + FRET à rendu Lomé</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={freightAmount}
                      onChange={e => setFreightAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                    <span className="text-xs font-semibold text-gray-500 w-10">{currency}</span>
                  </div>
                </div>
              </div>

              {/* Grand total */}
              <div className="px-5 py-3 border-t-2 border-gray-300 bg-gray-100 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">Total général (produits + fret)</span>
                <span className="text-sm font-bold text-gray-900">{fmt(grandTotal)} {currency}</span>
              </div>
            </div>

            {/* Documents card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Documents joints</p>
                  <p className="text-xs text-gray-400 mt-0.5">Proformas, factures et autres pièces reçues du fournisseur</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={uploadingDocType}
                    onChange={e => setUploadingDocType(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
                  Aucun document joint — utilisez le bouton ci-dessus pour uploader.
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

          {/* ── RIGHT COLUMN ── */}
          <div className="w-1/4 shrink-0 sticky top-6 flex flex-col gap-4">

            {/* Supplier info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Fournisseur</p>
              <p className="text-sm font-semibold text-gray-900">{order.supplierName}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{order.reference}</span>
                <span className="text-xs text-gray-500">{order.currency}</span>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-700">Récapitulatif</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sous-total produits</span>
                <span className="font-medium">{fmt(totalLines)} {currency}</span>
              </div>
              {freight > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">FOB + FRET</span>
                  <span className="font-medium">{fmt(freight)} {currency}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-3">
                <span className="text-gray-800">Total</span>
                <span className="text-gray-900">{fmt(grandTotal)} {currency}</span>
              </div>
              {order.status === 'ProformaReçue' && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle size={13} />
                  Proforma déjà enregistrée
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Printer size={15} />
                Imprimer la proforma
              </button>
              <Button onClick={handleSave} loading={saving} className="w-full justify-center">
                Enregistrer la proforma
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
    </>
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
