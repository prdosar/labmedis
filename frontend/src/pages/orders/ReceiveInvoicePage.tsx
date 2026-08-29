import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { SupplierOrderDto } from '../../api/types'
import { supplierOrdersApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'

const EUR_XOF = 655.957

export function ReceiveInvoicePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [order, setOrder] = useState<SupplierOrderDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [invoiceReference, setInvoiceReference] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [totalAmountForeign, setTotalAmountForeign] = useState('')
  const [exchangeRateToXof, setExchangeRateToXof] = useState(String(EUR_XOF))
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!id) return
    supplierOrdersApi.getById(Number(id))
      .then(o => {
        setOrder(o)
        setCurrency(o.currency)
        setExchangeRateToXof(o.currency === 'EUR' ? String(EUR_XOF) : o.currency === 'XOF' ? '1' : '600')
      })
      .catch(() => toast('Commande introuvable.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  const totalXof = totalAmountForeign && exchangeRateToXof
    ? Number(totalAmountForeign) * Number(exchangeRateToXof)
    : 0

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  async function handleSave() {
    if (!invoiceReference.trim()) { setFormError('La référence de la facture est requise.'); return }
    if (!totalAmountForeign || Number(totalAmountForeign) <= 0) {
      setFormError('Le montant total doit être supérieur à zéro.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await supplierOrdersApi.receiveInvoice(Number(id), {
        invoiceReference: invoiceReference.trim(),
        invoiceDate,
        dueDate: dueDate || null,
        totalAmountForeign: Number(totalAmountForeign),
        currency,
        exchangeRateToXof: Number(exchangeRateToXof),
        notes: notes.trim() || null,
      })
      toast('Facture fournisseur enregistrée.', 'success')
      navigate('/orders/suppliers')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement.")
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
          Facture fournisseur — {order.reference}
        </h2>
      </div>

      {formError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {formError}
        </div>
      )}

      <div className="flex gap-5 items-start">
        {/* Left column */}
        <div className="w-3/4 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Données de la facture fournisseur</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="N° facture fournisseur *">
                <input
                  value={invoiceReference}
                  onChange={e => setInvoiceReference(e.target.value)}
                  placeholder="ex : INV-2026-0089"
                  className={inputCls}
                />
              </Field>
              <Field label="Date de facture *">
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Date d'échéance">
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Devise">
                <select
                  value={currency}
                  onChange={e => {
                    setCurrency(e.target.value)
                    if (e.target.value === 'EUR') setExchangeRateToXof(String(EUR_XOF))
                    else if (e.target.value === 'XOF') setExchangeRateToXof('1')
                  }}
                  className={inputCls}
                >
                  <option value="EUR">EUR – Euro</option>
                  <option value="USD">USD – Dollar US</option>
                  <option value="XOF">XOF – Franc CFA</option>
                  <option value="GBP">GBP – Livre sterling</option>
                </select>
              </Field>
              <Field label={`Montant total (${currency}) *`}>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={totalAmountForeign}
                  onChange={e => setTotalAmountForeign(e.target.value)}
                  placeholder="0.00"
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
              <div className="col-span-2">
                <Field label="Notes">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Observations sur la facture…"
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
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
            <p className="mt-2 text-xs text-gray-500">Proforma : {order.proformaReference ?? '—'}</p>
          </div>

          {totalXof > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
              <p className="text-sm font-semibold text-gray-700">Montant converti XOF</p>
              <p className="text-xl font-bold text-gray-900">{fmt(totalXof)} XOF</p>
              <p className="text-xs text-gray-400">
                {Number(totalAmountForeign).toLocaleString('fr-FR')} {currency} × {Number(exchangeRateToXof).toLocaleString('fr-FR')}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} loading={saving} className="w-full justify-center">
              Enregistrer la facture
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
