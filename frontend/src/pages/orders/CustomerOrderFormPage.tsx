import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import type { CustomerDto, ProductDto, CustomerOrderPreviewDto, CustomerStatsDto } from '../../api/types'
import { customersApi, productsApi, customerOrdersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { ComboSelect } from '../../components/ui/Input'
import { fmtXof } from '../../utils/format'

interface LineInput {
  productId: string
  quantity: string
  availableStock: number
}

const emptyLine = (): LineInput => ({ productId: '', quantity: '1', availableStock: 0 })


// Grid template: with or without TVA columns
const gridTpl = (vat: boolean) =>
  vat ? '1fr 5.5rem 7.5rem 6.5rem 7.5rem 2rem' : '1fr 5.5rem 8rem 2rem'

export function CustomerOrderFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id && id !== 'new'
  const navigate = useNavigate()
  const { toast } = useToast()

  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [products, setProducts] = useState<ProductDto[]>([])
  const [customerId, setCustomerId] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [vatApplied, setVatApplied] = useState(false)
  const [currency, setCurrency] = useState('XOF')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineInput[]>([emptyLine()])
  const [preview, setPreview] = useState<CustomerOrderPreviewDto | null>(null)
  const [customerStats, setCustomerStats] = useState<CustomerStatsDto | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Promise.all([customersApi.getForSelect(), productsApi.getForSelect()])
      .then(([c, p]) => { setCustomers(c); setProducts(p) })
      .finally(() => setInitialLoading(false))
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    customerOrdersApi.getById(Number(id)).then(order => {
      if (order.status === 'Terminée' || order.status === 'Annulée') {
        navigate(`/orders/customers/${id}`, { replace: true })
        return
      }
      setCustomerId(String(order.customerId))
      setOrderDate(order.orderDate.slice(0, 10))
      setVatApplied(order.vatApplied)
      setCurrency(order.currency ?? 'XOF')
      setNotes(order.notes ?? '')
      setLines(order.lines.map(l => ({
        productId: String(l.productId),
        quantity: String(l.quantity),
        availableStock: l.availableStock,
      })))
    }).catch(() => toast('Commande introuvable.', 'error'))
  }, [isEdit, id])

  useEffect(() => {
    if (!customerId) { setCustomerStats(null); return }
    customerOrdersApi.getCustomerStats(Number(customerId))
      .then(setCustomerStats)
      .catch(() => setCustomerStats(null))
  }, [customerId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const validLines = lines.filter(l => l.productId && Number(l.quantity) > 0)
    if (validLines.length === 0) { setPreview(null); return }

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await customerOrdersApi.preview({
          vatApplied,
          lines: validLines.map(l => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
        })
        setPreview(result)
        setLines(prev => {
          let pi = 0
          return prev.map(l => {
            if (!l.productId || Number(l.quantity) <= 0) return l
            const pl = result.lines[pi++]
            return pl ? { ...l, availableStock: pl.availableStock } : l
          })
        })
      } catch { setPreview(null) }
    }, 400)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [lines, vatApplied])

  const handleProductChange = useCallback(async (idx: number, productId: string) => {
    if (!productId) {
      setLines(prev => prev.map((l, i) => i === idx ? { ...l, productId: '', availableStock: 0 } : l))
      return
    }
    const available = await customerOrdersApi.getStock(Number(productId), isEdit && id ? Number(id) : undefined)
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, productId, availableStock: available } : l))
  }, [isEdit, id])

  const updateQty = (idx: number, qty: string) =>
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: qty } : l))

  const removeLine = (idx: number) =>
    setLines(prev => prev.length === 1 ? [emptyLine()] : prev.filter((_, i) => i !== idx))

  async function handleSave() {
    if (!customerId) { setFormError('Sélectionnez un client.'); return }
    const validLines = lines.filter(l => l.productId && Number(l.quantity) > 0)
    if (!validLines.length) { setFormError('Ajoutez au moins une ligne.'); return }
    setSaving(true); setFormError(null)
    try {
      const dto = {
        customerId: Number(customerId),
        orderDate,
        vatApplied,
        currency,
        notes: notes.trim() || null,
        lines: validLines.map(l => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
      }
      if (isEdit && id) { await customerOrdersApi.update(Number(id), dto); toast('Commande mise à jour.') }
      else { await customerOrdersApi.create(dto); toast('Commande créée.') }
      navigate('/orders/customers')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erreur lors de l\'enregistrement.')
    } finally { setSaving(false) }
  }

  function getPreviewLine(idx: number) {
    let pi = 0
    for (let i = 0; i < idx; i++) {
      if (lines[i].productId && Number(lines[i].quantity) > 0) pi++
    }
    if (!lines[idx].productId || Number(lines[idx].quantity) <= 0) return null
    return preview?.lines[pi] ?? null
  }

  const now = new Date()
  const monthLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

  if (initialLoading) return <div className="text-sm text-gray-400 py-8 text-center">Chargement…</div>

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/orders/customers')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Retour aux commandes
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          {isEdit ? `Modifier la commande #${id}` : 'Nouvelle commande client'}
        </h2>
      </div>

      {formError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>
      )}

      {/* Two-column layout: left = form, right = summary */}
      <div className="flex gap-5 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="w-3/4 min-w-0 flex flex-col gap-5">

          {/* Header card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Customer */}
              <div className="flex flex-col gap-2">
                <ComboSelect
                  label="Client *"
                  value={customerId}
                  onChange={setCustomerId}
                  options={customers.map(c => ({ value: String(c.id), label: `${c.code} – ${c.name}` }))}
                  placeholder="Rechercher un client…"
                />
                {customerStats && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2 flex flex-col gap-0.5">
                      <span className="text-xs text-gray-400">Solde</span>
                      <span className={`text-xs font-semibold ${customerStats.balance >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                        {fmtXof(customerStats.balance)}
                      </span>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2 flex flex-col gap-0.5">
                      <span className="text-xs text-gray-400">Commandes</span>
                      <span className="text-xs font-semibold text-gray-800">{customerStats.totalOrderCount}</span>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2 flex flex-col gap-0.5">
                      <span className="text-xs text-gray-400 truncate">CA {monthLabel}</span>
                      <span className="text-xs font-semibold text-brand-700">{fmtXof(customerStats.monthlyRevenueTtc)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={customerStats ? 4 : 2}
                  placeholder="Observations…"
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

              {/* Currency selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Devise</span>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="XOF">XOF – Franc CFA</option>
                  <option value="EUR">EUR – Euro</option>
                  <option value="USD">USD – Dollar US</option>
                  <option value="GBP">GBP – Livre sterling</option>
                </select>
              </div>

              {/* VAT checkbox */}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vatApplied}
                  onChange={e => setVatApplied(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Appliquer la TVA (18%)
              </label>
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
              style={{ gridTemplateColumns: gridTpl(vatApplied) }}
            >
              <span>Produit</span>
              <span>Qté</span>
              <span className="text-right">Prix HT</span>
              {vatApplied && <span className="text-right">TVA 18%</span>}
              {vatApplied && <span className="text-right">TTC</span>}
              <span />
            </div>

            {/* Lines */}
            <div className="divide-y divide-gray-50">
              {lines.map((line, idx) => {
                const pl = getPreviewLine(idx)
                const qtyOver = line.productId && Number(line.quantity) > line.availableStock

                return (
                  <div
                    key={idx}
                    className="px-5 py-2.5 grid gap-2 items-start"
                    style={{ gridTemplateColumns: gridTpl(vatApplied) }}
                  >
                    {/* Product */}
                    <ComboSelect
                      value={line.productId}
                      onChange={v => handleProductChange(idx, v)}
                      options={products.map(p => ({ value: String(p.id), label: `${p.code} – ${p.designation}` }))}
                      placeholder="Rechercher un produit…"
                    />

                    {/* Qty */}
                    <div>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={e => updateQty(idx, e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                          qtyOver ? 'border-red-400' : 'border-gray-300 focus:border-brand-500'
                        }`}
                      />
                      {line.productId && (
                        <p className={`mt-0.5 text-xs ${qtyOver ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          Dispo : {line.availableStock}
                        </p>
                      )}
                    </div>

                    {/* Prix HT */}
                    <div className="py-2 text-right">
                      {pl
                        ? <span className="text-sm font-semibold text-gray-900">{fmtXof(pl.lineTotalHt)}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </div>

                    {/* TVA */}
                    {vatApplied && (
                      <div className="py-2 text-right">
                        {pl
                          ? <span className="text-sm text-gray-500">{fmtXof(pl.lineTotalTva)}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </div>
                    )}

                    {/* TTC */}
                    {vatApplied && (
                      <div className="py-2 text-right">
                        {pl
                          ? <span className="text-sm font-semibold text-brand-700">{fmtXof(pl.lineTotalTtc)}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </div>
                    )}

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
                )
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: summary card ── */}
        <div className="w-1/4 shrink-0 sticky top-6 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-700">Récapitulatif</p>

            {preview ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total HT</span>
                  <span className="text-sm font-semibold text-gray-900">{fmtXof(preview.totalHt)}</span>
                </div>
                {vatApplied && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">TVA 18%</span>
                    <span className="text-sm text-gray-600">{fmtXof(preview.totalTva)}</span>
                  </div>
                )}
                <div className="pt-2 mt-1 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Total TTC</span>
                  <span className="text-base font-bold text-brand-700">{fmtXof(preview.totalTtc)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">Ajoutez des produits pour voir le récapitulatif</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} loading={saving} className="w-full justify-center">
              {isEdit ? 'Enregistrer' : 'Créer la commande'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/orders/customers')} className="w-full justify-center">
              Annuler
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
