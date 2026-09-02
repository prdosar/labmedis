import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Search, X } from 'lucide-react'
import { productsApi, warehousesApi, stockMovementsApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'

interface LineState {
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

      // Vérifie si du stock existe déjà
      if (prods.items.some(p => p.stockQuantity > 0)) setExistingStock(true)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function setLine(idx: number, patch: Partial<LineState>) {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  const filledLines = lines.filter(l => numVal(l.quantity) > 0)

  const filtered = lines.filter(l =>
    !search ||
    l.designation.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase()) ||
    l.supplierName.toLowerCase().includes(search.toLowerCase()),
  )

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
      toast(`Inventaire d'ouverture enregistré — ${filledLines.length} produit(s).`)
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
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <CheckCircle2 size={48} className="text-green-500" />
        <p className="text-xl font-semibold text-gray-800">Inventaire d'ouverture enregistré</p>
        <p className="text-sm text-gray-500">{filledLines.length} produit(s) en stock. Vous pouvez maintenant traiter des commandes clients.</p>
        <Button onClick={() => { setDone(false); setLines(ls => ls.map(l => ({ ...l, quantity: '', unitCostPriceXof: '', sellingPriceHt: '', lotNumber: '', expirationDate: '' }))) }}>
          Saisir un autre inventaire
        </Button>
      </div>
    )
  }

  // Group lines by supplier for display
  const supplierGroups: Record<string, number[]> = {}
  filtered.forEach((l, displayIdx) => {
    const key = l.supplierName
    if (!supplierGroups[key]) supplierGroups[key] = []
    supplierGroups[key].push(displayIdx)
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">
            Saisissez les quantités et prix actuels de chaque produit en stock.
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
          <span className="text-sm text-gray-500">{filledLines.length} produit(s) saisi(s)</span>
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

      {/* Search */}
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '900px' }}>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((l) => {
                const origIdx = lines.findIndex(x => x.productId === l.productId)
                const hasFill = numVal(l.quantity) > 0

                return (
                  <tr
                    key={l.productId}
                    className={`transition-colors ${hasFill ? 'bg-green-50/40' : 'hover:bg-gray-50/50'}`}
                  >
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{l.code}</span>
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-800">{l.designation}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-0">{l.supplierName}</td>
                    <td className="px-4 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={l.quantity}
                        onChange={e => setLine(origIdx, { quantity: e.target.value })}
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
                        onChange={e => setLine(origIdx, { unitCostPriceXof: e.target.value })}
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
                        onChange={e => setLine(origIdx, { sellingPriceHt: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="text"
                        placeholder="optionnel"
                        value={l.lotNumber}
                        onChange={e => setLine(origIdx, { lotNumber: e.target.value })}
                        className={inputClsLeft}
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="date"
                        value={l.expirationDate}
                        onChange={e => setLine(origIdx, { expirationDate: e.target.value })}
                        className={inputClsLeft}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer total */}
      {filledLines.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-sm text-gray-600">{filledLines.length} produit(s) renseigné(s)</span>
          <Button onClick={handleSave} loading={saving}>
            Enregistrer l'inventaire
          </Button>
        </div>
      )}
    </div>
  )
}
