import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Package, Truck, Plane, Ship, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { SupplierOrderDto, PurchaseSummaryDto, PurchaseChargeDto, ChartAccountDto } from '../../api/types'
import { supplierOrdersApi, accountingApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { AccountCombobox } from '../../components/ui/AccountCombobox'
import { fmtXof, fmtNum } from '../../utils/format'

const CHARGE_TYPES = [
  { value: 'Douane', label: 'Douane (droits d\'entrée)', debit: '6142', credit: '521' },
  { value: 'Fret', label: 'Fret (transport international)', debit: '6241', credit: '521' },
  { value: 'TransportLocal', label: 'Transport local', debit: '6248', credit: '521' },
  { value: 'Chargement', label: 'Chargement / déchargement', debit: '6248', credit: '521' },
  { value: 'Autres', label: 'Autres frais', debit: '6288', credit: '521' },
]

function TransportIcon({ mode }: { mode: string }) {
  if (mode === 'Aérien') return <Plane size={14} className="text-blue-500" />
  if (mode === 'Maritime') return <Ship size={14} className="text-blue-500" />
  return <Truck size={14} className="text-gray-500" />
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

interface ChargeFormState {
  chargeType: string
  description: string
  amountXof: string
  chargeDate: string
  reference: string
  debitAccountCode: string
  creditAccountCode: string
  notes: string
}

function emptyChargeForm(): ChargeFormState {
  const today = new Date().toISOString().slice(0, 10)
  const first = CHARGE_TYPES[0]
  return {
    chargeType: first.value,
    description: first.label,
    amountXof: '',
    chargeDate: today,
    reference: '',
    debitAccountCode: first.debit,
    creditAccountCode: first.credit,
    notes: '',
  }
}

export function ReceptionsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [order, setOrder] = useState<SupplierOrderDto | null>(null)
  const [receptions, setReceptions] = useState<PurchaseSummaryDto[]>([])
  const [accounts, setAccounts] = useState<ChartAccountDto[]>([])
  const [loading, setLoading] = useState(true)
  const [closingReception, setClosingReception] = useState(false)

  // Per-arrivage expanded state
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  // Per-arrivage charge form state
  const [addingCharge, setAddingCharge] = useState<Record<number, boolean>>({})
  const [chargeForm, setChargeForm] = useState<Record<number, ChargeFormState>>({})
  const [savingCharge, setSavingCharge] = useState<Record<number, boolean>>({})

  const load = useCallback(() => {
    if (!id) return
    Promise.all([
      supplierOrdersApi.getById(Number(id)),
      supplierOrdersApi.getReceptions(Number(id)),
      accountingApi.getChartOfAccounts(),
    ]).then(([o, r, a]) => {
      setOrder(o)
      setReceptions(r)
      setAccounts(a)
      // Expand first reception by default
      if (r.length > 0) setExpanded({ [r[0].id]: true })
    }).catch(() => toast('Erreur de chargement.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleCloseReception() {
    if (!id) return
    setClosingReception(true)
    try {
      await supplierOrdersApi.closeReception(Number(id))
      toast('Réception clôturée — commande réceptionnée.', 'success')
      navigate('/orders/suppliers')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur lors de la clôture.', 'error')
    } finally {
      setClosingReception(false)
    }
  }

  function openChargeForm(purchaseId: number) {
    setChargeForm(prev => ({ ...prev, [purchaseId]: emptyChargeForm() }))
    setAddingCharge(prev => ({ ...prev, [purchaseId]: true }))
  }

  function updateChargeForm(purchaseId: number, patch: Partial<ChargeFormState>) {
    setChargeForm(prev => ({
      ...prev,
      [purchaseId]: { ...(prev[purchaseId] || emptyChargeForm()), ...patch }
    }))
  }

  function onChargeTypeChange(purchaseId: number, chargeType: string) {
    const ct = CHARGE_TYPES.find(c => c.value === chargeType)
    if (ct) {
      updateChargeForm(purchaseId, {
        chargeType,
        description: ct.label,
        debitAccountCode: ct.debit,
        creditAccountCode: ct.credit,
      })
    }
  }

  async function handleAddCharge(purchaseId: number) {
    const form = chargeForm[purchaseId]
    if (!form) return
    if (!form.amountXof || Number(form.amountXof) <= 0) {
      toast('Montant invalide.', 'error'); return
    }
    if (!form.description.trim()) { toast('Description obligatoire.', 'error'); return }

    setSavingCharge(prev => ({ ...prev, [purchaseId]: true }))
    try {
      await supplierOrdersApi.addCharge(purchaseId, {
        chargeType: form.chargeType,
        description: form.description.trim(),
        amountXof: Number(form.amountXof),
        chargeDate: form.chargeDate,
        reference: form.reference.trim() || null,
        debitAccountCode: form.debitAccountCode,
        creditAccountCode: form.creditAccountCode,
        notes: form.notes.trim() || null,
      })
      toast('Charge enregistrée — prix de revient recalculé.', 'success')
      setAddingCharge(prev => ({ ...prev, [purchaseId]: false }))
      // Reload receptions to get updated charges
      const r = await supplierOrdersApi.getReceptions(Number(id))
      setReceptions(r)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setSavingCharge(prev => ({ ...prev, [purchaseId]: false }))
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Chargement…</div>
  if (!order) return null

  const isEnCours = order.status === 'EnCoursDeRéception'
  const isReceptionnee = order.status === 'Réceptionnée'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => navigate('/orders/suppliers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} />
          Retour aux commandes
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-800">
            Arrivages — {order.reference} ({order.supplierName})
          </h2>
          {isEnCours && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
              En cours de réception
            </span>
          )}
          {isReceptionnee && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
              <CheckCircle size={11} /> Réceptionnée
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEnCours && (
            <>
              <Button
                onClick={() => navigate(`/orders/suppliers/${id}/receive-goods`)}
                variant="secondary"
                className="text-sm"
              >
                <Plus size={14} />
                Nouvel arrivage
              </Button>
              <Button
                onClick={handleCloseReception}
                loading={closingReception}
                className="text-sm bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={14} />
                Clôturer la réception
              </Button>
            </>
          )}
        </div>
      </div>

      {receptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Package size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun arrivage enregistré pour cette commande.</p>
          {isEnCours && (
            <Button
              className="mt-4"
              onClick={() => navigate(`/orders/suppliers/${id}/receive-goods`)}
            >
              <Plus size={14} />
              Enregistrer le premier arrivage
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {receptions.map(rec => {
            const isExpanded = !!expanded[rec.id]
            const isAddingCharge = !!addingCharge[rec.id]
            const form = chargeForm[rec.id] || emptyChargeForm()
            const isSaving = !!savingCharge[rec.id]
            const totalCostXof = rec.totalFobXof + rec.totalChargesXof

            return (
              <div key={rec.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <button
                  className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                >
                  <TransportIcon mode={rec.transportMode} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{rec.reference}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{rec.transportMode}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(rec.arrivalDate).toLocaleDateString('fr-FR')} ·
                      {' '}{rec.lineCount} produit{rec.lineCount !== 1 ? 's' : ''} ·
                      {' '}{fmtNum(rec.totalGoodUnits)} unités
                      {rec.totalLostCartons > 0 && (
                        <span className="text-red-500 ml-1">· {rec.totalLostCartons} carton{rec.totalLostCartons !== 1 ? 's' : ''} perdus</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-xs text-gray-400">FOB</p>
                    <p className="font-mono text-sm font-semibold text-blue-700">{fmtXof(rec.totalFobXof)}</p>
                  </div>
                  {rec.totalChargesXof > 0 && (
                    <div className="text-right mr-2">
                      <p className="text-xs text-gray-400">Charges</p>
                      <p className="font-mono text-sm font-semibold text-orange-700">{fmtXof(rec.totalChargesXof)}</p>
                    </div>
                  )}
                  <div className="text-right mr-2">
                    <p className="text-xs text-gray-400">Coût total</p>
                    <p className="font-mono text-sm font-bold text-gray-900">{fmtXof(totalCostXof)}</p>
                  </div>
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Charges list */}
                    <div className="px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Charges ({rec.charges.length})
                        </p>
                        {!isReceptionnee && (
                          <button
                            onClick={() => isAddingCharge
                              ? setAddingCharge(prev => ({ ...prev, [rec.id]: false }))
                              : openChargeForm(rec.id)
                            }
                            className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                          >
                            <Plus size={11} />
                            {isAddingCharge ? 'Annuler' : 'Ajouter une charge'}
                          </button>
                        )}
                      </div>

                      {rec.charges.length === 0 && !isAddingCharge && (
                        <p className="text-xs text-gray-400 py-2">
                          Aucune charge enregistrée — le PA est calculé sur le FOB uniquement.
                        </p>
                      )}

                      {rec.charges.length > 0 && (
                        <div className="rounded-lg border border-gray-100 overflow-hidden mb-3">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-gray-500 font-semibold">Type</th>
                                <th className="px-3 py-2 text-left text-gray-500 font-semibold">Description</th>
                                <th className="px-3 py-2 text-left text-gray-500 font-semibold">Date</th>
                                <th className="px-3 py-2 text-left text-gray-500 font-semibold">Débit</th>
                                <th className="px-3 py-2 text-left text-gray-500 font-semibold">Crédit</th>
                                <th className="px-3 py-2 text-right text-gray-500 font-semibold">Montant XOF</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {rec.charges.map((c: PurchaseChargeDto) => (
                                <tr key={c.id} className="hover:bg-gray-50/50">
                                  <td className="px-3 py-2">
                                    <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold">{c.chargeType}</span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">{c.description}</td>
                                  <td className="px-3 py-2 text-gray-500">{new Date(c.chargeDate).toLocaleDateString('fr-FR')}</td>
                                  <td className="px-3 py-2 font-mono text-gray-600">{c.debitAccountCode}</td>
                                  <td className="px-3 py-2 font-mono text-gray-600">{c.creditAccountCode}</td>
                                  <td className="px-3 py-2 text-right font-mono font-semibold text-orange-700">{fmtXof(c.amountXof)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add charge form */}
                      {isAddingCharge && (
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
                          <p className="text-xs font-semibold text-gray-700">Nouvelle charge opérationnelle</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Type de charge *</label>
                              <select
                                value={form.chargeType}
                                onChange={e => onChargeTypeChange(rec.id, e.target.value)}
                                className={inputCls}
                              >
                                {CHARGE_TYPES.map(ct => (
                                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Description *</label>
                              <input
                                value={form.description}
                                onChange={e => updateChargeForm(rec.id, { description: e.target.value })}
                                className={inputCls} placeholder="Détail de la charge"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Montant XOF *</label>
                              <input
                                type="number" step="1" min={0} value={form.amountXof}
                                onChange={e => updateChargeForm(rec.id, { amountXof: e.target.value })}
                                className={inputCls} placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Date *</label>
                              <input
                                type="date" value={form.chargeDate}
                                onChange={e => updateChargeForm(rec.id, { chargeDate: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Référence</label>
                              <input
                                value={form.reference}
                                onChange={e => updateChargeForm(rec.id, { reference: e.target.value })}
                                className={inputCls} placeholder="N° reçu, bon…"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Cpt. Débit</label>
                              <AccountCombobox
                                accounts={accounts}
                                value={form.debitAccountCode}
                                onChange={v => updateChargeForm(rec.id, { debitAccountCode: v })}
                                filter={a => a.code.startsWith('6')}
                                placeholder="Ex : 6142 Douane…"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Cpt. Crédit</label>
                              <AccountCombobox
                                accounts={accounts}
                                value={form.creditAccountCode}
                                onChange={v => updateChargeForm(rec.id, { creditAccountCode: v })}
                                filter={a => ['4', '5'].some(c => a.code.startsWith(c))}
                                placeholder="Ex : 521 Banque…"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-gray-600 mb-1 block">Notes</label>
                              <input
                                value={form.notes}
                                onChange={e => updateChargeForm(rec.id, { notes: e.target.value })}
                                className={inputCls} placeholder="Observations…"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="secondary"
                              onClick={() => setAddingCharge(prev => ({ ...prev, [rec.id]: false }))}
                            >
                              Annuler
                            </Button>
                            <Button onClick={() => handleAddCharge(rec.id)} loading={isSaving}>
                              Enregistrer la charge
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cost summary — updates live when a charge is being entered */}
                    {(() => {
                      const pendingAmount = isAddingCharge ? (parseFloat(form.amountXof) || 0) : 0
                      const previewCharges = rec.totalChargesXof + pendingAmount
                      const previewTotal = rec.totalFobXof + previewCharges
                      const hasPreview = pendingAmount > 0
                      return (
                        <div className={`border-t px-5 py-3 flex items-center gap-6 transition-colors ${hasPreview ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                          <div>
                            <p className="text-xs text-gray-400">FOB total</p>
                            <p className="font-mono text-sm font-semibold text-blue-700">{fmtXof(rec.totalFobXof)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              Charges{hasPreview && <span className="ml-1 text-amber-600 font-semibold">(+{fmtXof(pendingAmount)} en cours)</span>}
                            </p>
                            <p className={`font-mono text-sm font-semibold ${hasPreview ? 'text-amber-700' : 'text-orange-700'}`}>
                              {fmtXof(previewCharges)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              Coût total PR{hasPreview && <span className="ml-1 text-amber-600 font-semibold">·&nbsp;simulation</span>}
                            </p>
                            <p className={`font-mono text-sm font-bold ${hasPreview ? 'text-amber-800' : 'text-gray-900'}`}>
                              {fmtXof(previewTotal)}
                            </p>
                          </div>
                          {rec.totalGoodUnits > 0 && (
                            <div>
                              <p className="text-xs text-gray-400">PR moyen / unité</p>
                              <p className={`font-mono text-sm font-bold ${hasPreview ? 'text-amber-700' : 'text-brand-700'}`}>
                                {fmtXof(previewTotal / rec.totalGoodUnits)}
                              </p>
                            </div>
                          )}
                          {hasPreview && (
                            <p className="ml-auto text-xs text-amber-600 italic">
                              Valeurs estimées — enregistrez pour confirmer
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}

          {/* Grand total */}
          {receptions.length > 1 && (
            <div className="bg-gray-900 text-white rounded-2xl px-5 py-4 flex items-center justify-between">
              <span className="font-semibold text-sm">Total tous arrivages</span>
              <div className="flex gap-8">
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">FOB</p>
                  <p className="font-mono font-bold text-blue-300">
                    {fmtXof(receptions.reduce((s, r) => s + r.totalFobXof, 0))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Charges</p>
                  <p className="font-mono font-bold text-orange-300">
                    {fmtXof(receptions.reduce((s, r) => s + r.totalChargesXof, 0))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Coût total PR</p>
                  <p className="font-mono font-bold text-white">
                    {fmtXof(receptions.reduce((s, r) => s + r.totalFobXof + r.totalChargesXof, 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
