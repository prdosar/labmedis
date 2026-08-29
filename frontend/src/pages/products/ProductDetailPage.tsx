import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, TrendingDown, TrendingUp, RotateCcw, AlertTriangle, ShoppingCart, Truck, Pencil } from 'lucide-react'
import type { ProductHistoryDto, ProductLotDto } from '../../api/types'
import { productsApi, purchasesApi } from '../../api/endpoints'
import { fmtXof } from '../../utils/format'
import { ApiError } from '../../api/client'

type Tab = 'lots' | 'clients' | 'mouvements'


const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const movementMeta: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PurchaseEntry: { label: 'Entrée achat', color: 'bg-green-100 text-green-700', icon: <TrendingUp size={12} /> },
  SaleExit:      { label: 'Sortie vente', color: 'bg-red-100 text-red-700',   icon: <TrendingDown size={12} /> },
  Adjustment:    { label: 'Ajustement',   color: 'bg-yellow-100 text-yellow-700', icon: <RotateCcw size={12} /> },
  Return:        { label: 'Retour',        color: 'bg-blue-100 text-blue-700',  icon: <RotateCcw size={12} /> },
  Loss:          { label: 'Perte',         color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle size={12} /> },
  Transfer:      { label: 'Transfert',     color: 'bg-purple-100 text-purple-700', icon: <RotateCcw size={12} /> },
}

const statusMeta: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Issued: 'bg-blue-100 text-blue-700',
  PartiallyPaid: 'bg-yellow-100 text-yellow-700',
  Paid: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
}

const statusLabel: Record<string, string> = {
  Draft: 'Brouillon',
  Issued: 'Émise',
  PartiallyPaid: 'Part. payée',
  Paid: 'Payée',
  Cancelled: 'Annulée',
}

const th = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'
const td = 'px-4 py-3 text-sm text-gray-700 align-top'

function InfoField({ label, value, mono, badge }: { label: string; value: string | null | undefined; mono?: boolean; badge?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      {value
        ? badge
          ? <span className="inline-flex w-fit items-center px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">{value}</span>
          : <span className={`text-sm text-gray-800 ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
        : <span className="text-sm text-gray-300">—</span>
      }
    </div>
  )
}

interface PriceEditState {
  lot: ProductLotDto
  marginRate: string
  fixedPrice: string
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [history, setHistory] = useState<ProductHistoryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('lots')
  const [priceEdit, setPriceEdit] = useState<PriceEditState | null>(null)
  const [savingPrice, setSavingPrice] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    productsApi.getHistory(Number(id))
      .then(setHistory)
      .catch(() => setError('Produit introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  async function handleSavePrice() {
    if (!priceEdit) return
    const margin = Number(priceEdit.marginRate)
    if (isNaN(margin) || margin < 0) { setPriceError('Marge invalide.'); return }
    const fixed = Number(priceEdit.fixedPrice) || null
    const pr = priceEdit.lot.unitCostPriceXof
    const pvCalc = pr > 0 ? pr * (1 + margin / 100) : 0
    const pvFinal = fixed && fixed > 0 ? fixed : pvCalc
    if (pr > 0 && pvFinal < pr) {
      setPriceError(
        `Prix de vente (${Math.round(pvFinal).toLocaleString('fr-FR')} XOF) inférieur au coût (${Math.round(pr).toLocaleString('fr-FR')} XOF). ` +
        `Augmentez la marge ou corrigez le PV fixé.`
      )
      return
    }
    setSavingPrice(true); setPriceError(null)
    try {
      await purchasesApi.updateLotPrice(priceEdit.lot.purchaseLineId, {
        marginRate: margin / 100,
        fixedSellingPriceHt: fixed,
      })
      // Refresh history
      const updated = await productsApi.getHistory(Number(id))
      setHistory(updated)
      setPriceEdit(null)
    } catch (e) {
      setPriceError(e instanceof ApiError ? e.message : 'Erreur lors de la mise à jour.')
    } finally {
      setSavingPrice(false)
    }
  }

  if (error || !history) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
      <p>{error ?? 'Produit introuvable.'}</p>
      <button onClick={() => navigate('/products')} className="text-brand-600 text-sm hover:underline">
        Retour aux produits
      </button>
    </div>
  )

  const { product, pendingDeliveryToClients, pendingFromSuppliers, purchaseLines, invoiceLines, stockMovements } = history

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'lots', label: 'Lots / Arrivages', count: purchaseLines.length },
    { key: 'clients', label: 'Commandes clients', count: invoiceLines.length },
    { key: 'mouvements', label: 'Mouvements de stock', count: stockMovements.length },
  ]

  return (
    <>
    <div className="flex flex-col gap-6">
      {/* Back */}
      <button
        onClick={() => navigate('/products')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Retour aux produits
      </button>

      {/* Product header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {/* Title row */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Package size={22} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{product.code}</span>
              <span className={`ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${product.stockQuantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                Stock : {product.stockQuantity}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{product.designation}</h2>
            {product.activeIngredient && <p className="text-sm text-gray-400 mt-0.5 italic">{product.activeIngredient}</p>}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-5" />

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          <InfoField label="Code" value={product.code} mono />
          <InfoField label="Code CIP" value={product.cipCode} mono />
          <InfoField label="Stock disponible" value={String(product.stockQuantity)} />
          <InfoField label="Catégorie" value={product.categoryName} badge />
          <InfoField label="Classe thérap." value={product.therapeuticClassName} />
          <InfoField label="Fournisseur" value={product.supplierName} />
          <InfoField label="Forme pharm." value={product.productFormName} />
          <InfoField label="Dosage" value={product.dosageName} />
          <InfoField label="Conditionnement" value={product.packagingName} />
          <InfoField label="Pays d'origine" value={product.originCountryName} />
          <InfoField label="Régime douanier" value={product.customsRegimeName} />
          <InfoField label="Entrepôt" value={product.warehouseName} />
        </div>

        {/* Pending quantities */}
        <div className="mt-5 border-t border-gray-100 pt-5 grid grid-cols-2 gap-4">
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${pendingDeliveryToClients > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${pendingDeliveryToClients > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
              <ShoppingCart size={18} className={pendingDeliveryToClients > 0 ? 'text-orange-600' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">En attente de livraison client</p>
              <p className={`text-xl font-bold ${pendingDeliveryToClients > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{pendingDeliveryToClients}</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${pendingFromSuppliers > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${pendingFromSuppliers > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Truck size={18} className={pendingFromSuppliers > 0 ? 'text-blue-600' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">En commande fournisseur (non arrivé)</p>
              <p className={`text-xl font-bold ${pendingFromSuppliers > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{pendingFromSuppliers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-0">
        <div className="flex border-b border-gray-200">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${tab === t.key ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-b-2xl border border-t-0 border-gray-200 shadow-sm overflow-x-auto">
          {/* Tab: Lots / Arrivages */}
          {tab === 'lots' && (
            purchaseLines.length === 0
              ? <p className="text-center text-gray-400 py-12 text-sm">Aucun arrivage enregistré pour ce produit.</p>
              : <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className={th}>Réf. arrivage</th>
                      <th className={th}>Date</th>
                      <th className={th}>Fournisseur</th>
                      <th className={th}>N° Lot</th>
                      <th className={th}>Expiration</th>
                      <th className={`${th} text-right`}>Qté cmd.</th>
                      <th className={`${th} text-right`}>Restante</th>
                      <th className={`${th} text-right`}>P.A. XOF</th>
                      <th className={`${th} text-right`}>P.R. XOF</th>
                      <th className={`${th} text-right`}>Marge</th>
                      <th className={`${th} text-right`}>PV HT</th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {purchaseLines.map(lot => {
                      const isLoss = lot.unitCostPriceXof > 0 && lot.targetSellingPriceHt < lot.unitCostPriceXof
                      return (
                        <tr key={lot.purchaseLineId} className={`hover:bg-gray-50 transition-colors ${isLoss ? 'bg-red-50/30' : ''}`}>
                          <td className={td}><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{lot.purchaseReference}</span></td>
                          <td className={td}>{fmtDate(lot.purchaseDate)}</td>
                          <td className={td}>{lot.supplierName ?? '—'}</td>
                          <td className={td}><span className="font-mono text-xs font-semibold text-brand-700">{lot.lotNumber}</span></td>
                          <td className={td}>{lot.expirationDate ? fmtDate(lot.expirationDate) : <span className="text-gray-300">—</span>}</td>
                          <td className={`${td} text-right font-medium`}>{lot.quantityOrdered}</td>
                          <td className={`${td} text-right`}>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${lot.quantityRemaining > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                              {lot.quantityRemaining}
                            </span>
                          </td>
                          <td className={`${td} text-right text-gray-600`}>{fmtXof(lot.unitPurchasePriceXof)}</td>
                          <td className={`${td} text-right text-gray-600`}>{fmtXof(lot.unitCostPriceXof)}</td>
                          <td className={`${td} text-right text-xs font-medium ${isLoss ? 'text-red-600' : 'text-gray-600'}`}>
                            {lot.unitCostPriceXof > 0
                              ? `${(((lot.targetSellingPriceHt - lot.unitCostPriceXof) / lot.unitCostPriceXof) * 100).toFixed(1)}%`
                              : '—'}
                            {isLoss && <AlertTriangle size={11} className="inline ml-1 text-red-500" />}
                          </td>
                          <td className={`${td} text-right font-semibold ${isLoss ? 'text-red-600' : 'text-brand-700'}`}>
                            {fmtXof(lot.targetSellingPriceHt)}
                          </td>
                          <td className={td}>
                            <button
                              title="Modifier le prix"
                              onClick={() => setPriceEdit({
                                lot,
                                marginRate: String(Math.round(lot.marginRate * 100 * 100) / 100),
                                fixedPrice: lot.targetSellingPriceHt !== lot.calculatedSellingPriceHt
                                  ? String(Math.round(lot.targetSellingPriceHt))
                                  : '',
                              })}
                              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          )}

          {/* Tab: Commandes clients */}
          {tab === 'clients' && (
            invoiceLines.length === 0
              ? <p className="text-center text-gray-400 py-12 text-sm">Aucune commande client enregistrée pour ce produit.</p>
              : <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className={th}>N° Facture</th>
                      <th className={th}>Date</th>
                      <th className={th}>Client</th>
                      <th className={th}>Statut</th>
                      <th className={`${th} text-right`}>Quantité</th>
                      <th className={`${th} text-right`}>Prix unit. HT</th>
                      <th className={`${th} text-right`}>Remise</th>
                      <th className={`${th} text-right`}>Total HT</th>
                      <th className={`${th} text-right`}>Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoiceLines.map((il, i) => (
                      <tr key={`${il.invoiceId}-${i}`} className="hover:bg-gray-50 transition-colors">
                        <td className={td}><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{il.invoiceReference}</span></td>
                        <td className={td}>{fmtDate(il.invoiceDate)}</td>
                        <td className={td}>{il.customerName ?? '—'}</td>
                        <td className={td}>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta[il.invoiceStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                            {statusLabel[il.invoiceStatus] ?? il.invoiceStatus}
                          </span>
                        </td>
                        <td className={`${td} text-right font-medium`}>{il.quantity}</td>
                        <td className={`${td} text-right`}>{fmtXof(il.unitPriceHt)}</td>
                        <td className={`${td} text-right text-gray-500`}>{il.discountPercent > 0 ? `${il.discountPercent}%` : '—'}</td>
                        <td className={`${td} text-right`}>{fmtXof(il.totalHt)}</td>
                        <td className={`${td} text-right font-medium text-brand-700`}>{fmtXof(il.totalTtc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          )}

          {/* Tab: Mouvements de stock */}
          {tab === 'mouvements' && (
            stockMovements.length === 0
              ? <p className="text-center text-gray-400 py-12 text-sm">Aucun mouvement de stock enregistré pour ce produit.</p>
              : <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className={th}>Date</th>
                      <th className={th}>Type</th>
                      <th className={`${th} text-right`}>Quantité</th>
                      <th className={th}>N° Lot</th>
                      <th className={th}>Entrepôt</th>
                      <th className={th}>Référence</th>
                      <th className={th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockMovements.map(sm => {
                      const meta = movementMeta[sm.movementType]
                      return (
                        <tr key={sm.id} className="hover:bg-gray-50 transition-colors">
                          <td className={td}>{fmtDate(sm.movementDate)}</td>
                          <td className={td}>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta?.color ?? 'bg-gray-100 text-gray-600'}`}>
                              {meta?.icon}
                              {meta?.label ?? sm.movementType}
                            </span>
                          </td>
                          <td className={`${td} text-right font-semibold ${sm.movementType === 'SaleExit' || sm.movementType === 'Loss' ? 'text-red-600' : 'text-green-700'}`}>
                            {sm.movementType === 'SaleExit' || sm.movementType === 'Loss' ? '−' : '+'}{sm.quantity}
                          </td>
                          <td className={td}>{sm.lotNumber ? <span className="font-mono text-xs text-brand-700">{sm.lotNumber}</span> : <span className="text-gray-300">—</span>}</td>
                          <td className={td}>{sm.warehouseName ?? '—'}</td>
                          <td className={td}>{sm.reference ?? <span className="text-gray-300">—</span>}</td>
                          <td className={td}><span className="text-gray-500">{sm.notes ?? '—'}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          )}
        </div>
      </div>
    </div>

    {/* ── Modal édition prix lot ── */}
    {priceEdit && (() => {
      const pr = priceEdit.lot.unitCostPriceXof
      const margin = Number(priceEdit.marginRate) / 100
      const pvCalc = pr > 0 ? Math.round(pr * (1 + margin)) : 0
      const pvFixed = Number(priceEdit.fixedPrice) || 0
      const pvFinal = pvFixed > 0 ? pvFixed : pvCalc
      const margeReelle = pr > 0 && pvFinal > 0 ? ((pvFinal - pr) / pr * 100) : null
      const isLoss = margeReelle !== null && margeReelle < 0
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Modifier le prix — Lot {priceEdit.lot.lotNumber}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{history?.product.designation}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">P.A. (FOB/u)</span>
                <span className="font-mono font-medium">{fmtXof(priceEdit.lot.unitPurchasePriceXof)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">P.R. (coût réel/u)</span>
                <span className="font-mono font-semibold text-gray-900">{fmtXof(pr)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-0.5">
                <span className="text-gray-500">PV calculé (marge)</span>
                <span className="font-mono text-blue-700">{pvCalc > 0 ? fmtXof(pvCalc) : '—'}</span>
              </div>
              <div className={`flex justify-between font-semibold ${isLoss ? 'text-red-600' : 'text-brand-700'}`}>
                <span>PV final</span>
                <span className="font-mono">{pvFinal > 0 ? fmtXof(pvFinal) : '—'}</span>
              </div>
              {margeReelle !== null && (
                <div className={`flex justify-between ${isLoss ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  <span>Marge réelle</span>
                  <span>{margeReelle.toFixed(1)}%{isLoss ? ' ⚠ PERTE' : ''}</span>
                </div>
              )}
            </div>

            {priceError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{priceError}</div>}

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Taux de marge %</label>
                <div className="relative">
                  <input
                    type="number" step="0.01" min={0} max={200}
                    value={priceEdit.marginRate}
                    onChange={e => setPriceEdit(s => s ? { ...s, marginRate: e.target.value } : s)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm text-right focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">PV fixé HT (optionnel)</label>
                <input
                  type="number" step="1" min={0}
                  value={priceEdit.fixedPrice}
                  onChange={e => setPriceEdit(s => s ? { ...s, fixedPrice: e.target.value } : s)}
                  placeholder={pvCalc > 0 ? `auto (${fmtXof(pvCalc)})` : 'Calculé depuis la marge'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="text-xs text-gray-400">Laissez vide pour utiliser le PV calculé depuis la marge.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => { setPriceEdit(null); setPriceError(null) }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePrice}
                disabled={savingPrice}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60 flex items-center gap-2"
              >
                {savingPrice && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )
    })()}
    </>
  )
}
