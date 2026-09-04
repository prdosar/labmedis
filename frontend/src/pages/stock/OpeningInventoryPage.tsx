import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Plus, Search, Trash2, X } from 'lucide-react'
import { productsApi, warehousesApi, stockMovementsApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'

interface LineState {
  id: string
  productId: number
  designation: string
  code: string
  supplierName: string
  warehouseId: number
  quantity: string
  unitCostPriceXof: string
  sellingPriceHt: string
  lotNumber: string
  expirationDate: string
}

const inputCls = 'w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-right text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20 placeholder:text-gray-300'
const inputClsLeft = inputCls.replace('text-right', 'text-left')

function numVal(s: string): number { return parseFloat(s.replace(',', '.')) || 0 }

let idSeq = 0
function nextId() { idSeq += 1; return `l${idSeq}` }

export function OpeningInventoryPage() {
  const { toast } = useToast()
  const [lines, setLines] = useState<LineState[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [search, setSearch] = useState('')
  const [done, setDone] = useState(false)
  const [existingStock, setExistingStock] = useState(false)
  const warehouseDefault = useRef<number>(0)

  useEffect(() => {
    Promise.all([
      productsApi.getAll(1, 500),
      warehousesApi.getForSelect(),
    ]).then(([prods, whs]) => {
      const wh = whs[0]
      warehouseDefault.current = wh?.id ?? 0

      const sorted = [...prods.items].sort((a, b) =>
        (a.supplierName ?? '').localeCompare(b.supplierName ?? '', 'fr') ||
        a.designation.localeCompare(b.designation, 'fr'),
      )
      setLines(sorted.map(p => ({
        id: nextId(),
        productId: p.id,
        designation: p.designation,
        code: p.code,
        supplierName: p.supplierName ?? '—',
        warehouseId: wh?.id ?? 0,
        quantity: '',
        unitCostPriceXof: '',
        sellingPriceHt: '',
        lotNumber: '',
        expirationDate: '',
      })))

      if (prods.items.some(p => p.stockQuantity > 0)) setExistingStock(true)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function setLine(id: string, patch: Partial<LineState>) {
    setLines(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  function addLotAfter(id: string) {
    setLines(ls => {
      const idx = ls.findIndex(l => l.id === id)
      if (idx === -1) return ls
      const src = ls[idx]
      const newLine: LineState = {
        id: nextId(),
        productId: src.productId,
        designation: src.designation,
        code: src.code,
        supplierName: src.supplierName,
        warehouseId: src.warehouseId,
        quantity: '',
        unitCostPriceXof: src.unitCostPriceXof,
        sellingPriceHt: src.sellingPriceHt,
        lotNumber: '',
        expirationDate: '',
      }
      let insertAt = idx + 1
      while (insertAt < ls.length && ls[insertAt].productId === src.productId) insertAt += 1
      return [...ls.slice(0, insertAt), newLine, ...ls.slice(insertAt)]
    })
  }

  function removeLine(id: string) {
    setLines(ls => ls.filter(l => l.id !== id))
  }

  const filledLines = lines.filter(l => numVal(l.quantity) > 0)

  const filtered = useMemo(() => lines.filter(l =>
    !search ||
    l.designation.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase()) ||
    l.supplierName.toLowerCase().includes(search.toLowerCase()),
  ), [lines, search])

  const productLotCount = useMemo(() => {
    const map = new Map<number, number>()
    lines.forEach(l => map.set(l.productId, (map.get(l.productId) ?? 0) + 1))
    return map
  }, [lines])

  async function handleSave() {
    if (filledLines.length === 0) {
      toast('Saisissez au moins une quantité.', 'error')
      return
    }
    setSaving(true)
    try {
      await stockMovementsApi.postOpeningInventory({
        date,
        lines: filledLines.map(l => ({
          productId: l.productId,
          warehouseId: l.warehouseId,
          quantity: Math.round(numVal(l.quantity)),
          unitCostPriceXof: numVal(l.unitCostPriceXof),
          sellingPriceHt: numVal(l.sellingPriceHt),
          lotNumber: l.lotNumber.trim() || null,
          expirationDate: l.expirationDate || null,
        })),
      })
      setDone(true)
      const productCount = new Set(filledLines.map(l => l.productId)).size
      toast(`Inventaire d'ouverture enregistré — ${filledLines.length} lot(s) sur ${productCount} produit(s).`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement.", 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (done) {
    const productCount = new Set(filledLines.map(l => l.productId)).size
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <CheckCircle2 size={48} className="text-green-500" />
        <p className="text-xl font-semibold text-gray-800">Inventaire d'ouverture enregistré</p>
        <p className="text-sm text-gray-500">{filledLines.length} lot(s) sur {productCount} produit(s) en stock. Vous pouvez maintenant traiter des commandes clients.</p>
        <Button onClick={() => window.location.reload()}>
          Saisir un autre inventaire
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">
            Saisissez les quantités et prix actuels de chaque produit en stock.
            Cliquez sur <span className="inline-flex items-center gap-0.5 font-medium"><Plus size={12} className="inline" /> Lot</span> pour ajouter plusieurs lots (dates d'expiration différentes) au même produit.
            Les lignes avec quantité = 0 sont ignorées.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-sm font-medium text-gray-700">Date d'inventaire</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{filledLines.length} lot(s) saisi(s)</span>
          <Button onClick={handleSave} loading={saving} disabled={filledLines.length === 0}>
            Enregistrer l'inventaire
          </Button>
        </div>
      </div>

      {existingStock && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Du stock existe déjà dans le système. Soumettre un nouvel inventaire ajoutera des quantités supplémentaires.</span>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Filtrer par produit ou fournisseur…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '980px' }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Code</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Produit</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Fournisseur</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Qté</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">PA/u (XOF)</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">PV HT/u (XOF)</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">N° lot</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Expiration</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((l, filteredIdx) => {
                const prevSameProduct = filteredIdx > 0 && filtered[filteredIdx - 1].productId === l.productId
                const isFirstOfProduct = !prevSameProduct
                const totalLotsForProduct = productLotCount.get(l.productId) ?? 1
                const canRemove = totalLotsForProduct > 1
                const hasFill = numVal(l.quantity) > 0

                return (
                  <tr
                    key={l.id}
                    className={`transition-colors ${hasFill ? 'bg-green-50/40' : 'hover:bg-gray-50/50'} ${!isFirstOfProduct ? 'border-t-0' : ''}`}
                  >
                    <td className="px-4 py-2">
                      {isFirstOfProduct ? (
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{l.code}</span>
                      ) : (
                        <span className="text-xs text-gray-300 pl-2">↳ lot</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {isFirstOfProduct ? l.designation : <span className="text-xs text-gray-400 italic">même produit</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-0">
                      {isFirstOfProduct ? l.supplierName : ''}
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={l.quantity}
                        onChange={e => setLine(l.id, { quantity: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={l.unitCostPriceXof}
                        onChange={e => setLine(l.id, { unitCostPriceXof: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={l.sellingPriceHt}
                        onChange={e => setLine(l.id, { sellingPriceHt: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="text"
                        placeholder="optionnel"
                        value={l.lotNumber}
                        onChange={e => setLine(l.id, { lotNumber: e.target.value })}
                        className={inputClsLeft}
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="date"
                        value={l.expirationDate}
                        onChange={e => setLine(l.id, { expirationDate: e.target.value })}
                        className={inputClsLeft}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => addLotAfter(l.id)}
                          title="Ajouter un lot pour ce produit"
                          className="p-1 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                        {canRemove && !isFirstOfProduct && (
                          <button
                            type="button"
                            onClick={() => removeLine(l.id)}
                            title="Supprimer ce lot"
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filledLines.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-sm text-gray-600">
            {filledLines.length} lot(s) — {new Set(filledLines.map(l => l.productId)).size} produit(s)
          </span>
          <Button onClick={handleSave} loading={saving}>
            Enregistrer l'inventaire
          </Button>
        </div>
      )}
    </div>
  )
}
