import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Info } from 'lucide-react'
import { customerCreditNotesApi, invoicesApi, productsApi, warehousesApi, customersApi } from '../../api/endpoints'
import type { InvoiceDto, ReturnableInvoiceLineDto, ProductDto, WarehouseDto, CustomerDto, PurchaseLineLotDto } from '../../api/types'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ComboSelect } from '../../components/ui/Input'
import { ApiError } from '../../api/client'

function today() { return new Date().toISOString().slice(0, 10) }
function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('fr-FR') } catch { return s }
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white'

// ─── Row types ────────────────────────────────────────────────────────────────

// Ligne « retour lié à une facture » — la source vient de returnable-lines
interface InvoiceReturnRow {
  key: string
  invoiceLine: ReturnableInvoiceLineDto
  purchaseLineId: string  // lot sélectionné
  quantityReturned: string
  unitPriceHt: string
  discountPercent: string
  tvaRate: string
}

// Ligne « retour libre » (sans facture)
interface FreeReturnRow {
  key: string
  productId: string
  warehouseId: string
  purchaseLineId: string
  quantityReturned: string
  unitPriceHt: string
  discountPercent: string
  tvaRate: string
  availableLots: PurchaseLineLotDto[]
}

let keySeq = 0
const nextKey = () => `r${++keySeq}`

function invoiceRowHt(r: InvoiceReturnRow): number {
  const price = parseFloat(r.unitPriceHt) || 0
  const qty = parseInt(r.quantityReturned) || 0
  const disc = parseFloat(r.discountPercent) || 0
  return Math.round(price * qty * (1 - disc / 100) * 100) / 100
}
function invoiceRowTva(r: InvoiceReturnRow): number {
  return Math.round(invoiceRowHt(r) * (parseFloat(r.tvaRate) || 0) / 100 * 100) / 100
}
function invoiceRowTtc(r: InvoiceReturnRow): number {
  return Math.round((invoiceRowHt(r) + invoiceRowTva(r)) * 100) / 100
}

function freeRowHt(r: FreeReturnRow): number {
  const price = parseFloat(r.unitPriceHt) || 0
  const qty = parseInt(r.quantityReturned) || 0
  const disc = parseFloat(r.discountPercent) || 0
  return Math.round(price * qty * (1 - disc / 100) * 100) / 100
}
function freeRowTva(r: FreeReturnRow): number {
  return Math.round(freeRowHt(r) * (parseFloat(r.tvaRate) || 0) / 100 * 100) / 100
}
function freeRowTtc(r: FreeReturnRow): number {
  return Math.round((freeRowHt(r) + freeRowTva(r)) * 100) / 100
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerCreditNoteCreatePage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Header
  const [invoiceId, setInvoiceId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [creditNoteDate, setCreditNoteDate] = useState(today())
  const [notes, setNotes] = useState('')

  // Data
  const [invoices, setInvoices] = useState<InvoiceDto[]>([])
  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [products, setProducts] = useState<ProductDto[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null)
  const [returnableLines, setReturnableLines] = useState<ReturnableInvoiceLineDto[]>([])
  const [loadingReturnable, setLoadingReturnable] = useState(false)

  // Lines
  const [invoiceRows, setInvoiceRows] = useState<InvoiceReturnRow[]>([])
  const [freeRows, setFreeRows] = useState<FreeReturnRow[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load reference data once
  useEffect(() => {
    Promise.all([
      invoicesApi.getAll(1, 500),
      customersApi.getForSelect(),
      productsApi.getForSelect(),
      warehousesApi.getForSelect(),
    ]).then(([inv, cust, prods, whs]) => {
      setInvoices(inv.items)
      setCustomers(cust)
      setProducts(prods)
      setWarehouses(whs)
    })
  }, [])

  // When invoice changes, fetch returnable lines
  useEffect(() => {
    if (!invoiceId) {
      setSelectedInvoice(null)
      setReturnableLines([])
      setInvoiceRows([])
      return
    }
    const inv = invoices.find(i => String(i.id) === invoiceId) ?? null
    setSelectedInvoice(inv)
    if (inv) setCustomerId(String(inv.customerId))
    setLoadingReturnable(true)
    invoicesApi.getReturnableLines(Number(invoiceId))
      .then(lines => {
        setReturnableLines(lines)
        // Auto-populate rows: 1 row per invoice line still returnable, qty=0 (à cocher)
        const rows: InvoiceReturnRow[] = lines
          .filter(l => l.quantityReturnable > 0)
          .map(l => ({
            key: nextKey(),
            invoiceLine: l,
            purchaseLineId: l.availableLots.length === 1 ? String(l.availableLots[0].purchaseLineId) : '',
            quantityReturned: '0',
            unitPriceHt: String(l.unitPriceHt),
            discountPercent: String(l.discountPercent),
            // TvaRate en fraction (0.18) côté back → afficher en pourcentage
            tvaRate: String(Math.round(l.tvaRate * 100)),
          }))
        setInvoiceRows(rows)
        setFreeRows([])
      })
      .catch(() => setReturnableLines([]))
      .finally(() => setLoadingReturnable(false))
  }, [invoiceId, invoices])

  function updateInvoiceRow(key: string, patch: Partial<InvoiceReturnRow>) {
    setInvoiceRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r))
  }

  function addFreeRow() {
    setFreeRows(prev => [...prev, {
      key: nextKey(),
      productId: '', warehouseId: warehouses[0] ? String(warehouses[0].id) : '',
      purchaseLineId: '', quantityReturned: '1',
      unitPriceHt: '', discountPercent: '0', tvaRate: '18',
      availableLots: [],
    }])
  }

  function updateFreeRow(key: string, patch: Partial<FreeReturnRow>) {
    setFreeRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r))
  }

  function removeFreeRow(key: string) {
    setFreeRows(prev => prev.filter(r => r.key !== key))
  }

  // Load lots when a product is selected in free mode
  async function handleFreeProductChange(key: string, productId: string) {
    updateFreeRow(key, { productId, purchaseLineId: '', availableLots: [] })
    if (!productId) return
    try {
      const lots = await productsApi.getLots(Number(productId))
      updateFreeRow(key, { availableLots: lots })
    } catch { /* silent */ }
  }

  // Totals
  const totalHt = invoiceRows.reduce((s, r) => s + invoiceRowHt(r), 0)
                + freeRows.reduce((s, r) => s + freeRowHt(r), 0)
  const totalTva = invoiceRows.reduce((s, r) => s + invoiceRowTva(r), 0)
                 + freeRows.reduce((s, r) => s + freeRowTva(r), 0)
  const totalTtc = invoiceRows.reduce((s, r) => s + invoiceRowTtc(r), 0)
                 + freeRows.reduce((s, r) => s + freeRowTtc(r), 0)

  async function handleSave() {
    setError(null)

    if (!customerId) { setError('Sélectionnez un client ou une facture.'); return }

    // Collect active rows
    const activeInvoiceRows = invoiceRows.filter(r => (parseInt(r.quantityReturned) || 0) > 0)
    const activeFreeRows = freeRows.filter(r => (parseInt(r.quantityReturned) || 0) > 0)

    if (activeInvoiceRows.length === 0 && activeFreeRows.length === 0) {
      setError('Saisissez au moins une quantité à retourner.')
      return
    }

    // Validations invoice rows
    for (const r of activeInvoiceRows) {
      const qty = parseInt(r.quantityReturned) || 0
      if (qty > r.invoiceLine.quantityReturnable) {
        setError(`Quantité pour "${r.invoiceLine.productDesignation}" dépasse le retournable (${r.invoiceLine.quantityReturnable}).`)
        return
      }
      if (r.invoiceLine.availableLots.length > 0 && !r.purchaseLineId) {
        setError(`Sélectionnez le lot retourné pour "${r.invoiceLine.productDesignation}".`)
        return
      }
      const lot = r.invoiceLine.availableLots.find(l => String(l.purchaseLineId) === r.purchaseLineId)
      if (lot && qty > lot.quantityReturnable) {
        setError(`Quantité pour lot ${lot.lotNumber} dépasse le retournable (${lot.quantityReturnable}).`)
        return
      }
    }

    // Validations free rows
    for (const r of activeFreeRows) {
      if (!r.productId) { setError('Sélectionnez un produit sur chaque ligne libre.'); return }
      if (!r.warehouseId) { setError('Sélectionnez un entrepôt.'); return }
      if (!r.purchaseLineId) { setError('Sélectionnez le lot retourné.'); return }
      if (parseFloat(r.unitPriceHt) <= 0) { setError('Le prix unitaire doit être > 0.'); return }
    }

    setSaving(true)
    try {
      // Warehouse from lot (invoice returns) or from free row
      const buildLine = (
        productId: number, warehouseId: number, purchaseLineId: number | null,
        qty: number, priceHt: number, discountPct: number, tvaRatePct: number,
        lotNumber: string | null,
      ) => ({
        productId,
        warehouseId,
        purchaseLineId,
        quantityReturned: qty,
        unitPriceHt: priceHt,
        discountPercent: discountPct,
        tvaRate: tvaRatePct,
        lotNumber,
      })

      const invoiceLinesPayload = activeInvoiceRows.map(r => {
        const lot = r.invoiceLine.availableLots.find(l => String(l.purchaseLineId) === r.purchaseLineId)
        const whId = lot?.warehouseId ?? (warehouses[0]?.id ?? 0)
        return buildLine(
          r.invoiceLine.productId,
          whId,
          r.purchaseLineId ? Number(r.purchaseLineId) : null,
          parseInt(r.quantityReturned) || 0,
          parseFloat(r.unitPriceHt) || 0,
          parseFloat(r.discountPercent) || 0,
          parseFloat(r.tvaRate) || 0,
          lot?.lotNumber ?? null,
        )
      })

      const freeLinesPayload = activeFreeRows.map(r => {
        const lot = r.availableLots.find(l => String(l.id) === r.purchaseLineId)
        return buildLine(
          Number(r.productId),
          Number(r.warehouseId),
          r.purchaseLineId ? Number(r.purchaseLineId) : null,
          parseInt(r.quantityReturned) || 0,
          parseFloat(r.unitPriceHt) || 0,
          parseFloat(r.discountPercent) || 0,
          parseFloat(r.tvaRate) || 0,
          lot?.lotNumber ?? null,
        )
      })

      const created = await customerCreditNotesApi.create({
        customerId: Number(customerId),
        invoiceId: invoiceId ? Number(invoiceId) : null,
        creditNoteDate,
        notes: notes || null,
        lines: [...invoiceLinesPayload, ...freeLinesPayload],
      })
      toast(`Avoir ${created.reference} créé avec succès. Stock rétabli sur les lots concernés.`)
      navigate(`/invoices/customers/credit-notes/${created.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  const availableInvoices = invoices.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices/customers')}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-base font-semibold text-gray-900">Nouveau retour client</h2>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-5 items-start">
        <div className="flex-1 flex flex-col gap-5 min-w-0">

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Informations générales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Facture liée (recommandé)</label>
            <ComboSelect
              value={invoiceId}
              onChange={setInvoiceId}
              options={availableInvoices.map(i => ({
                value: String(i.id),
                label: `${i.reference} — ${i.customerName} — TTC ${fmtXof(i.totalTtc)}`,
              }))}
              placeholder="Rechercher une facture…"
            />
            {selectedInvoice && (
              <p className="text-xs text-blue-600">
                Facture · Total TTC : {fmtXof(selectedInvoice.totalTtc)} · Solde dû : {fmtXof(selectedInvoice.balanceDue)}
              </p>
            )}
          </div>

          {!invoiceId && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Client (retour sans facture)</label>
              <ComboSelect
                value={customerId}
                onChange={setCustomerId}
                options={customers.map(c => ({ value: String(c.id), label: `${c.code} — ${c.name}` }))}
                placeholder="Rechercher un client…"
              />
            </div>
          )}

          <Input label="Date du retour *" type="date" value={creditNoteDate}
            onChange={e => setCreditNoteDate(e.target.value)} />

          <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Motif du retour, observations…" />
        </div>
      </div>

      {/* Invoice-linked returnable lines */}
      {invoiceId && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Produits de la facture</h3>
            <span className="text-xs text-gray-400">
              {loadingReturnable ? 'Chargement…' : `${invoiceRows.length} ligne(s) retournable(s)`}
            </span>
          </div>

          {!loadingReturnable && invoiceRows.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Aucune quantité restante à retourner sur cette facture.
            </div>
          )}

          {invoiceRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Produit</th>
                    <th className="px-3 py-2.5 text-right w-20">Livré</th>
                    <th className="px-3 py-2.5 text-right w-20">Retourné</th>
                    <th className="px-3 py-2.5 text-left w-48">Lot</th>
                    <th className="px-3 py-2.5 text-right w-24">Qté retour</th>
                    <th className="px-3 py-2.5 text-right w-28">PU HT</th>
                    <th className="px-3 py-2.5 text-right w-20">Remise%</th>
                    <th className="px-3 py-2.5 text-right w-20">TVA%</th>
                    <th className="px-3 py-2.5 text-right w-28">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoiceRows.map(r => {
                    const il = r.invoiceLine
                    const selectedLot = il.availableLots.find(l => String(l.purchaseLineId) === r.purchaseLineId)
                    const qty = parseInt(r.quantityReturned) || 0
                    const overMax = qty > il.quantityReturnable || (selectedLot && qty > selectedLot.quantityReturnable)
                    return (
                      <tr key={r.key} className={qty > 0 ? 'bg-brand-50/30' : ''}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{il.productDesignation}</div>
                          <div className="text-xs text-gray-400 font-mono">{il.productCode}</div>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">{il.quantityInvoiced}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{il.quantityAlreadyReturned}</td>
                        <td className="px-3 py-2">
                          {il.availableLots.length === 0 ? (
                            <span className="text-xs text-amber-600 italic">Aucun lot tracé — retour possible mais stock non recrédité</span>
                          ) : il.availableLots.length === 1 ? (
                            <div className="text-xs font-mono text-gray-800">
                              {il.availableLots[0].lotNumber}
                              {il.availableLots[0].expirationDate && (
                                <span className="text-gray-400 ml-1">· Exp. {fmtDate(il.availableLots[0].expirationDate)}</span>
                              )}
                              <div className="text-gray-400">Retournable : {il.availableLots[0].quantityReturnable}</div>
                            </div>
                          ) : (
                            <select
                              value={r.purchaseLineId}
                              onChange={e => updateInvoiceRow(r.key, { purchaseLineId: e.target.value })}
                              className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                            >
                              <option value="">— Choisir —</option>
                              {il.availableLots.map(l => (
                                <option key={l.purchaseLineId} value={String(l.purchaseLineId)}>
                                  {l.lotNumber}{l.expirationDate ? ` · Exp. ${fmtDate(l.expirationDate)}` : ''} · Retournable : {l.quantityReturnable}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input value={r.quantityReturned}
                            onChange={e => updateInvoiceRow(r.key, { quantityReturned: e.target.value })}
                            type="number" min="0" max={selectedLot?.quantityReturnable ?? il.quantityReturnable}
                            className={`w-full rounded border px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 ${overMax ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 bg-white focus:ring-brand-500'}`} />
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 font-mono text-xs">
                          {fmtXof(parseFloat(r.unitPriceHt) || 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 font-mono text-xs">
                          {(parseFloat(r.discountPercent) || 0).toFixed(0)}%
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 font-mono text-xs">
                          {(parseFloat(r.tvaRate) || 0).toFixed(0)}%
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">
                          {qty > 0 ? fmtXof(invoiceRowTtc(r)) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Free rows (retour sans facture ou complémentaire) */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Lignes libres</h3>
            <span className="text-xs text-gray-400">(retour sans facture ou hors des lignes facturées)</span>
          </div>
          <button onClick={addFreeRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-100 transition-colors">
            <Plus size={13} /> Ajouter
          </button>
        </div>

        {freeRows.length === 0 ? (
          <div className="px-5 py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Info size={13} />
            {invoiceId
              ? 'Optionnel — utilisez ceci uniquement pour retourner un produit qui n\'est pas sur cette facture.'
              : 'Ajoutez au moins une ligne pour un retour sans facture.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2.5 text-left">Produit</th>
                  <th className="px-3 py-2.5 text-left w-40">Entrepôt</th>
                  <th className="px-3 py-2.5 text-left w-56">Lot</th>
                  <th className="px-3 py-2.5 text-right w-20">Qté</th>
                  <th className="px-3 py-2.5 text-right w-28">PU HT</th>
                  <th className="px-3 py-2.5 text-right w-20">Remise%</th>
                  <th className="px-3 py-2.5 text-right w-20">TVA%</th>
                  <th className="px-3 py-2.5 text-right w-28">Total TTC</th>
                  <th className="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {freeRows.map(r => (
                  <tr key={r.key} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2">
                      <ComboSelect
                        value={r.productId}
                        onChange={v => handleFreeProductChange(r.key, v)}
                        options={products.map(p => ({ value: String(p.id), label: `${p.code} — ${p.designation}` }))}
                        placeholder="Rechercher un produit…"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select value={r.warehouseId} onChange={e => updateFreeRow(r.key, { warehouseId: e.target.value })}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white">
                        <option value="">—</option>
                        {warehouses.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select value={r.purchaseLineId} onChange={e => updateFreeRow(r.key, { purchaseLineId: e.target.value })}
                        disabled={!r.productId}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white disabled:bg-gray-50 disabled:text-gray-400">
                        <option value="">{r.productId ? '— Choisir le lot —' : 'Sélectionnez un produit d\'abord'}</option>
                        {r.availableLots.map(l => (
                          <option key={l.id} value={String(l.id)}>
                            {l.lotNumber}{l.expirationDate ? ` · Exp. ${fmtDate(l.expirationDate)}` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input value={r.quantityReturned} onChange={e => updateFreeRow(r.key, { quantityReturned: e.target.value })}
                        type="number" min="1"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={r.unitPriceHt} onChange={e => updateFreeRow(r.key, { unitPriceHt: e.target.value })}
                        type="number" min="0" step="0.01"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={r.discountPercent} onChange={e => updateFreeRow(r.key, { discountPercent: e.target.value })}
                        type="number" min="0" max="100"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={r.tvaRate} onChange={e => updateFreeRow(r.key, { tvaRate: e.target.value })}
                        type="number" min="0" max="100"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmtXof(freeRowTtc(r))}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeFreeRow(r.key)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

        </div>

        {/* ── RIGHT COLUMN: summary card (sticky) ── */}
        <div className="w-72 shrink-0 sticky top-6 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-700">Récapitulatif du retour</p>

            {totalTtc > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total HT</span>
                  <span className="text-sm font-semibold text-gray-900">{fmtXof(totalHt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">TVA</span>
                  <span className="text-sm text-gray-600">{fmtXof(totalTva)}</span>
                </div>
                <div className="pt-2 mt-1 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Total TTC</span>
                  <span className="text-base font-bold text-amber-700">{fmtXof(totalTtc)}</span>
                </div>

                {selectedInvoice && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between text-gray-500">
                      <span>Solde facture actuel</span>
                      <span className="font-medium text-gray-700">{fmtXof(selectedInvoice.balanceDue)}</span>
                    </div>
                    <div className={`flex items-center justify-between ${totalTtc <= selectedInvoice.balanceDue ? 'text-green-700' : 'text-amber-600'}`}>
                      <span>Après déduction</span>
                      <span className="font-semibold">{fmtXof(Math.max(0, selectedInvoice.balanceDue - totalTtc))}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">
                Renseignez les quantités à retourner pour voir le récapitulatif.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} loading={saving} className="w-full justify-center">
              Enregistrer le retour
            </Button>
            <Button variant="secondary" onClick={() => navigate('/invoices/customers')} className="w-full justify-center">
              Annuler
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

