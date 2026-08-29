import { useState, useEffect, useMemo } from 'react'
import { FileText, ChevronsUpDown, TrendingDown, TrendingUp } from 'lucide-react'
import type { SupplierDto, SupplierInvoiceDto } from '../../api/types'
import { suppliersApi, supplierOrdersApi } from '../../api/endpoints'

const inputClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
const selectClass = `${inputClass} pr-8 appearance-none cursor-pointer`

function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString('fr-FR') } catch { return s }
}

interface AccountLine {
  date: string
  type: 'invoice' | 'payment' | 'advance'
  reference: string
  label: string
  amount: number
  balance: number
}

function buildStatement(invoices: SupplierInvoiceDto[]): AccountLine[] {
  const ops: Omit<AccountLine, 'balance'>[] = []

  for (const inv of invoices) {
    ops.push({
      date: String(inv.invoiceDate).slice(0, 10),
      type: 'invoice',
      reference: inv.invoiceReference,
      label: `Facture ${inv.invoiceReference}`,
      amount: inv.netAmountXof,
    })
    if (inv.advanceAmountXof > 0) {
      ops.push({
        date: String(inv.invoiceDate).slice(0, 10),
        type: 'advance',
        reference: inv.invoiceReference,
        label: `Avance versée / ${inv.invoiceReference}`,
        amount: -inv.advanceAmountXof,
      })
    }
    for (const p of inv.payments) {
      ops.push({
        date: String(p.paymentDate).slice(0, 10),
        type: 'payment',
        reference: p.reference ?? inv.invoiceReference,
        label: `Règlement${p.paymentMethod ? ` (${p.paymentMethod})` : ''} / ${inv.invoiceReference}`,
        amount: -p.amount,
      })
    }
  }

  ops.sort((a, b) => a.date.localeCompare(b.date))

  let running = 0
  return ops.map(op => {
    running += op.amount
    return { ...op, balance: running }
  })
}

export function SupplierAccountPage() {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [invoices, setInvoices] = useState<SupplierInvoiceDto[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    suppliersApi.getForSelect().then(setSuppliers).catch(() => {})
  }, [])

  useEffect(() => {
    if (!supplierId) { setInvoices([]); setLoaded(false); return }
    setLoading(true)
    supplierOrdersApi.getAllInvoices({ supplierId: supplierId as number })
      .then(r => { setInvoices(r.items); setLoaded(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [supplierId])

  const lines = useMemo(() => buildStatement(invoices), [invoices])

  const totalInvoiced = invoices.reduce((s, i) => s + i.netAmountXof, 0)
  const totalPaid = invoices.reduce((s, i) => s + i.amountPaid + i.advanceAmountXof, 0)
  const totalBalance = totalInvoiced - totalPaid

  const supplier = suppliers.find(s => s.id === supplierId)

  return (
    <div className="flex flex-col gap-5">
      {/* Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative min-w-64">
          <select
            value={supplierId}
            onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : '')}
            className={selectClass + ' w-full'}
          >
            <option value="">— Sélectionner un fournisseur —</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <ChevronsUpDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {!supplierId && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FileText size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez un fournisseur pour afficher son relevé de compte</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {loaded && !loading && (
        <div className="flex flex-col gap-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500 font-medium mb-1">Total facturé</p>
              <p className="text-lg font-bold text-gray-900">{fmtXof(totalInvoiced)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-xl border border-green-100 p-4 text-center">
              <p className="text-xs text-green-600 font-medium mb-1">Total réglé</p>
              <p className="text-lg font-bold text-green-700">{fmtXof(totalPaid)}</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${totalBalance > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs font-medium mb-1 ${totalBalance > 0 ? 'text-red-600' : 'text-gray-500'}`}>Solde restant dû</p>
              <p className={`text-lg font-bold ${totalBalance > 0 ? 'text-red-700' : 'text-gray-400'}`}>{fmtXof(totalBalance)}</p>
            </div>
          </div>

          {/* Statement table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <FileText size={15} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">
                Relevé de compte — {supplier?.name}
              </span>
              <span className="text-xs text-gray-400 ml-1">{lines.length} opération{lines.length !== 1 ? 's' : ''}</span>
            </div>

            {lines.length === 0 ? (
              <p className="px-5 py-10 text-sm text-gray-400 text-center">Aucune opération enregistrée.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 text-left w-28">Date</th>
                    <th className="px-4 py-2.5 text-left">Libellé</th>
                    <th className="px-4 py-2.5 text-right w-40">À payer</th>
                    <th className="px-4 py-2.5 text-right w-40">Versement</th>
                    <th className="px-4 py-2.5 text-right w-40">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lines.map((line, i) => {
                    const isInvoice = line.type === 'invoice'
                    const isPayment = line.type === 'payment' || line.type === 'advance'
                    return (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{fmtDate(line.date)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {isInvoice
                              ? <TrendingUp size={13} className="text-red-400 shrink-0" />
                              : <TrendingDown size={13} className="text-green-500 shrink-0" />
                            }
                            <span className="text-gray-800">{line.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {isInvoice
                            ? <span className="font-semibold text-gray-900">{fmtXof(line.amount)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {isPayment
                            ? <span className="font-semibold text-green-600">{fmtXof(-line.amount)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-semibold ${line.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {fmtXof(line.balance)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Totaux</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmtXof(totalInvoiced)}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{fmtXof(totalPaid)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {fmtXof(totalBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
