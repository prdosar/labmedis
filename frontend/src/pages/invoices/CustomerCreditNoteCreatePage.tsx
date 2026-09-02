import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { customerCreditNotesApi, invoicesApi } from '../../api/endpoints'
import type { InvoiceDto } from '../../api/types'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ApiError } from '../../api/client'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

const TVA_RATES = [0, 18]

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white'

interface ReturnLine {
  id: number
  productId: string
  productCode: string
  productDesignation: string
  warehouseId: string
  warehouseName: string
  purchaseLineId: string
  lotNumber: string
  quantityReturned: string
  unitPriceHt: string
  discountPercent: string
  tvaRate: string
}

function newLine(id: number): ReturnLine {
  return { id, productId: '', productCode: '', productDesignation: '', warehouseId: '', warehouseName: '', purchaseLineId: '', lotNumber: '', quantityReturned: '1', unitPriceHt: '', discountPercent: '0', tvaRate: '18' }
}

function lineHt(l: ReturnLine): number {
  const price = parseFloat(l.unitPriceHt) || 0
  const qty = parseInt(l.quantityReturned) || 0
  const disc = parseFloat(l.discountPercent) || 0
  return Math.round(price * qty * (1 - disc / 100) * 100) / 100
}

function lineTva(l: ReturnLine): number {
  return Math.round(lineHt(l) * (parseFloat(l.tvaRate) || 0) / 100 * 100) / 100
}

function lineTtc(l: ReturnLine): number {
  return Math.round((lineHt(l) + lineTva(l)) * 100) / 100
}

export function CustomerCreditNoteCreatePage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Header form
  const [customerId, setCustomerId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [creditNoteDate, setCreditNoteDate] = useState(today())
  const [notes, setNotes] = useState('')

  // Data
  const [invoices, setInvoices] = useState<InvoiceDto[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null)

  // Lines
  const [lines, setLines] = useState<ReturnLine[]>([newLine(1)])
  const [nextId, setNextId] = useState(2)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    invoicesApi.getAll(1, 500).then(r => setInvoices(r.items))
  }, [])

  useEffect(() => {
    if (invoiceId) {
      const inv = invoices.find(i => String(i.id) === invoiceId) ?? null
      setSelectedInvoice(inv)
      if (inv) setCustomerId(String(inv.customerId))
    } else {
      setSelectedInvoice(null)
    }
  }, [invoiceId, invoices])

  function addLine() {
    setLines(prev => [...prev, newLine(nextId)])
    setNextId(n => n + 1)
  }

  function removeLine(id: number) {
    setLines(prev => prev.filter(l => l.id !== id))
  }

  function updateLine(id: number, field: keyof ReturnLine, value: string) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const totalHt = lines.reduce((s, l) => s + lineHt(l), 0)
  const totalTva = lines.reduce((s, l) => s + lineTva(l), 0)
  const totalTtc = lines.reduce((s, l) => s + lineTtc(l), 0)

  async function handleSave() {
    if (!customerId) { setError('Sélectionnez un client ou une facture.'); return }
    if (lines.length === 0) { setError('Ajoutez au moins une ligne.'); return }
    for (const l of lines) {
      if (!l.productId) { setError('Renseignez le code produit sur chaque ligne.'); return }
      if (!l.warehouseId) { setError('Renseignez le magasin sur chaque ligne.'); return }
      if (parseInt(l.quantityReturned) <= 0) { setError('La quantité doit être > 0.'); return }
      if (parseFloat(l.unitPriceHt) <= 0) { setError('Le prix unitaire doit être > 0.'); return }
    }

    setSaving(true)
    setError(null)

    try {
      const created = await customerCreditNotesApi.create({
        customerId: Number(customerId),
        invoiceId: invoiceId ? Number(invoiceId) : null,
        creditNoteDate: creditNoteDate,
        notes: notes || null,
        lines: lines.map(l => ({
          productId: Number(l.productId),
          warehouseId: Number(l.warehouseId),
          purchaseLineId: l.purchaseLineId ? Number(l.purchaseLineId) : null,
          quantityReturned: parseInt(l.quantityReturned),
          unitPriceHt: parseFloat(l.unitPriceHt),
          discountPercent: parseFloat(l.discountPercent) || 0,
          tvaRate: parseFloat(l.tvaRate) || 0,
          lotNumber: l.lotNumber || null,
        })),
      })
      toast(`Avoir ${created.reference} créé avec succès.`)
      navigate(`/invoices/customers/credit-notes/${created.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices/customers')}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-base font-semibold text-gray-900">Nouveau retour client</h2>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Informations générales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Facture liée (optionnel)</label>
            <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} className={inputCls}>
              <option value="">— Retour sans facture —</option>
              {invoices.filter(i => i.status !== 'Draft' && i.status !== 'Cancelled').map(i => (
                <option key={i.id} value={String(i.id)}>
                  {i.reference} — {i.customerName} — Solde: {fmtXof(i.balanceDue)}
                </option>
              ))}
            </select>
            {selectedInvoice && (
              <p className="text-xs text-blue-600">
                Facture sélectionnée · Total TTC: {fmtXof(selectedInvoice.totalTtc)} · Solde dû: {fmtXof(selectedInvoice.balanceDue)}
              </p>
            )}
          </div>

          {!invoiceId && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">ID Client *</label>
              <input value={customerId} onChange={e => setCustomerId(e.target.value)} type="number"
                placeholder="Identifiant du client" className={inputCls} />
              <p className="text-xs text-gray-400">Entrez l'ID ou sélectionnez une facture ci-dessus</p>
            </div>
          )}

          <Input label="Date du retour *" type="date" value={creditNoteDate}
            onChange={e => setCreditNoteDate(e.target.value)} />

          <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Motif du retour, observations…" />
        </div>
      </div>

      {/* Lines */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Produits retournés</h3>
          <button onClick={addLine}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-100 transition-colors">
            <Plus size={13} /> Ajouter une ligne
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '900px' }}>
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2.5 text-left">ID Produit</th>
                <th className="px-3 py-2.5 text-left">ID Magasin</th>
                <th className="px-3 py-2.5 text-left">N° Lot</th>
                <th className="px-3 py-2.5 text-right w-20">Qté</th>
                <th className="px-3 py-2.5 text-right w-28">Prix u. HT</th>
                <th className="px-3 py-2.5 text-right w-20">Remise %</th>
                <th className="px-3 py-2.5 text-right w-20">TVA %</th>
                <th className="px-3 py-2.5 text-right w-28">Total TTC</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map(line => (
                <tr key={line.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2">
                    <input value={line.productId} onChange={e => updateLine(line.id, 'productId', e.target.value)}
                      type="number" placeholder="ID produit"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.warehouseId} onChange={e => updateLine(line.id, 'warehouseId', e.target.value)}
                      type="number" placeholder="ID magasin"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.lotNumber} onChange={e => updateLine(line.id, 'lotNumber', e.target.value)}
                      placeholder="Optionnel"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.quantityReturned} onChange={e => updateLine(line.id, 'quantityReturned', e.target.value)}
                      type="number" min="1"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.unitPriceHt} onChange={e => updateLine(line.id, 'unitPriceHt', e.target.value)}
                      type="number" min="0" step="0.01" placeholder="0.00"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.discountPercent} onChange={e => updateLine(line.id, 'discountPercent', e.target.value)}
                      type="number" min="0" max="100"
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <select value={line.tvaRate} onChange={e => updateLine(line.id, 'tvaRate', e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white">
                      {TVA_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">
                    {fmtXof(lineTtc(line))}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(line.id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <div className="flex flex-col gap-1 text-sm min-w-56">
            <div className="flex justify-between text-gray-600">
              <span>Total HT</span>
              <span className="font-medium">{fmtXof(totalHt)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>TVA</span>
              <span className="font-medium">{fmtXof(totalTva)}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold border-t border-gray-200 pt-1 mt-1">
              <span>Total TTC</span>
              <span className="text-amber-700">{fmtXof(totalTtc)}</span>
            </div>
            {selectedInvoice && (
              <div className={`flex justify-between text-xs mt-1 ${totalTtc <= selectedInvoice.balanceDue ? 'text-green-600' : 'text-amber-600'}`}>
                <span>Solde facture après déduction</span>
                <span className="font-medium">{fmtXof(Math.max(0, selectedInvoice.balanceDue - totalTtc))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/invoices/customers')}>Annuler</Button>
        <Button onClick={handleSave} loading={saving}>Enregistrer le retour</Button>
      </div>
    </div>
  )
}
