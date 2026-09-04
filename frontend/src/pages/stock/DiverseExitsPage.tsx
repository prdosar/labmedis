import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { stockMovementsApi, productsApi, warehousesApi } from '../../api/endpoints'
import type { StockMovementDto, ProductDto, WarehouseDto } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { BadgeVariant } from '../../components/ui/Badge'
import { Input, ComboSelect } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const EXIT_REASONS = [
  'Casse',
  'Péremption',
  'Vol',
  'Don / Donation',
  'Ajustement inventaire',
  'Autre',
]

const TYPE_LABELS: Record<string, string> = {
  Loss: 'Perte',
  Adjustment: 'Ajustement',
  Return: 'Retour client',
  SupplierReturn: 'Retour fourn.',
  PurchaseEntry: 'Entrée',
  SaleExit: 'Sortie vente',
}

const TYPE_VARIANT: Record<string, BadgeVariant> = {
  Loss: 'red',
  Adjustment: 'yellow',
  Return: 'green',
  SupplierReturn: 'yellow',
  PurchaseEntry: 'green',
  SaleExit: 'gray',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR')
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white'

const PAGE_SIZE = 20

// ─── Component ────────────────────────────────────────────────────────────────

export function DiverseExitsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<StockMovementDto[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [products, setProducts] = useState<ProductDto[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([])
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [notes, setNotes] = useState('')
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const loadItems = () => {
    setLoading(true)
    stockMovementsApi
      .getAll(page, PAGE_SIZE)
      .then(r => {
        // Filter to only show diverse exits (Loss + Adjustment)
        const diverse = r.items.filter(
          m => m.movementType === 'Loss' || m.movementType === 'Adjustment',
        )
        setItems(diverse)
        setTotal(r.totalCount)
      })
      .finally(() => setLoading(false))
  }

  useEffect(loadItems, [page])

  useEffect(() => {
    if (!showForm) return
    Promise.all([
      productsApi.getForSelect(),
      warehousesApi.getForSelect(),
    ]).then(([p, w]) => {
      setProducts(p)
      setWarehouses(w)
    })
  }, [showForm])

  const openForm = () => {
    setProductId('')
    setWarehouseId('')
    setQuantity('')
    setReason('')
    setCustomReason('')
    setNotes('')
    setExitDate(new Date().toISOString().slice(0, 10))
    setShowForm(true)
  }

  const handleSubmit = async () => {
    const finalReason = reason === 'Autre' ? customReason.trim() : reason
    if (!productId) return toast('Sélectionnez un produit.', 'error')
    if (!warehouseId) return toast('Sélectionnez un entrepôt.', 'error')
    if (!quantity || Number(quantity) <= 0) return toast('Quantité invalide.', 'error')
    if (!finalReason) return toast('Le motif est obligatoire.', 'error')

    setSaving(true)
    try {
      await stockMovementsApi.createDiverseExit({
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        purchaseLineId: null,
        quantity: Number(quantity),
        reason: finalReason,
        notes: notes || null,
        exitDate: exitDate || null,
      })
      toast('Sortie enregistrée avec succès.', 'success')
      setShowForm(false)
      loadItems()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erreur inattendue.'
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sorties diverses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Casse, péremption, vol, don, ajustement</p>
        </div>
        <Button onClick={openForm} icon={<Plus size={16} />}>
          Nouvelle sortie
        </Button>
      </div>

      {/* ─── Form ───────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Nouvelle sortie diverse</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Produit *</label>
              <ComboSelect
                value={productId}
                onChange={setProductId}
                options={products.map(p => ({ value: String(p.id), label: `${p.code} — ${p.designation}` }))}
                placeholder="Rechercher un produit…"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entrepôt *</label>
              <ComboSelect
                value={warehouseId}
                onChange={setWarehouseId}
                options={warehouses.map(w => ({ value: String(w.id), label: w.name }))}
                placeholder="Rechercher un entrepôt…"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantité sortie *</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de sortie</label>
              <input type="date" className={inputCls} value={exitDate} onChange={e => setExitDate(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motif *</label>
              <select className={inputCls} value={reason} onChange={e => setReason(e.target.value)}>
                <option value="">Sélectionner…</option>
                {EXIT_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {reason === 'Autre' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Préciser le motif *</label>
                <Input
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Motif personnalisé…"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                className={inputCls}
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observations, numéro de lot concerné…"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Valider la sortie'}
            </Button>
          </div>
        </div>
      )}

      {/* ─── List ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12 text-sm text-gray-400">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400 gap-2">
            <span>Aucune sortie diverse enregistrée</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Produit</th>
                <th className="px-4 py-3 text-left">Entrepôt</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3 text-left">Motif</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.productCode}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{item.productDesignation}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.warehouseName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(item.movementDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{Math.abs(item.quantity)}</td>
                  <td className="px-4 py-3 text-gray-700">{item.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={TYPE_VARIANT[item.movementType] ?? 'gray'}>
                      {TYPE_LABELS[item.movementType] ?? item.movementType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">
                    {item.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
