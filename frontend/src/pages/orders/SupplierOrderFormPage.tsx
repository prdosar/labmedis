import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Printer, Mail } from 'lucide-react'
import type { ProductDto, SupplierDto } from '../../api/types'
import { suppliersApi, productsApi, supplierOrdersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { ComboSelect } from '../../components/ui/Input'

// Grid template for order lines: product | qty | unit | boites/carton | delete
const GRID_TPL = '1fr 5rem 7rem 7rem 2rem'

interface LineInput {
  productId: string
  quantity: string
  orderUnit: string
  unitsPerCarton: string
}

const emptyLine = (): LineInput => ({
  productId: '',
  quantity: '1',
  orderUnit: 'Carton',
  unitsPerCarton: '',
})

/** Try to extract units-per-carton from packaging name, e.g. "Boîte 400g X 12" → 12 */
function parseUnitsPerCarton(packagingName: string | null | undefined): string {
  if (!packagingName) return ''
  const match = packagingName.match(/[Xx×]\s*(\d+)/)
  if (match) return match[1]
  return ''
}

export function SupplierOrderFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id && id !== 'new'
  const navigate = useNavigate()
  const { toast } = useToast()

  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [products, setProducts] = useState<ProductDto[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const prevSupplierRef = useRef('')
  const [currency, setCurrency] = useState('EUR')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineInput[]>([emptyLine()])
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Reference info for the existing order (edit mode)
  const [orderRef, setOrderRef] = useState('')

  useEffect(() => {
    Promise.all([suppliersApi.getForSelect(), productsApi.getForSelect()])
      .then(([s, p]) => {
        setSuppliers(s)
        setProducts(p)
      })
      .finally(() => setInitialLoading(false))
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    supplierOrdersApi.getById(Number(id)).then(order => {
      setSupplierId(String(order.supplierId))
      setOrderDate(order.orderDate.slice(0, 10))
      setCurrency(order.currency ?? 'EUR')
      setNotes(order.notes ?? '')
      setOrderRef(order.reference)
      setLines(
        order.lines.length > 0
          ? order.lines.map(l => ({
              productId: String(l.productId),
              quantity: String(l.quantity),
              orderUnit: l.orderUnit,
              unitsPerCarton: l.unitsPerCarton != null ? String(l.unitsPerCarton) : '',
            }))
          : [emptyLine()],
      )
    }).catch(() => toast('Bon de commande introuvable.', 'error'))
  }, [isEdit, id])

  // When supplier changes (user action, not initial load), clear lines with products from old supplier
  useEffect(() => {
    if (!supplierId) return
    if (prevSupplierRef.current && prevSupplierRef.current !== supplierId) {
      setLines([emptyLine()])
    }
    prevSupplierRef.current = supplierId
  }, [supplierId])

  function handleProductChange(idx: number, productId: string) {
    const product = products.find(p => String(p.id) === productId)
    const autoUnits = product ? parseUnitsPerCarton(product.packagingName) : ''
    setLines(prev =>
      prev.map((l, i) =>
        i === idx ? { ...l, productId, unitsPerCarton: autoUnits } : l,
      ),
    )
  }

  function updateLine(idx: number, patch: Partial<LineInput>) {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  function removeLine(idx: number) {
    setLines(prev => (prev.length === 1 ? [emptyLine()] : prev.filter((_, i) => i !== idx)))
  }

  async function handleSave() {
    if (!supplierId) { setFormError('Sélectionnez un fournisseur.'); return }
    const validLines = lines.filter(l => l.productId && Number(l.quantity) > 0)
    if (!validLines.length) { setFormError('Ajoutez au moins une ligne.'); return }
    setSaving(true); setFormError(null)
    try {
      const dto = {
        supplierId: Number(supplierId),
        orderDate,
        currency,
        notes: notes.trim() || null,
        lines: validLines.map(l => ({
          productId: Number(l.productId),
          quantity: Number(l.quantity),
          orderUnit: l.orderUnit,
          unitsPerCarton: l.unitsPerCarton ? Number(l.unitsPerCarton) : null,
        })),
      }
      if (isEdit && id) {
        await supplierOrdersApi.update(Number(id), dto)
        toast('Bon de commande mis à jour.')
      } else {
        await supplierOrdersApi.create(dto)
        toast('Bon de commande créé.')
      }
      navigate('/orders/suppliers')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  // Summary computations
  const validLines = lines.filter(l => l.productId && Number(l.quantity) > 0)
  const totalCartons = validLines.reduce((acc, l) => {
    if (l.orderUnit === 'Carton') return acc + Number(l.quantity)
    const upc = Number(l.unitsPerCarton)
    if (l.orderUnit === 'Boite' && upc > 0) return acc + Number(l.quantity) / upc
    return acc
  }, 0)
  const totalBoites = validLines.reduce((acc, l) => {
    if (l.orderUnit === 'Boite') return acc + Number(l.quantity)
    const upc = Number(l.unitsPerCarton)
    if (l.orderUnit === 'Carton' && upc > 0) return acc + Number(l.quantity) * upc
    return acc
  }, 0)

  const selectedSupplier = suppliers.find(s => String(s.id) === supplierId)

  // Filter products by selected supplier
  const supplierProducts = supplierId
    ? products.filter(p => String(p.supplierId) === supplierId)
    : products

  const printDate = new Date(orderDate).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  if (initialLoading)
    return <div className="text-sm text-gray-400 py-8 text-center">Chargement…</div>

  return (
    <>
      {/* ── Print area (hidden on screen, shown only when printing) ── */}
      <div className="hidden print:block print-area">
        <style>{`
          @media print {
            body > * { display: none !important; }
            .print-area { display: block !important; }
            .print-area * { visibility: visible; }
          }
        `}</style>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12pt', padding: '20mm' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>LABMEDIS SARL</div>
            <div style={{ fontSize: '9pt', color: '#555' }}>
              Grossiste dépositaire en produits pharmaceutiques — Lomé, Togo
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <strong>Fournisseur :</strong> {selectedSupplier?.name ?? '—'}
            </div>
            <div>
              <strong>Date :</strong> {printDate}
            </div>
          </div>

          <h2 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
            Bon de Commande{orderRef ? ` — ${orderRef}` : ''}
          </h2>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'left' }}>Désignations</th>
                <th style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'center', width: '160px' }}>Quantités</th>
              </tr>
            </thead>
            <tbody>
              {validLines.map((line, idx) => {
                const product = products.find(p => String(p.id) === line.productId)
                const label = product
                  ? `${product.designation}${product.packagingName ? ` (${product.packagingName})` : ''}${product.dosageName ? ` — ${product.dosageName}` : ''}`
                  : `Produit #${line.productId}`
                const qtyLabel = `${Number(line.quantity).toLocaleString('fr-FR')} ${line.orderUnit === 'Carton' ? 'carton(s)' : 'boîte(s)'}`
                return (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{label}</td>
                    <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'center' }}>{qtyLabel}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {notes && (
            <div style={{ marginBottom: '24px', fontSize: '10pt', color: '#333' }}>
              <strong>Observations :</strong> {notes}
            </div>
          )}

          {/* Footer / Signature */}
          <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center', minWidth: '200px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Pharmacien responsable</div>
              <div style={{ fontSize: '10pt', color: '#555', marginBottom: '40px' }}>Dr Doris ODOULAMI</div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '9pt' }}>Signature</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Screen layout ── */}
      <div className="flex flex-col gap-5 print:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/orders/suppliers')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour aux commandes fournisseurs
          </button>
          <h2 className="text-base font-semibold text-gray-800">
            {isEdit ? `Modifier ${orderRef || `la commande #${id}`}` : 'Nouveau bon de commande fournisseur'}
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
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Supplier */}
                <div className="flex flex-col gap-2">
                  <ComboSelect
                    label="Fournisseur *"
                    value={supplierId}
                    onChange={setSupplierId}
                    options={suppliers.map(s => ({ value: String(s.id), label: `${s.code} – ${s.name}` }))}
                    placeholder="Rechercher un fournisseur…"
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Observations, conditions particulières…"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                {/* Order date */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Date</span>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={e => setOrderDate(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* Currency */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Devise</span>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="EUR">EUR – Euro</option>
                    <option value="USD">USD – Dollar US</option>
                    <option value="XOF">XOF – Franc CFA</option>
                    <option value="GBP">GBP – Livre sterling</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lines card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Lignes de commande</p>
                <button
                  onClick={() => setLines(prev => [...prev, emptyLine()])}
                  className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Plus size={14} /> Ajouter une ligne
                </button>
              </div>

              {/* Column headers */}
              <div
                className="px-5 py-2 grid gap-2 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                style={{ gridTemplateColumns: GRID_TPL }}
              >
                <span>Produit</span>
                <span>Qté</span>
                <span>Unité</span>
                <span>Boîtes/carton</span>
                <span />
              </div>

              {/* Lines */}
              <div className="divide-y divide-gray-50">
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="px-5 py-2.5 grid gap-2 items-start"
                    style={{ gridTemplateColumns: GRID_TPL }}
                  >
                    {/* Product — filtered by selected supplier */}
                    <ComboSelect
                      value={line.productId}
                      onChange={v => handleProductChange(idx, v)}
                      options={supplierProducts.map(p => ({
                        value: String(p.id),
                        label: `${p.code} – ${p.designation}${p.packagingName ? ` (${p.packagingName})` : ''}`,
                      }))}
                      placeholder={supplierId ? 'Rechercher un produit…' : 'Sélectionnez d\'abord un fournisseur'}
                      disabled={!supplierId}
                    />

                    {/* Quantity */}
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={e => updateLine(idx, { quantity: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />

                    {/* Order unit */}
                    <select
                      value={line.orderUnit}
                      onChange={e => updateLine(idx, { orderUnit: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="Carton">Carton</option>
                      <option value="Boite">Boîte</option>
                    </select>

                    {/* Units per carton */}
                    <input
                      type="number"
                      min={1}
                      value={line.unitsPerCarton}
                      onChange={e => updateLine(idx, { unitsPerCarton: e.target.value })}
                      placeholder="ex : 12"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />

                    {/* Delete */}
                    <div className="py-1 flex justify-end">
                      <button
                        onClick={() => removeLine(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="w-1/4 shrink-0 sticky top-6 flex flex-col gap-4">

            {/* Summary card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
              <p className="text-sm font-semibold text-gray-700">Récapitulatif</p>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total lignes</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {validLines.length} produit{validLines.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total cartons</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {totalCartons % 1 === 0 ? totalCartons.toFixed(0) : totalCartons.toFixed(2)}
                  </span>
                </div>
                {totalBoites > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total boîtes</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {totalBoites % 1 === 0 ? totalBoites.toFixed(0) : totalBoites.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-2 mt-1 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Devise</span>
                  <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {currency}
                  </span>
                </div>
              </div>

              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Prix FOB à saisir après réception de la proforma
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Printer size={15} />
                Imprimer
              </button>
              <button
                onClick={() => toast("Configuration email requise — les paramètres seront fournis ultérieurement.", 'info')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Mail size={15} />
                Envoyer par email
              </button>
              <Button onClick={handleSave} loading={saving} className="w-full justify-center">
                Enregistrer
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
