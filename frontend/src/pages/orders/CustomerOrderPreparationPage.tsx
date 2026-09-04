import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, CheckCircle, Package } from 'lucide-react'
import { customerOrdersApi } from '../../api/endpoints'
import type { CustomerOrderDto, CustomerOrderSuggestedLotDto } from '../../api/types'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'


function fmtDate(s: string | null) {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('fr-FR') } catch { return s }
}

function expiryClass(d: string | null): string {
  if (!d) return 'text-gray-400'
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 3600 * 24)
  if (diff < 90) return 'text-red-600 font-semibold'
  if (diff < 180) return 'text-amber-600 font-medium'
  return 'text-gray-700'
}

interface LotAllocation {
  orderLineId: number
  purchaseLineId: number
  lotNumber: string
  expirationDate: string | null
  availableStock: number
  quantity: string  // editable
}

export function CustomerOrderPreparationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [order, setOrder] = useState<CustomerOrderDto | null>(null)
  const [suggestions, setSuggestions] = useState<CustomerOrderSuggestedLotDto[]>([])
  const [allocations, setAllocations] = useState<LotAllocation[][]>([])  // per order line
  const [preparationDate, setPreparationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      customerOrdersApi.getById(Number(id)),
      customerOrdersApi.getSuggestedLots(Number(id)),
    ])
      .then(([o, s]) => {
        setOrder(o)
        setSuggestions(s)
        // Initialize allocations from suggestions
        setAllocations(s.map(line =>
          line.lots.map(lot => ({
            orderLineId: line.orderLineId,
            purchaseLineId: lot.purchaseLineId,
            lotNumber: lot.lotNumber,
            expirationDate: lot.expirationDate,
            availableStock: lot.availableStock,
            quantity: String(lot.suggestedQuantity),
          }))
        ))
      })
      .catch(() => toast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  function updateQty(lineIdx: number, lotIdx: number, val: string) {
    setAllocations(prev => prev.map((line, i) =>
      i !== lineIdx ? line : line.map((lot, j) => j !== lotIdx ? lot : { ...lot, quantity: val })
    ))
  }

  function lineAllocatedTotal(lineIdx: number): number {
    return allocations[lineIdx]?.reduce((s, l) => s + (parseInt(l.quantity) || 0), 0) ?? 0
  }

  function lineIsOk(lineIdx: number): boolean {
    const needed = suggestions[lineIdx]?.lineQuantity ?? 0
    return lineAllocatedTotal(lineIdx) === needed
  }

  const allOk = suggestions.every((_, i) => lineIsOk(i))

  async function handleConfirm() {
    setSaving(true)
    try {
      const lots = allocations.flat().filter(l => (parseInt(l.quantity) || 0) > 0).map(l => ({
        orderLineId: l.orderLineId,
        purchaseLineId: l.purchaseLineId,
        quantityAllocated: parseInt(l.quantity) || 0,
      }))
      const updated = await customerOrdersApi.prepare(Number(id), lots, preparationDate || null)
      toast('Préparation confirmée.')
      navigate(`/orders/customers/${updated.id}`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur lors de la confirmation.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Chargement…</div>
  if (!order) return null

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/orders/customers/${id}`)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Préparation — {order.reference}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Assignez un numéro de lot FIFO à chaque produit avant livraison
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Package size={15} className="mt-0.5 shrink-0 text-blue-500" />
        <span>
          Les lots sont proposés par ordre de <strong>date d'expiration la plus proche</strong> (FEFO).
          Vous pouvez ajuster la répartition si un lot est inutilisable.
          La somme des quantités doit correspondre exactement à la quantité commandée.
        </span>
      </div>

      {/* Preparation date */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <label className="text-sm font-medium text-gray-700">Date de préparation</label>
        <input
          type="date"
          value={preparationDate}
          onChange={e => setPreparationDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
        />
        <span className="text-xs text-gray-400">Par défaut : aujourd'hui.</span>
      </div>

      {/* Per line */}
      {suggestions.map((line, lineIdx) => {
        const allocated = lineAllocatedTotal(lineIdx)
        const needed = line.lineQuantity
        const ok = lineIsOk(lineIdx)

        return (
          <div key={line.orderLineId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Line header */}
            <div className={`px-5 py-3 border-b flex items-center justify-between ${ok ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center gap-3">
                {ok
                  ? <CheckCircle size={16} className="text-green-500" />
                  : <AlertTriangle size={16} className="text-amber-500" />
                }
                <div>
                  <p className="text-sm font-semibold text-gray-900">{line.productDesignation}</p>
                  <p className="text-xs text-gray-400 font-mono">{line.productCode}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${ok ? 'text-green-700' : 'text-amber-700'}`}>
                  {allocated} / {needed} unités allouées
                </p>
                {!ok && allocated > needed && (
                  <p className="text-xs text-red-500">Excès : {allocated - needed}</p>
                )}
                {!ok && allocated < needed && (
                  <p className="text-xs text-amber-600">Manque : {needed - allocated}</p>
                )}
              </div>
            </div>

            {/* Lot rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '640px' }}>
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 text-left">N° Lot</th>
                    <th className="px-4 py-2.5 text-left">Date exp.</th>
                    <th className="px-4 py-2.5 text-right">Dispo</th>
                    <th className="px-4 py-2.5 text-right w-32">Qté à prendre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allocations[lineIdx]?.map((lot, lotIdx) => {
                    const qty = parseInt(lot.quantity) || 0
                    const overStock = qty > lot.availableStock
                    return (
                      <tr key={lot.purchaseLineId} className={qty > 0 ? 'bg-blue-50/30' : ''}>
                        <td className="px-4 py-2.5 font-mono text-gray-800 font-medium">{lot.lotNumber}</td>
                        <td className={`px-4 py-2.5 ${expiryClass(lot.expirationDate)}`}>
                          {fmtDate(lot.expirationDate)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{lot.availableStock}</td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            min={0}
                            max={lot.availableStock}
                            value={lot.quantity}
                            onChange={e => updateQty(lineIdx, lotIdx, e.target.value)}
                            className={`w-24 rounded-lg border px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                              overStock
                                ? 'border-red-400 bg-red-50 text-red-700'
                                : qty > 0
                                ? 'border-brand-300 bg-brand-50 text-brand-800 font-semibold'
                                : 'border-gray-200 bg-white text-gray-700'
                            }`}
                          />
                          {overStock && (
                            <p className="text-xs text-red-500 mt-0.5 text-right">Max {lot.availableStock}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* Summary + confirm */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold text-gray-800">Récapitulatif de préparation</p>
          <div className="flex flex-col gap-0.5 text-xs text-gray-500">
            {suggestions.map((line, i) => (
              <span key={line.orderLineId} className={lineIsOk(i) ? 'text-green-600' : 'text-amber-600'}>
                {lineIsOk(i) ? '✓' : '!'} {line.productDesignation} — {lineAllocatedTotal(i)}/{line.lineQuantity}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button variant="secondary" onClick={() => navigate(`/orders/customers/${id}`)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} loading={saving} disabled={!allOk}>
            Confirmer la préparation
          </Button>
        </div>
      </div>
    </div>
  )
}
