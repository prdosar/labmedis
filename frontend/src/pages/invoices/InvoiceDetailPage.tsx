import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Paperclip, ExternalLink } from 'lucide-react'
import { invoicesApi, type PaymentFormData } from '../../api/endpoints'
import type { InvoiceDto, InvoicePaymentDto } from '../../api/types'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Badge, invoiceStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'

function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const METHODS = ['Espèces', 'Virement', 'Chèque', 'Mobile Money', 'Compensation']

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white'

interface PaymentForm {
  amount: string
  paymentDate: string
  paymentMethod: string
  reference: string
  notes: string
  file: File | null
}

function pctPaid(inv: InvoiceDto) {
  if (inv.totalTtc <= 0) return 0
  return Math.round((inv.amountPaid / inv.totalTtc) * 100)
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [form, setForm] = useState<PaymentForm>({ amount: '', paymentDate: today(), paymentMethod: '', reference: '', notes: '', file: null })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    if (!id) return
    setLoading(true)
    invoicesApi.getById(Number(id))
      .then(setInvoice)
      .catch(() => toast('Facture introuvable.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  function openPay() {
    setForm({ amount: invoice ? String(Math.round(invoice.balanceDue * 100) / 100) : '', paymentDate: today(), paymentMethod: '', reference: '', notes: '', file: null })
    setFormError(null)
    setPayOpen(true)
  }

  async function handlePay() {
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { setFormError('Montant invalide.'); return }
    if (!invoice || amount > invoice.balanceDue + 0.01) { setFormError(`Le montant dépasse le solde dû (${fmtXof(invoice?.balanceDue ?? 0)}).`); return }
    setSaving(true); setFormError(null)
    const data: PaymentFormData = {
      amount,
      paymentDate: form.paymentDate || today(),
      paymentMethod: form.paymentMethod || null,
      reference: form.reference || null,
      notes: form.notes || null,
      attachmentFile: form.file,
    }
    try {
      const updated = await invoicesApi.registerPayment(Number(id), data)
      setInvoice(updated)
      setPayOpen(false)
      toast('Encaissement enregistré.')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erreur lors de l\'encaissement.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-40 text-sm text-gray-500">Chargement…</div>
  if (!invoice) return <div className="flex items-center justify-center h-40 text-sm text-red-500">Facture introuvable.</div>

  const pct = pctPaid(invoice)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices/customers')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-base font-semibold text-gray-900">Facture {invoice.reference}</h2>
        {invoiceStatusBadge(invoice.status)}
      </div>

      {/* Header info card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-5">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Client</p>
          <p className="text-sm font-semibold text-gray-900">{invoice.customerName ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Date</p>
          <p className="text-sm text-gray-700">{fmtDate(invoice.invoiceDate)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Échéance</p>
          <p className="text-sm text-gray-700">{invoice.dueDate ? fmtDate(invoice.dueDate) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">Progression</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-700">{pct}%</span>
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium mb-1">Total TTC</p>
          <p className="text-lg font-bold text-gray-900">{fmtXof(invoice.totalTtc)}</p>
          <p className="text-xs text-gray-400 mt-0.5">HT {fmtXof(invoice.subtotalHt)} + TVA {fmtXof(invoice.totalTva)}</p>
        </div>
        <div className="bg-white border border-green-100 rounded-xl p-4 text-center">
          <p className="text-xs text-green-600 font-medium mb-1">Montant encaissé</p>
          <p className="text-lg font-bold text-green-700">{fmtXof(invoice.amountPaid)}</p>
        </div>
        <div className={`rounded-xl p-4 text-center border ${invoice.balanceDue > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-medium mb-1 ${invoice.balanceDue > 0 ? 'text-red-600' : 'text-gray-400'}`}>Solde restant</p>
          <p className={`text-lg font-bold ${invoice.balanceDue > 0 ? 'text-red-700' : 'text-gray-400'}`}>{fmtXof(invoice.balanceDue)}</p>
        </div>
      </div>

      {/* Lines */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Lignes de facturation</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2.5 text-left">Produit</th>
              <th className="px-4 py-2.5 text-right">Qté</th>
              <th className="px-4 py-2.5 text-right">PU HT</th>
              <th className="px-4 py-2.5 text-right">Remise</th>
              <th className="px-4 py-2.5 text-right">Total TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoice.lines.map(l => (
              <tr key={l.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{l.productDesignation ?? '—'}</p>
                  <p className="text-xs text-gray-400">{l.productCode}</p>
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700">{l.quantity}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{fmtXof(l.unitPriceHt)}</td>
                <td className="px-4 py-2.5 text-right text-gray-400">{l.discountPercent > 0 ? `${l.discountPercent}%` : '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmtXof(l.totalTtc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payments history */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Historique des encaissements</h3>
          {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && invoice.status !== 'Draft' && (
            <Button size="sm" icon={<Plus size={13} />} onClick={openPay}>Encaisser</Button>
          )}
        </div>
        {invoice.payments.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucun encaissement enregistré.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Mode</th>
                <th className="px-4 py-2.5 text-left">Référence</th>
                <th className="px-4 py-2.5 text-right">Montant</th>
                <th className="px-4 py-2.5 text-left">Pièce jointe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoice.payments.map((p: InvoicePaymentDto) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">{fmtDate(p.paymentDate)}</td>
                  <td className="px-4 py-2.5">
                    {p.paymentMethod ? <Badge variant="blue">{p.paymentMethod}</Badge> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{p.reference ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-700">{fmtXof(p.amount)}</td>
                  <td className="px-4 py-2.5">
                    {p.attachmentUrl ? (
                      <a href={p.attachmentUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs">
                        <Paperclip size={12} />{p.attachmentFileName ?? 'Pièce jointe'}<ExternalLink size={10} />
                      </a>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment modal */}
      <Modal isOpen={payOpen} onClose={() => setPayOpen(false)} title="Enregistrer un encaissement" size="sm">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Montant (XOF) *" type="number" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            <Input label="Date *" type="date" value={form.paymentDate}
              onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Mode de paiement</label>
            <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className={inputCls}>
              <option value="">— Sélectionner —</option>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <Input label="Référence" value={form.reference}
            onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="N° chèque, virement…" />
          <Input label="Notes" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Pièce jointe (preuve de paiement)</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
              className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer" />
            {form.file && <p className="text-xs text-gray-500">{form.file.name}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPayOpen(false)}>Annuler</Button>
            <Button onClick={handlePay} loading={saving}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
