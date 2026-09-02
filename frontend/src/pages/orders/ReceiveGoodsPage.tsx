import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, AlertTriangle, TrendingUp, ChevronDown, ChevronUp, Plus, X, Camera } from 'lucide-react'
import type { SupplierOrderDto } from '../../api/types'
import { supplierOrdersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { fmtXof, fmtNum } from '../../utils/format'

const EUR_XOF = 655.957
const TRANSPORT_MODES = ['Maritime', 'Aérien', 'Terrestre']

// Reception grid — 7 colonnes, produit 1fr absorbe l'espace résiduel (pas de colonne vide à droite)
const RECV_GRID = 'minmax(160px,1fr) 140px 130px 80px 75px 85px 52px'

// Pricing grid: Produit | U/ctn | FOB/ctn | PA/u | PR calculé | Marge % | PV calculé | PV fixé | Marge réelle
const PRICE_GRID = '1.5fr 4rem 5.5rem 5.5rem 6rem 4.5rem 6.5rem 6.5rem 5rem'

const CHARGE_DEFS = [
  { key: 'commission', label: 'Commission',      account: '6342' },
  { key: 'freight',    label: 'Fret',            account: '6241' },
  { key: 'transit',    label: 'Transit',         account: '6248' },
  { key: 'transfer',   label: 'Frais transfert', account: '6288' },
] as const

type ChargeKey = typeof CHARGE_DEFS[number]['key']

interface GoodsLineState {
  lineKey: string
  orderLineId: number
  productCode: string
  productDesignation: string
  packagingName: string | null
  dosageName: string | null
  orderedQuantity: number       // en cartons (depuis la commande)
  orderUnit: string
  unitsPerCarton: string        // connu depuis le conditionnement produit
  unitFobPricePerCarton: string // FOB par carton (saisie dans la grille prix)
  lotNumber: string
  quantityCartons: string       // cartons physiques reçus (saisie)
  quantityLostBoxes: string     // boîtes perdues (peut être fraction d'un carton)
  expirationDate: string
  marginRate: string
  fixedSellingPriceHt: string
}

// Total boîtes = cartons × u/ctn (auto-calculé)
function totalBoxes(line: GoodsLineState): number {
  return (Number(line.quantityCartons) || 0) * Math.max(1, Number(line.unitsPerCarton) || 1)
}

// Bonnes boîtes entrant en stock
function goodBoxes(line: GoodsLineState): number {
  return Math.max(0, totalBoxes(line) - (Number(line.quantityLostBoxes) || 0))
}

// PA par boîte = (FOB/carton × taux) / U/ctn
function paUnitXof(line: GoodsLineState, exchangeRate: string): number {
  const fob = Number(line.unitFobPricePerCarton) || 0
  const upc = Math.max(1, Number(line.unitsPerCarton) || 1)
  const rate = Number(exchangeRate) || 0
  if (fob === 0 || rate === 0) return 0
  return (fob * rate) / upc
}

interface PricingCalc {
  paUnit: number
  prUnit: number
  pvCalc: number
  pvFinal: number
  margeReelle: number
}

function calcLinePricing(
  line: GoodsLineState,
  exchangeRate: string,
  rates: Record<ChargeKey, string>,
): PricingCalc {
  const pa = paUnitXof(line, exchangeRate)
  // Les boîtes perdues font l'objet d'un avoir fournisseur — elles n'affectent pas le PA ni le PR.
  const comm   = (Number(rates.commission) || 0) / 100
  const frt    = (Number(rates.freight)    || 0) / 100
  const trs    = (Number(rates.transit)    || 0) / 100
  const trf    = (Number(rates.transfer)   || 0) / 100
  const margin = (Number(line.marginRate)  || 0) / 100

  const multiplier = (1 + comm) * (1 + frt) * (1 + trs) * (1 + trf)
  const prUnit = pa * multiplier
  const pvCalc = prUnit * (1 + margin)
  const pvFixed = Number(line.fixedSellingPriceHt) || 0
  const pvFinal = pvFixed > 0 ? pvFixed : pvCalc
  const margeReelle = prUnit > 0 ? ((pvFinal - prUnit) / prUnit) * 100 : 0

  return { paUnit: pa, prUnit, pvCalc, pvFinal, margeReelle }
}

export function ReceiveGoodsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [order, setOrder] = useState<SupplierOrderDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pricingOpen, setPricingOpen] = useState(true)

  const [arrivalDate, setArrivalDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [transportMode, setTransportMode] = useState('Maritime')
  const [exchangeRateToXof, setExchangeRateToXof] = useState(String(EUR_XOF))
  const [notes, setNotes] = useState('')

  const [rates, setRates] = useState<Record<ChargeKey, string>>({
    commission: '25', freight: '3', transit: '9', transfer: '7',
  })

  const [lines, setLines] = useState<GoodsLineState[]>([])
  const [linePhotos, setLinePhotos] = useState<Record<string, File[]>>({})
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Record<string, string[]>>({})
  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    const urlMap: Record<string, string[]> = {}
    for (const [key, files] of Object.entries(linePhotos)) {
      urlMap[key] = files.map(f => URL.createObjectURL(f))
    }
    setPhotoPreviewUrls(urlMap)
    return () => { Object.values(urlMap).flat().forEach(u => URL.revokeObjectURL(u)) }
  }, [linePhotos])

  useEffect(() => {
    if (!id) return
    supplierOrdersApi.getById(Number(id))
      .then(o => {
        setOrder(o)
        if (o.currency === 'EUR') setExchangeRateToXof(String(EUR_XOF))
        else if (o.currency === 'XOF') setExchangeRateToXof('1')
        setLines(
          o.lines.map((l, idx) => ({
            lineKey: `${l.id}-${idx}`,
            orderLineId: l.id,
            productCode: l.productCode,
            productDesignation: l.productDesignation,
            packagingName: l.packagingName,
            dosageName: l.dosageName,
            orderedQuantity: l.quantity,
            orderUnit: l.orderUnit,
            unitsPerCarton: l.unitsPerCarton != null
              ? String(l.unitsPerCarton)
              : l.packagingUnitsPerPackaging != null
                ? String(l.packagingUnitsPerPackaging)
                : '1',
            unitFobPricePerCarton: l.unitFobPrice != null ? String(l.unitFobPrice) : '',
            lotNumber: '',
            quantityCartons: String(l.quantity),
            quantityLostBoxes: '0',
            expirationDate: '',
            marginRate: '10',
            fixedSellingPriceHt: '',
          })),
        )
      })
      .catch(() => toast('Commande introuvable.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  function updateLine(lineKey: string, patch: Partial<GoodsLineState>) {
    setLines(prev => prev.map(l => l.lineKey === lineKey ? { ...l, ...patch } : l))
  }

  function updateRate(key: ChargeKey, val: string) {
    setRates(prev => ({ ...prev, [key]: val }))
  }

  function addLotLine(lineKey: string) {
    setLines(prev => {
      const template = prev.find(l => l.lineKey === lineKey)
      if (!template) return prev
      const newLine: GoodsLineState = {
        ...template,
        lineKey: `${template.orderLineId}-${Date.now()}`,
        lotNumber: '',
        quantityCartons: '',
        quantityLostBoxes: '0',
        expirationDate: '',
      }
      let lastIdx = -1
      prev.forEach((l, i) => { if (l.orderLineId === template.orderLineId) lastIdx = i })
      const next = [...prev]
      next.splice(lastIdx + 1, 0, newLine)
      return next
    })
  }

  function removeLotLine(lineKey: string) {
    setLines(prev => {
      const line = prev.find(l => l.lineKey === lineKey)
      if (!line) return prev
      if (prev.filter(l => l.orderLineId === line.orderLineId).length <= 1) return prev
      return prev.filter(l => l.lineKey !== lineKey)
    })
    setLinePhotos(prev => { const n = { ...prev }; delete n[lineKey]; return n })
  }

  function handlePhotoSelect(lineKey: string, files: FileList | null) {
    if (!files || files.length === 0) return
    setLinePhotos(prev => ({
      ...prev,
      [lineKey]: [...(prev[lineKey] ?? []), ...Array.from(files)],
    }))
    const input = photoInputRefs.current[lineKey]
    if (input) input.value = ''
  }

  function removePhoto(lineKey: string, fileIdx: number) {
    setLinePhotos(prev => ({
      ...prev,
      [lineKey]: (prev[lineKey] ?? []).filter((_, i) => i !== fileIdx),
    }))
  }

  async function handleSave() {
    const emptyLot = lines.find(l => !l.lotNumber.trim())
    if (emptyLot) { setFormError(`N° lot manquant : ${emptyLot.productDesignation}`); return }
    const invalidQty = lines.find(l => !l.quantityCartons || Number(l.quantityCartons) <= 0)
    if (invalidQty) { setFormError(`Quantité invalide : ${invalidQty.productDesignation}`); return }
    const missingFob = lines.find(l => !l.unitFobPricePerCarton || Number(l.unitFobPricePerCarton) <= 0)
    if (missingFob) { setFormError(`Prix FOB manquant : ${missingFob.productDesignation}`); return }
    const badLost = lines.find(l => Number(l.quantityLostBoxes) > totalBoxes(l))
    if (badLost) { setFormError(`Boîtes perdues > boîtes reçues : ${badLost.productDesignation}`); return }

    const lossLine = lines.find(l => {
      const p = calcLinePricing(l, exchangeRateToXof, rates)
      return p.prUnit > 0 && Number(l.fixedSellingPriceHt) > 0 && Number(l.fixedSellingPriceHt) < p.prUnit
    })
    if (lossLine) {
      const p = calcLinePricing(lossLine, exchangeRateToXof, rates)
      setFormError(
        `Prix de vente inférieur au coût — ${lossLine.productDesignation} : ` +
        `PV fixé ${Number(lossLine.fixedSellingPriceHt).toLocaleString('fr-FR')} XOF < ` +
        `PR ${Math.round(p.prUnit).toLocaleString('fr-FR')} XOF.`
      )
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      await supplierOrdersApi.receiveGoods(Number(id), {
        arrivalDate,
        transportMode,
        exchangeRateToXof: Number(exchangeRateToXof),
        notes: notes.trim() || null,
        commissionRate: (Number(rates.commission) || 0) / 100,
        freightRate:    (Number(rates.freight)    || 0) / 100,
        transitRate:    (Number(rates.transit)    || 0) / 100,
        transferRate:   (Number(rates.transfer)   || 0) / 100,
        lines: lines.map(l => {
          const upc = Math.max(1, Number(l.unitsPerCarton) || 1)
          const boxes = (Number(l.quantityCartons) || 0) * upc
          return {
            orderLineId: l.orderLineId,
            lotNumber: l.lotNumber.trim(),
            quantityCartons: boxes,                                             // envoyé en boîtes avec upc=1
            quantityLostCartons: Number(l.quantityLostBoxes) || 0,
            unitsPerCarton: 1,
            unitFobPricePerCarton: (Number(l.unitFobPricePerCarton) || 0) / upc, // converti en FOB/boîte
            expirationDate: l.expirationDate || null,
            marginRate: (Number(l.marginRate) || 10) / 100,
            fixedSellingPriceHt: Number(l.fixedSellingPriceHt) > 0 ? Number(l.fixedSellingPriceHt) : null,
          }
        }),
      })

      const photoEntries = Object.entries(linePhotos).filter(([, f]) => f.length > 0)
      if (photoEntries.length > 0) {
        try {
          await Promise.all(
            photoEntries.flatMap(([, files]) =>
              files.map(file => supplierOrdersApi.uploadDocument(Number(id), file, 'PhotoPerte'))
            )
          )
        } catch {
          toast("Arrivage enregistré. Certaines photos n'ont pas pu être uploadées.", 'error')
          navigate(`/orders/suppliers/${id}/receptions`)
          return
        }
      }
      toast('Arrivage enregistré — stock, charges et prix mis à jour.', 'success')
      navigate(`/orders/suppliers/${id}/receptions`)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Erreur lors de la réception.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Chargement…</div>
  if (!order) return null

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalFobXof = lines.reduce((acc, l) => {
    const fob = Number(l.unitFobPricePerCarton) || 0
    const rate = Number(exchangeRateToXof) || 0
    const cartons = Number(l.quantityCartons) || 0
    return acc + fob * rate * cartons
  }, 0)

  const sumGoodBoxes = lines.reduce((acc, l) => acc + goodBoxes(l), 0)
  const sumLostBoxes = lines.reduce((acc, l) => acc + (Number(l.quantityLostBoxes) || 0), 0)

  // Avoir fournisseur = FOB XOF des boîtes perdues (à réclamer en remboursement ou remplacement)
  const avoirFournisseurXof = lines.reduce((acc, l) => {
    const fobPerBox = paUnitXof(l, exchangeRateToXof)
    return acc + fobPerBox * (Number(l.quantityLostBoxes) || 0)
  }, 0)

  const commBase = totalFobXof
  const commAmt  = commBase * ((Number(rates.commission) || 0) / 100)
  const frtBase  = commBase + commAmt
  const frtAmt   = frtBase  * ((Number(rates.freight)    || 0) / 100)
  const trsBase  = frtBase  + frtAmt
  const trsAmt   = trsBase  * ((Number(rates.transit)    || 0) / 100)
  const trfBase  = trsBase  + trsAmt
  const trfAmt   = trfBase  * ((Number(rates.transfer)   || 0) / 100)

  const chargeBases: Record<ChargeKey, number>  = { commission: commBase, freight: frtBase, transit: trsBase, transfer: trfBase }
  const chargeAmounts: Record<ChargeKey, number> = { commission: commAmt,  freight: frtAmt,  transit: trsAmt,  transfer: trfAmt  }
  const totalCharges = commAmt + frtAmt + trsAmt + trfAmt
  const prTotal = totalFobXof + totalCharges
  // PR moyen pondéré par les bonnes boîtes — pas affecté par les pertes (avoir fournisseur séparé)
  const prMoyen = sumGoodBoxes > 0
    ? lines.reduce((acc, l) => {
        const p = calcLinePricing(l, exchangeRateToXof, rates)
        return acc + p.prUnit * goodBoxes(l)
      }, 0) / sumGoodBoxes
    : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/orders/suppliers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} />
          Retour aux commandes
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          Nouvel arrivage — {order.reference}
        </h2>
      </div>

      {formError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {formError}
        </div>
      )}

      <div className="flex gap-5 items-start">
        <div className="w-3/4 min-w-0 flex flex-col gap-5">

          {/* Paramètres arrivage */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Paramètres de l'arrivage</p>
            <div className="grid grid-cols-4 gap-4">
              <Field label="Date d'arrivée *">
                <input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Mode de transport *">
                <select value={transportMode} onChange={e => setTransportMode(e.target.value)} className={inputCls}>
                  {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Taux de change → XOF *">
                <input
                  type="number" step="0.001" min={0} value={exchangeRateToXof}
                  onChange={e => setExchangeRateToXof(e.target.value)}
                  placeholder="655.957" className={inputCls}
                />
              </Field>
              <Field label="Notes">
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations…" className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Lignes de réception */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Lignes de réception</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Saisir les cartons reçus — les boîtes sont calculées automatiquement (cartons × U/ctn).
                Cliquez <strong>+</strong> pour ajouter un lot différent sur le même produit.
              </p>
            </div>

            <div className="overflow-x-auto">
            <div style={{ minWidth: '780px' }}>

            {/* En-têtes */}
            <div
              className="py-2 border-b border-gray-100 grid gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50"
              style={{ gridTemplateColumns: RECV_GRID }}
            >
              <span className="sticky left-0 bg-gray-50 z-10 pl-4 pr-2">Produit</span>
              <span>N° Lot *</span>
              <span>Expiration</span>
              <span className="text-right">Cartons</span>
              <span className="text-right text-brand-600">Boîtes</span>
              <span className="text-right text-red-500 leading-tight">
                Perdues<br /><span className="normal-case font-normal text-red-400">(btes)</span>
              </span>
              <span />
            </div>

            {/* Lignes */}
            <div>
              {lines.map((line, idx) => {
                const isFirstOfGroup = idx === 0 || lines[idx - 1].orderLineId !== line.orderLineId
                const label = `${line.productDesignation}${line.packagingName ? ` (${line.packagingName})` : ''}`
                const hasSiblings = lines.filter(l => l.orderLineId === line.orderLineId).length > 1
                const photos = linePhotos[line.lineKey] ?? []
                const previews = photoPreviewUrls[line.lineKey] ?? []
                const boxes = totalBoxes(line)
                const lost = Number(line.quantityLostBoxes) || 0
                const hasLoss = lost > 0
                const upc = Math.max(1, Number(line.unitsPerCarton) || 1)

                return (
                  <div key={line.lineKey} className={`border-b border-gray-50 ${hasLoss ? 'bg-red-50/20' : ''}`}>
                    <div
                      className="py-2.5 grid gap-1.5 items-center"
                      style={{ gridTemplateColumns: RECV_GRID }}
                    >
                      {/* Produit */}
                      <div className={`min-w-0 sticky left-0 z-10 pl-4 pr-2 ${hasLoss ? 'bg-red-50/60' : 'bg-white'}`}>
                        {isFirstOfGroup ? (
                          <>
                            <div className="text-sm text-gray-900 truncate" title={label}>{label}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              <span className="font-mono">{line.productCode}</span>
                              <span className="ml-2 text-gray-300">·</span>
                              <span className="ml-2">Cmd : {line.orderedQuantity} {line.orderUnit}</span>
                              <span className="ml-2 text-gray-300">·</span>
                              <span className="ml-2">{upc} bte/ctn</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 pl-3 flex items-center gap-1 truncate" title={label}>
                            <span className="text-gray-300 shrink-0">└</span>
                            <span className="truncate">{label}</span>
                          </div>
                        )}
                      </div>

                      {/* N° Lot */}
                      <input
                        value={line.lotNumber}
                        onChange={e => updateLine(line.lineKey, { lotNumber: e.target.value })}
                        placeholder="LOT-2026-…"
                        className={`${inputCls} px-2 py-1`}
                      />

                      {/* Expiration */}
                      <input
                        type="date" value={line.expirationDate}
                        onChange={e => updateLine(line.lineKey, { expirationDate: e.target.value })}
                        className={`${inputCls} px-2 py-1`}
                      />

                      {/* Cartons reçus (input) */}
                      <input
                        type="number" min={0} value={line.quantityCartons}
                        onChange={e => updateLine(line.lineKey, { quantityCartons: e.target.value })}
                        placeholder="0"
                        className={`${inputCls} text-right px-2 py-1`}
                      />

                      {/* Boîtes totales (auto-calculé) */}
                      <div className="text-right pr-1">
                        {boxes > 0 ? (
                          <span className="text-sm font-semibold text-brand-700">{fmtNum(boxes)}</span>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </div>

                      {/* Boîtes perdues (input) */}
                      <input
                        type="number" min={0} value={line.quantityLostBoxes}
                        onChange={e => updateLine(line.lineKey, { quantityLostBoxes: e.target.value })}
                        placeholder="0"
                        className={`${inputCls} text-right px-2 py-1 ${hasLoss ? 'border-red-300 bg-red-50 text-red-700' : ''}`}
                      />

                      {/* Actions */}
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => photoInputRefs.current[line.lineKey]?.click()}
                          className={`p-0.5 rounded transition-colors ${photos.length > 0 ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-amber-500'}`}
                          title="Ajouter photo(s) des boîtes perdues"
                        >
                          <Camera size={13} />
                        </button>
                        {hasSiblings && (
                          <button
                            onClick={() => removeLotLine(line.lineKey)}
                            className="p-0.5 rounded text-gray-300 hover:text-red-400 transition-colors"
                            title="Supprimer ce lot"
                          >
                            <X size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => addLotLine(line.lineKey)}
                          className="p-0.5 rounded text-gray-400 hover:text-brand-600 transition-colors"
                          title="Ajouter un lot supplémentaire"
                        >
                          <Plus size={13} />
                        </button>
                        <input
                          type="file" accept="image/*" multiple className="hidden"
                          ref={el => { photoInputRefs.current[line.lineKey] = el }}
                          onChange={e => handlePhotoSelect(line.lineKey, e.target.files)}
                        />
                      </div>
                    </div>

                    {/* Galerie photos */}
                    {previews.length > 0 && (
                      <div className="pl-5 pb-2.5 flex flex-wrap gap-2">
                        {previews.map((url, i) => (
                          <div key={i} className="relative group shrink-0">
                            <img
                              src={url} alt={`Photo ${i + 1}`}
                              className="h-16 w-16 object-cover rounded-lg border border-gray-200 cursor-pointer"
                              onClick={() => window.open(url, '_blank')}
                            />
                            <button
                              onClick={() => removePhoto(line.lineKey, i)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              title="Supprimer cette photo"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => photoInputRefs.current[line.lineKey]?.click()}
                          className="h-16 w-16 shrink-0 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-amber-300 hover:text-amber-400 transition-colors"
                        >
                          <Camera size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            </div>
            </div>
          </div>

          {/* Grille de prix */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              className="w-full px-5 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
              onClick={() => setPricingOpen(p => !p)}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-brand-600" />
                <span className="text-sm font-semibold text-gray-700">Grille de calcul du prix de revient</span>
                <span className="text-xs text-gray-400 ml-1">Commission → Fret → Transit → Frais transfert → Marge</span>
              </div>
              {pricingOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>

            {pricingOpen && (
              <>
                {/* Charges arrivage */}
                <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/30">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Charges de l'arrivage — taux % ou montant XOF (C: 401 Fournisseurs)
                  </p>
                  <div className="grid grid-cols-4 gap-4">
                    {CHARGE_DEFS.map(def => {
                      const key = def.key as ChargeKey
                      const amt = chargeAmounts[key]
                      const base = chargeBases[key]
                      return (
                        <div key={key} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-600">{def.label}</label>
                            <span className="text-xs font-mono text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{def.account}</span>
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type="number" step="0.01" min={0} max={100}
                              value={rates[key]}
                              onChange={e => updateRate(key, e.target.value)}
                              className={`${inputCls} pr-6 py-1.5 text-right`}
                            />
                            <span className="absolute right-2 text-xs text-gray-500 pointer-events-none">%</span>
                          </div>
                          <input
                            type="number" step="1" min={0}
                            value={Math.round(amt) || ''}
                            placeholder="Montant XOF"
                            disabled={base <= 0}
                            onChange={e => {
                              const v = Number(e.target.value) || 0
                              if (base > 0) updateRate(key, String(((v / base) * 100).toFixed(4)))
                            }}
                            className={`${inputCls} py-1.5 text-right text-sm font-mono ${base <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  {totalFobXof > 0 && (
                    <div className="mt-3 flex gap-6 text-xs">
                      <span className="text-gray-500">Total charges : <strong className="text-gray-800">{fmtXof(totalCharges)}</strong></span>
                      <span className="text-gray-500">PR total : <strong className="text-brand-700">{fmtXof(prTotal)}</strong></span>
                      <span className="text-gray-500">PR moyen/boîte : <strong className="text-brand-700">{fmtXof(prMoyen)}</strong></span>
                    </div>
                  )}
                </div>

                {/* Prix par ligne */}
                <div className="overflow-x-auto">
                <div style={{ minWidth: '940px' }}>
                <div
                  className="py-2 border-b border-gray-100 grid gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50"
                  style={{ gridTemplateColumns: PRICE_GRID }}
                >
                  <span className="sticky left-0 bg-gray-50 z-10 pl-4 pr-2">Produit</span>
                  <span className="text-right">U/ctn</span>
                  <span className="text-right">FOB/ctn</span>
                  <span className="text-right">PA/u (XOF)</span>
                  <span className="text-right">PR calculé</span>
                  <span className="text-right">Marge %</span>
                  <span className="text-right">PV calculé</span>
                  <span className="text-right text-brand-600">PV fixé</span>
                  <span className="text-right">Marge réelle</span>
                </div>

                <div className="divide-y divide-gray-50">
                  {lines.map((line, idx) => {
                    const p = calcLinePricing(line, exchangeRateToXof, rates)
                    const label = `${line.productDesignation}${line.packagingName ? ` (${line.packagingName})` : ''}`
                    const hasFixed = Number(line.fixedSellingPriceHt) > 0
                    const marginColor = p.margeReelle < 0 ? 'text-red-600' : p.margeReelle < 5 ? 'text-amber-600' : 'text-green-700'
                    const isLoss = p.prUnit > 0 && p.pvFinal < p.prUnit
                    const isFirstOfGroup = idx === 0 || lines[idx - 1].orderLineId !== line.orderLineId
                    return (
                      <div key={line.lineKey}>
                        <div
                          className={`py-2.5 grid gap-1.5 items-center ${isLoss ? 'bg-red-50/40' : ''}`}
                          style={{ gridTemplateColumns: PRICE_GRID }}
                        >
                          <div className={`min-w-0 sticky left-0 z-10 pl-4 pr-2 ${isLoss ? 'bg-red-50' : 'bg-white'}`}>
                            {isFirstOfGroup ? (
                              <>
                                <div className="text-sm text-gray-900 truncate" title={label}>{label}</div>
                                <div className="text-xs text-gray-400 font-mono mt-0.5">{line.productCode}</div>
                              </>
                            ) : (
                              <div className="text-xs text-gray-500 pl-3 flex items-center gap-1">
                                <span className="text-gray-300">└</span>
                                <span className="font-mono">{line.lotNumber || '—'}</span>
                              </div>
                            )}
                          </div>

                          <input
                            type="number" min={1} value={line.unitsPerCarton}
                            onChange={e => updateLine(line.lineKey, { unitsPerCarton: e.target.value })}
                            className={`${inputCls} text-right px-2 py-1 text-xs`}
                          />

                          <input
                            type="number" step="0.0001" min={0} value={line.unitFobPricePerCarton}
                            onChange={e => updateLine(line.lineKey, { unitFobPricePerCarton: e.target.value })}
                            placeholder="0.00"
                            className={`${inputCls} text-right px-2 py-1 text-xs`}
                          />

                          <div className="text-right text-xs font-mono text-gray-600">
                            {(() => { const pa = paUnitXof(line, exchangeRateToXof); return pa > 0 ? fmtNum(pa, 0) : <span className="text-gray-300">—</span> })()}
                          </div>

                          <div className="text-right text-xs font-mono font-semibold text-gray-800">
                            {p.prUnit > 0 ? fmtNum(p.prUnit, 0) : <span className="text-gray-300">—</span>}
                          </div>

                          <div className="relative flex items-center">
                            <input
                              type="number" step="0.01" min={0} max={100}
                              value={line.marginRate}
                              onChange={e => updateLine(line.lineKey, { marginRate: e.target.value })}
                              className={`${inputCls} pr-5 py-1 text-right text-xs`}
                            />
                            <span className="absolute right-1.5 text-xs text-gray-400 pointer-events-none">%</span>
                          </div>

                          <div className="text-right text-xs font-mono text-blue-700">
                            {p.pvCalc > 0 ? fmtNum(p.pvCalc, 0) : <span className="text-gray-300">—</span>}
                          </div>

                          <input
                            type="number" step="1" min={0}
                            value={line.fixedSellingPriceHt}
                            onChange={e => updateLine(line.lineKey, { fixedSellingPriceHt: e.target.value })}
                            placeholder={p.pvCalc > 0 ? String(Math.round(p.pvCalc)) : 'auto'}
                            className={`${inputCls} text-right px-2 py-1 text-xs ${hasFixed ? 'border-brand-400 bg-brand-50 text-brand-800 font-semibold' : ''}`}
                          />

                          <div className={`text-right text-xs font-semibold ${marginColor}`}>
                            {p.pvFinal > 0 && p.prUnit > 0 ? `${p.margeReelle.toFixed(1)}%` : <span className="text-gray-300">—</span>}
                          </div>
                        </div>
                        {isLoss && (
                          <div className="px-4 pb-2 flex items-center gap-2 text-xs text-red-600 font-medium">
                            <AlertTriangle size={12} />
                            Perte — PV ({fmtNum(p.pvFinal, 0)} XOF) inférieur au PR ({fmtNum(p.prUnit, 0)} XOF).
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                </div>
                </div>

                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
                  <p className="text-xs text-gray-400">
                    PR = PA × (1+comm.) × (1+fret) × (1+transit) × (1+transf.) — PA inclut l'impact des pertes boîtes.
                    PV fixé remplace le PV calculé.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-1/4 shrink-0 sticky top-6 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Commande</p>
            <p className="text-sm font-semibold text-gray-900">{order.supplierName}</p>
            <span className="mt-2 text-xs font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded inline-block">
              {order.reference}
            </span>
            {order.invoice && (
              <div className="mt-3 text-xs text-gray-500">
                <p>Facture : <strong>{order.invoice.invoiceReference}</strong></p>
                <p className="mt-0.5">{fmtXof(order.invoice.totalAmountXof)}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-700">Récapitulatif</p>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total FOB (XOF)</span>
              <span className="font-mono font-medium text-gray-900">{fmtXof(totalFobXof)}</span>
            </div>
            {totalCharges > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-blue-600">Charges tarifaires</span>
                <span className="font-mono font-medium text-blue-700">{fmtXof(totalCharges)}</span>
              </div>
            )}
            {prTotal > 0 && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-2">
                <span className="text-brand-700 font-semibold">PR total estimé</span>
                <span className="font-mono font-bold text-brand-700">{fmtXof(prTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-green-700">Bonnes boîtes</span>
              <span className="font-mono font-semibold text-green-700">{fmtNum(sumGoodBoxes)}</span>
            </div>
            {sumLostBoxes > 0 && (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-600 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    Boîtes perdues
                  </span>
                  <span className="font-mono font-semibold text-red-600">{fmtNum(sumLostBoxes)}</span>
                </div>
                {avoirFournisseurXof > 0 && (
                  <div className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 -mx-1">
                    <span className="text-amber-700 font-medium">Avoir fournisseur estimé</span>
                    <span className="font-mono font-semibold text-amber-700">{fmtXof(avoirFournisseurXof)}</span>
                  </div>
                )}
              </>
            )}
            {prMoyen > 0 && (
              <div className="flex justify-between text-xs border-t border-gray-100 pt-2">
                <span className="text-gray-500">PR moyen/boîte</span>
                <span className="font-mono font-semibold text-gray-800">{fmtNum(prMoyen, 0)} XOF</span>
              </div>
            )}
          </div>

          {(() => {
            const lossLines = lines.filter(l => {
              const p = calcLinePricing(l, exchangeRateToXof, rates)
              return p.prUnit > 0 && p.pvFinal < p.prUnit
            })
            return lossLines.length > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
                  <AlertTriangle size={14} />
                  {lossLines.length} produit{lossLines.length > 1 ? 's' : ''} en perte
                </div>
                <ul className="flex flex-col gap-1">
                  {lossLines.map(l => {
                    const p = calcLinePricing(l, exchangeRateToXof, rates)
                    return (
                      <li key={l.lineKey} className="text-xs text-red-600">
                        {l.productDesignation} — marge {p.margeReelle.toFixed(1)}%
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null
          })()}

          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} loading={saving} className="w-full justify-center">
              <Package size={14} />
              Enregistrer l'arrivage
            </Button>
            <Button variant="secondary" onClick={() => navigate('/orders/suppliers')} className="w-full justify-center">
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
