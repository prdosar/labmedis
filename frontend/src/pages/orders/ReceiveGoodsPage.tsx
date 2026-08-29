import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { SupplierOrderDto } from '../../api/types'
import { supplierOrdersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { fmtXof, fmtNum } from '../../utils/format'

const EUR_XOF = 655.957

// Grid: Produit | Cmd | Reçue | Prix FOB | N° Lot | Expiration | PV HT | PA calculé
const GRID_TPL = '1.5fr 3.5rem 4rem 6rem 9rem 8rem 6.5rem 6.5rem'

interface GoodsLineState {
  orderLineId: number
  productDesignation: string
  packagingName: string | null
  dosageName: string | null
  orderedQuantity: number
  orderUnit: string
  lotNumber: string
  quantity: string
  unitFobPrice: string
  expirationDate: string
  targetSellingPriceHt: string
}

function computePA(
  unitFobPrice: string,
  exchangeRate: string,
  commCoeff: string,
  freightCoeff: string,
  transitCoeff: string,
  transferCoeff: string,
): number {
  const fob = Number(unitFobPrice) || 0
  const rate = Number(exchangeRate) || 0
  const comm = Number(commCoeff) || 1
  const freight = Number(freightCoeff) || 1
  const transit = Number(transitCoeff) || 1
  const transfer = Number(transferCoeff) || 1
  if (fob === 0 || rate === 0) return 0
  return fob * rate * comm * freight * transit * transfer
}

export function ReceiveGoodsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [order, setOrder] = useState<SupplierOrderDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Header fields
  const [arrivalDate, setArrivalDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [exchangeRateToXof, setExchangeRateToXof] = useState(String(EUR_XOF))
  const [commissionCoefficient, setCommissionCoefficient] = useState('1.0')
  const [freightCoefficient, setFreightCoefficient] = useState('1.0')
  const [transitCoefficient, setTransitCoefficient] = useState('1.0')
  const [transferFeesCoefficient, setTransferFeesCoefficient] = useState('1.0')
  const [defaultMarginCoefficient, setDefaultMarginCoefficient] = useState('1.3')
  const [notes, setNotes] = useState('')

  // Lines
  const [lines, setLines] = useState<GoodsLineState[]>([])

  useEffect(() => {
    if (!id) return
    supplierOrdersApi.getById(Number(id))
      .then(o => {
        setOrder(o)
        if (o.currency === 'EUR') setExchangeRateToXof(String(EUR_XOF))
        else if (o.currency === 'XOF') setExchangeRateToXof('1')
        setLines(
          o.lines.map(l => ({
            orderLineId: l.id,
            productDesignation: l.productDesignation,
            packagingName: l.packagingName,
            dosageName: l.dosageName,
            orderedQuantity: l.quantity,
            orderUnit: l.orderUnit,
            lotNumber: '',
            quantity: String(l.quantity),
            unitFobPrice: l.unitFobPrice != null ? String(l.unitFobPrice) : '',
            expirationDate: '',
            targetSellingPriceHt: '',
          })),
        )
      })
      .catch(() => toast('Commande introuvable.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  function updateLine(idx: number, patch: Partial<GoodsLineState>) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  async function handleSave() {
    const emptyLot = lines.find(l => !l.lotNumber.trim())
    if (emptyLot) {
      setFormError(`Numéro de lot manquant pour : ${emptyLot.productDesignation}`)
      return
    }
    const invalidQty = lines.find(l => !l.quantity || Number(l.quantity) <= 0)
    if (invalidQty) {
      setFormError(`Quantité invalide pour : ${invalidQty.productDesignation}`)
      return
    }
    const missingFob = lines.find(l => !l.unitFobPrice || Number(l.unitFobPrice) <= 0)
    if (missingFob) {
      setFormError(`Prix FOB manquant pour : ${missingFob.productDesignation}`)
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      await supplierOrdersApi.receiveGoods(Number(id), {
        arrivalDate,
        exchangeRateToXof: Number(exchangeRateToXof),
        commissionCoefficient: Number(commissionCoefficient),
        freightCoefficient: Number(freightCoefficient),
        transitCoefficient: Number(transitCoefficient),
        transferFeesCoefficient: Number(transferFeesCoefficient),
        defaultMarginCoefficient: Number(defaultMarginCoefficient),
        notes: notes.trim() || null,
        lines: lines.map(l => ({
          orderLineId: l.orderLineId,
          lotNumber: l.lotNumber.trim(),
          quantity: Number(l.quantity),
          unitFobPrice: Number(l.unitFobPrice),
          expirationDate: l.expirationDate || null,
          targetSellingPriceHt: l.targetSellingPriceHt ? Number(l.targetSellingPriceHt) : null,
        })),
      })
      toast('Marchandises réceptionnées — entrée stock créée.', 'success')
      navigate('/orders/suppliers')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Erreur lors de la réception.")
    } finally {
      setSaving(false)
    }
  }


  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Chargement…</div>
  if (!order) return null

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
          Réception marchandises — {order.reference}
        </h2>
      </div>

      {formError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {formError}
        </div>
      )}

      <div className="flex gap-5 items-start">
        {/* Left column */}
        <div className="w-3/4 min-w-0 flex flex-col gap-5">

          {/* Header card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Paramètres de la réception</p>
            <div className="grid grid-cols-4 gap-4">
              <Field label="Date d'arrivée *">
                <input
                  type="date"
                  value={arrivalDate}
                  onChange={e => setArrivalDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Taux de change → XOF *">
                <input
                  type="number"
                  step="0.001"
                  min={0}
                  value={exchangeRateToXof}
                  onChange={e => setExchangeRateToXof(e.target.value)}
                  placeholder="655.957"
                  className={inputCls}
                />
              </Field>
              <Field label="Coeff. Commission">
                <input
                  type="number"
                  step="0.001"
                  min={1}
                  value={commissionCoefficient}
                  onChange={e => setCommissionCoefficient(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Coeff. Fret">
                <input
                  type="number"
                  step="0.001"
                  min={1}
                  value={freightCoefficient}
                  onChange={e => setFreightCoefficient(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Coeff. Transit">
                <input
                  type="number"
                  step="0.001"
                  min={1}
                  value={transitCoefficient}
                  onChange={e => setTransitCoefficient(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Coeff. Transfert">
                <input
                  type="number"
                  step="0.001"
                  min={1}
                  value={transferFeesCoefficient}
                  onChange={e => setTransferFeesCoefficient(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Coeff. Marge défaut">
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  value={defaultMarginCoefficient}
                  onChange={e => setDefaultMarginCoefficient(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Notes">
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observations…"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Lines card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Lignes de réception</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Saisir N° lot, quantité réceptionnée, prix FOB et date d'expiration par produit
              </p>
            </div>

            {/* Column headers */}
            <div
              className="px-5 py-2 border-b border-gray-100 grid gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide"
              style={{ gridTemplateColumns: GRID_TPL }}
            >
              <span>Produit</span>
              <span className="text-right">Cmd</span>
              <span className="text-right">Reçue</span>
              <span className="text-right">Prix FOB</span>
              <span>N° Lot *</span>
              <span>Expiration</span>
              <span className="text-right">PV HT</span>
              <span className="text-right">PA calc.</span>
            </div>

            <div className="divide-y divide-gray-50">
              {lines.map((line, idx) => {
                const pa = computePA(
                  line.unitFobPrice,
                  exchangeRateToXof,
                  commissionCoefficient,
                  freightCoefficient,
                  transitCoefficient,
                  transferFeesCoefficient,
                )
                const label = `${line.productDesignation}${line.packagingName ? ` (${line.packagingName})` : ''}`
                return (
                  <div
                    key={line.orderLineId}
                    className="px-5 py-2.5 grid gap-2 items-center"
                    style={{ gridTemplateColumns: GRID_TPL }}
                  >
                    <div>
                      <div className="text-sm text-gray-900 truncate">{label}</div>
                      {line.dosageName && (
                        <div className="text-xs text-gray-400">{line.dosageName}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 text-right">
                      {line.orderedQuantity}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={line.orderedQuantity}
                      value={line.quantity}
                      onChange={e => updateLine(idx, { quantity: e.target.value })}
                      className={`${inputCls} text-right px-2 py-1`}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={line.unitFobPrice}
                      onChange={e => updateLine(idx, { unitFobPrice: e.target.value })}
                      placeholder="0.00"
                      className={`${inputCls} text-right px-2 py-1`}
                    />
                    <input
                      value={line.lotNumber}
                      onChange={e => updateLine(idx, { lotNumber: e.target.value })}
                      placeholder="LOT-2026-…"
                      className={`${inputCls} px-2 py-1`}
                    />
                    <input
                      type="date"
                      value={line.expirationDate}
                      onChange={e => updateLine(idx, { expirationDate: e.target.value })}
                      className={`${inputCls} px-2 py-1`}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={line.targetSellingPriceHt}
                      onChange={e => updateLine(idx, { targetSellingPriceHt: e.target.value })}
                      placeholder="auto"
                      className={`${inputCls} text-right px-2 py-1`}
                    />
                    <div className="text-sm font-medium text-right">
                      {pa > 0 ? (
                        <span className="text-gray-900">{fmtNum(pa, 2)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* PA formula reminder */}
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/60">
              <p className="text-xs text-gray-400">
                PA calculé = Prix FOB × Taux XOF × Coeff. Commission × Coeff. Fret × Coeff. Transit × Coeff. Transfert
              </p>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-1/4 shrink-0 sticky top-6 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Commande</p>
            <p className="text-sm font-semibold text-gray-900">{order.supplierName}</p>
            <p className="mt-2 text-xs font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded inline-block">
              {order.reference}
            </p>
            {order.invoice && (
              <div className="mt-3 text-xs text-gray-500">
                <p>Facture : <strong>{order.invoice.invoiceReference}</strong></p>
                <p className="mt-1">
                  {fmtXof(order.invoice.totalAmountXof)}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-700">Récapitulatif</p>
            {lines.map(line => {
              const pa = computePA(
                line.unitFobPrice,
                exchangeRateToXof,
                commissionCoefficient,
                freightCoefficient,
                transitCoefficient,
                transferFeesCoefficient,
              )
              const qty = Number(line.quantity) || 0
              return (
                <div key={line.orderLineId} className="text-xs">
                  <div className="text-gray-700 font-medium truncate">{line.productDesignation}</div>
                  <div className="flex justify-between text-gray-500 mt-0.5">
                    <span>PA × {qty}</span>
                    <span>{pa > 0 && qty > 0 ? fmtXof(pa * qty) : '—'}</span>
                  </div>
                </div>
              )
            })}
            {lines.length > 0 && (
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-3">
                <span className="text-gray-800">Total PA</span>
                <span className="text-gray-900">
                  {fmtXof(lines.reduce((acc, l) => {
                    const pa = computePA(l.unitFobPrice, exchangeRateToXof, commissionCoefficient, freightCoefficient, transitCoefficient, transferFeesCoefficient)
                    return acc + pa * (Number(l.quantity) || 0)
                  }, 0))}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} loading={saving} className="w-full justify-center">
              Réceptionner les marchandises
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
