import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Link2 } from 'lucide-react'
import type {
  ChartAccountDto,
  ManualJournalEntryInput,
  SupplierOrderSummaryDto,
  PurchaseSummaryDto,
} from '../../api/types'
import { accountingApi, supplierOrdersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { AccountCombobox } from '../../components/ui/AccountCombobox'

// ─── Constants ───────────────────────────────────────────────────────────────

const CHARGE_TYPES = [
  { value: 'Douane', label: 'Droits de douane', debit: '6142', credit: '521' },
  { value: 'Fret', label: 'Fret maritime / aérien', debit: '6241', credit: '521' },
  { value: 'TransportLocal', label: 'Transport local', debit: '6248', credit: '521' },
  { value: 'Chargement', label: 'Chargement / Déchargement', debit: '6248', credit: '521' },
  { value: 'Autres', label: 'Autres frais', debit: '6288', credit: '521' },
]

const xof = (v: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(v) + ' XOF'

const fieldClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

interface LineForm {
  accountId: string
  label: string
  debitAmount: string
  creditAmount: string
}
const emptyLine = (): LineForm => ({ accountId: '', label: '', debitAmount: '', creditAmount: '' })

// ─── Page ─────────────────────────────────────────────────────────────────────

export function OdEntryFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [accounts, setAccounts] = useState<ChartAccountDto[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  const [form, setForm] = useState({
    entryDate: new Date().toISOString().slice(0, 10),
    reference: '',
    description: '',
  })
  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // ── Liaison arrivage ──
  const [linkToOrder, setLinkToOrder] = useState(false)
  const [orders, setOrders] = useState<SupplierOrderSummaryDto[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [receptions, setReceptions] = useState<PurchaseSummaryDto[]>([])
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('')
  const [chargeType, setChargeType] = useState('Douane')
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingReceptions, setLoadingReceptions] = useState(false)

  useEffect(() => {
    accountingApi.getChartOfAccounts()
      .then(setAccounts)
      .catch(() => toast('Impossible de charger le plan comptable.', 'error'))
      .finally(() => setLoadingAccounts(false))
  }, [])

  async function handleLinkToggle(checked: boolean) {
    setLinkToOrder(checked)
    setSelectedOrderId('')
    setSelectedPurchaseId('')
    setReceptions([])
    if (checked && orders.length === 0) {
      setLoadingOrders(true)
      try {
        setOrders(await supplierOrdersApi.getReceptionOrders())
      } catch {
        toast('Impossible de charger les commandes.', 'error')
      } finally {
        setLoadingOrders(false)
      }
    }
  }

  async function handleOrderChange(orderId: string) {
    setSelectedOrderId(orderId)
    setSelectedPurchaseId('')
    setReceptions([])
    if (!orderId) return
    setLoadingReceptions(true)
    try {
      setReceptions(await supplierOrdersApi.getReceptions(Number(orderId)))
    } catch {
      toast('Impossible de charger les arrivages.', 'error')
    } finally {
      setLoadingReceptions(false)
    }
  }

  function handleChargeTypeChange(ct: string) {
    setChargeType(ct)
    const preset = CHARGE_TYPES.find(t => t.value === ct)
    if (!preset || accounts.length === 0) return
    const debitAcc = accounts.find(a => a.code === preset.debit)
    const creditAcc = accounts.find(a => a.code === preset.credit)
    setLines(prev => {
      const next = [...prev]
      if (debitAcc && next[0]) next[0] = { ...next[0], accountId: String(debitAcc.id) }
      if (creditAcc && next[1]) next[1] = { ...next[1], accountId: String(creditAcc.id) }
      return next
    })
  }

  function setLine(i: number, patch: Partial<LineForm>) {
    setLines(l => l.map((x, idx) => idx === i ? { ...x, ...patch } : x))
  }

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debitAmount) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.creditAmount) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  async function handleSave() {
    setFormError(null)
    if (!form.reference.trim() || !form.description.trim()) {
      setFormError('Référence et description sont obligatoires.')
      return
    }
    const inputLines = lines.filter(l => l.accountId)
    if (inputLines.length < 2) {
      setFormError('Au moins 2 lignes de compte sont requises.')
      return
    }
    if (!balanced) {
      setFormError(`L'écriture n'est pas équilibrée : Débit ${xof(totalDebit)} ≠ Crédit ${xof(totalCredit)}.`)
      return
    }
    if (linkToOrder && !selectedPurchaseId) {
      setFormError('Veuillez sélectionner un arrivage pour la liaison.')
      return
    }

    setSaving(true)
    try {
      const dto: ManualJournalEntryInput = {
        journalCode: 'JOD',
        entryDate: form.entryDate,
        reference: form.reference.trim(),
        description: form.description.trim(),
        attachmentFileName: null,
        attachmentPath: null,
        lines: inputLines.map(l => ({
          accountId: Number(l.accountId),
          label: l.label.trim() || null,
          debitAmount: parseFloat(l.debitAmount) || 0,
          creditAmount: parseFloat(l.creditAmount) || 0,
          customerId: null,
          supplierId: null,
        })),
        purchaseId: linkToOrder && selectedPurchaseId ? Number(selectedPurchaseId) : null,
        chargeType: linkToOrder ? chargeType : null,
      }
      await accountingApi.postManualEntry(dto)
      toast(
        linkToOrder
          ? 'OD enregistrée — charge rattachée à l\'arrivage, prix de revient mis à jour.'
          : 'Opération diverse enregistrée.',
        'success',
      )
      navigate('/accounting/od')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erreur lors de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/accounting/od')}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Nouvelle opération diverse</h1>
          <p className="text-sm text-gray-500">Journal JOD — Opérations Diverses</p>
        </div>
      </div>

      {formError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {formError}
        </div>
      )}

      {/* ── Entête de l'écriture ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Entête</h2>
        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Date *</label>
            <input
              type="date"
              value={form.entryDate}
              onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Référence *</label>
            <input
              type="text"
              value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="OD-2026-001"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Journal</label>
            <div className="rounded-lg border border-gray-200 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-700">
              JOD — Opérations Diverses
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Description *</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ex : Règlement droits de douane conteneur MAR-2026-003"
            className={fieldClass}
          />
        </div>
      </div>

      {/* ── Lignes débit / crédit ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Lignes de l'écriture</h2>
          <div className={`text-sm font-semibold px-3 py-1 rounded-full ${balanced ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
            {balanced ? '✓ Équilibrée' : 'Déséquilibrée'} — D : {xof(totalDebit)} | C : {xof(totalCredit)}
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 px-6 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Compte</span>
          <span>Libellé de la ligne</span>
          <span>Débit (XOF)</span>
          <span>Crédit (XOF)</span>
          <span />
        </div>

        <div className="divide-y divide-gray-100">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 px-6 py-4 items-start">
              {/* Account combobox */}
              <div>
                {loadingAccounts
                  ? <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  : <AccountCombobox
                      accounts={accounts}
                      value={l.accountId}
                      onChange={id => setLine(i, { accountId: id })}
                      valueField="id"
                      placeholder="Code ou libellé de compte…"
                    />
                }
              </div>

              {/* Libellé — full text input with more height */}
              <div>
                <textarea
                  value={l.label}
                  onChange={e => setLine(i, { label: e.target.value })}
                  rows={2}
                  placeholder="Libellé de la ligne (optionnel)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                />
              </div>

              {/* Débit */}
              <div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={l.debitAmount}
                  onChange={e => setLine(i, { debitAmount: e.target.value, creditAmount: e.target.value ? '' : l.creditAmount })}
                  placeholder="0"
                  className={fieldClass}
                />
              </div>

              {/* Crédit */}
              <div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={l.creditAmount}
                  onChange={e => setLine(i, { creditAmount: e.target.value, debitAmount: e.target.value ? '' : l.debitAmount })}
                  placeholder="0"
                  className={fieldClass}
                />
              </div>

              {/* Remove */}
              <div className="pt-1">
                {lines.length > 2 && (
                  <button
                    onClick={() => setLines(l => l.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer cette ligne"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setLines(l => [...l, emptyLine()])}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium"
          >
            <Plus size={14} /> Ajouter une ligne
          </button>
        </div>
      </div>

      {/* ── Liaison arrivage ── */}
      <div className={`rounded-xl border p-6 transition-colors ${linkToOrder ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
        <label className="flex items-center gap-3 cursor-pointer mb-0">
          <input
            type="checkbox"
            checked={linkToOrder}
            onChange={e => handleLinkToggle(e.target.checked)}
            className="w-4 h-4 accent-amber-500"
          />
          <Link2 size={16} className={linkToOrder ? 'text-amber-600' : 'text-gray-400'} />
          <div>
            <span className={`text-sm font-semibold ${linkToOrder ? 'text-amber-800' : 'text-gray-700'}`}>
              Rattacher à un arrivage fournisseur
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Le montant sera enregistré comme charge de l'arrivage et recalculera le prix de revient unitaire.
            </p>
          </div>
        </label>

        {linkToOrder && (
          <div className="mt-5 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-5">
              {/* Type de charge */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Type de charge *</label>
                <select
                  value={chargeType}
                  onChange={e => handleChargeTypeChange(e.target.value)}
                  className={selectClass}
                >
                  {CHARGE_TYPES.map(ct => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
                <p className="text-xs text-amber-700 mt-1">
                  Sélectionner un type pré-remplit les comptes suggérés dans l'écriture.
                </p>
              </div>

              {/* Bon de commande */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Bon de commande *
                  {loadingOrders && <span className="ml-2 text-xs text-gray-400">chargement…</span>}
                </label>
                <select
                  value={selectedOrderId}
                  onChange={e => handleOrderChange(e.target.value)}
                  className={selectClass}
                  disabled={loadingOrders}
                >
                  <option value="">Sélectionner une commande…</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.reference} — {o.supplierName}
                    </option>
                  ))}
                </select>
                {!loadingOrders && orders.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">
                    Aucune commande en cours de réception.
                  </p>
                )}
              </div>

              {/* Arrivage */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Arrivage *
                  {loadingReceptions && <span className="ml-2 text-xs text-gray-400">chargement…</span>}
                </label>
                <select
                  value={selectedPurchaseId}
                  onChange={e => setSelectedPurchaseId(e.target.value)}
                  className={selectClass}
                  disabled={!selectedOrderId || loadingReceptions}
                >
                  <option value="">Sélectionner un arrivage…</option>
                  {receptions.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.reference} · {r.transportMode} · FOB {xof(r.totalFobXof)}
                    </option>
                  ))}
                </select>
                {receptions.length === 0 && selectedOrderId && !loadingReceptions && (
                  <p className="text-xs text-orange-500 mt-1">
                    Aucun arrivage enregistré pour cette commande.
                  </p>
                )}
              </div>
            </div>

            {selectedPurchaseId && (
              <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-100 border border-amber-200 rounded-lg px-4 py-3">
                <Link2 size={14} />
                Le montant total de {xof(totalDebit)} sera ajouté comme charge de cet arrivage
                ({CHARGE_TYPES.find(t => t.value === chargeType)?.label}).
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pb-8">
        <button
          onClick={() => navigate('/accounting/od')}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          Annuler
        </button>
        <Button onClick={handleSave} loading={saving} disabled={!balanced && lines.some(l => l.accountId)}>
          Enregistrer l'écriture OD
        </Button>
      </div>
    </div>
  )
}
