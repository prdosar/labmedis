import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, User, Globe, Package, BookOpen, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import type { SupplierDto, SupplierOrderSummaryDto, SupplierInvoiceDto } from '../../api/types'
import { suppliersApi, supplierOrdersApi } from '../../api/endpoints'
import { fmtXof } from '../../utils/format'

type Tab = 'commandes' | 'compte'

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const SO_LABEL: Record<string, string> = {
  Brouillon: 'Brouillon',
  Envoyée: 'Envoyée',
  ProformaReçue: 'Proforma reçue',
  ProformaValidée: 'Proforma validée',
  FactureReçue: 'Facture reçue',
  EnCoursDeRéception: 'En réception',
  Réceptionnée: 'Réceptionnée',
  Convertie: 'Convertie',
  Annulée: 'Annulée',
}
const SO_COLOR: Record<string, string> = {
  Brouillon: 'bg-gray-50 text-gray-600 border border-gray-200',
  Envoyée: 'bg-blue-50 text-blue-700 border border-blue-200',
  ProformaReçue: 'bg-amber-50 text-amber-700 border border-amber-200',
  ProformaValidée: 'bg-violet-50 text-violet-700 border border-violet-200',
  FactureReçue: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  EnCoursDeRéception: 'bg-orange-50 text-orange-700 border border-orange-200',
  Réceptionnée: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Convertie: 'bg-green-50 text-green-700 border border-green-200',
  Annulée: 'bg-red-50 text-red-500 border border-red-200',
}

function InfoRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-gray-400 text-xs w-20 shrink-0">{label}</span>
      {href
        ? <a href={href} className="text-brand-600 hover:underline font-medium truncate">{value}</a>
        : <span className="text-gray-800 font-medium truncate">{value}</span>
      }
    </div>
  )
}

interface AccountLine {
  date: string
  type: 'invoice' | 'payment' | 'advance'
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
      label: `Facture ${inv.invoiceReference}`,
      amount: inv.netAmountXof,
    })
    if (inv.advanceAmountXof > 0) {
      ops.push({
        date: String(inv.invoiceDate).slice(0, 10),
        type: 'advance',
        label: `Avance versée / ${inv.invoiceReference}`,
        amount: -inv.advanceAmountXof,
      })
    }
    for (const p of inv.payments) {
      ops.push({
        date: String(p.paymentDate).slice(0, 10),
        type: 'payment',
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

const th = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide'
const td = 'px-4 py-3 text-sm text-gray-700'

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('commandes')
  const [supplier, setSupplier] = useState<SupplierDto | null>(null)
  const [orders, setOrders] = useState<SupplierOrderSummaryDto[]>([])
  const [invoices, setInvoices] = useState<SupplierInvoiceDto[]>([])
  const [loading, setLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoicesLoaded, setInvoicesLoaded] = useState(false)

  useEffect(() => {
    if (!id) return
    const numId = Number(id)
    Promise.all([
      suppliersApi.getById(numId),
      supplierOrdersApi.getAll({ supplierId: numId, size: 200 }),
    ]).then(([s, o]) => {
      setSupplier(s)
      setOrders(o.items)
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab !== 'compte' || !id || invoicesLoaded) return
    setInvoicesLoading(true)
    supplierOrdersApi.getAllInvoices({ supplierId: Number(id) })
      .then(r => { setInvoices(r.items); setInvoicesLoaded(true) })
      .catch(() => {})
      .finally(() => setInvoicesLoading(false))
  }, [tab, id, invoicesLoaded])

  const lines = useMemo(() => buildStatement(invoices), [invoices])

  const totalInvoiced = invoices.reduce((s, i) => s + i.netAmountXof, 0)
  const totalPaid = invoices.reduce((s, i) => s + i.amountPaid + i.advanceAmountXof, 0)
  const balance = totalInvoiced - totalPaid

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Chargement…</div>
  if (!supplier) return <div className="text-sm text-red-500 py-10 text-center">Fournisseur introuvable.</div>

  const initials = supplier.name.slice(0, 2).toUpperCase()
  const activeOrders = orders.filter(o => o.status !== 'Annulée').length
  const totalOrders = orders.length

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <button onClick={() => navigate('/suppliers')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 w-fit">
        <ArrowLeft size={14} /> Retour aux fournisseurs
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-brand-700">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{supplier.code}</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mt-1" data-v="2">{supplier.name}</h1>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
                  <p className="text-xs text-gray-400">commande{totalOrders !== 1 ? 's' : ''}</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activeOrders}</p>
                  <p className="text-xs text-gray-400">actives</p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <InfoRow icon={<Mail size={13} />} label="Email" value={supplier.email} href={`mailto:${supplier.email}`} />
              <InfoRow icon={<Phone size={13} />} label="Téléphone" value={supplier.phone} />
              <InfoRow icon={<User size={13} />} label="Contact" value={supplier.contactPerson} />
              <InfoRow icon={<Globe size={13} />} label="Pays" value={supplier.countryName} />
              <InfoRow icon={<MapPin size={13} />} label="Adresse" value={supplier.address} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {([
          { key: 'commandes', label: 'Commandes', icon: <Package size={14} /> },
          { key: 'compte', label: 'Compte fournisseur', icon: <BookOpen size={14} /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === 'commandes' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucune commande pour ce fournisseur.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={th}>Référence</th>
                  <th className={th}>Date</th>
                  <th className={th}>Lignes</th>
                  <th className={th}>Devise</th>
                  <th className={th}>Statut</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className={td}>
                      <span className="font-mono text-xs font-semibold text-gray-700">{o.reference}</span>
                    </td>
                    <td className={td + ' text-gray-500'}>{fmtDate(o.orderDate)}</td>
                    <td className={td + ' text-gray-500'}>{o.lineCount} produit{o.lineCount !== 1 ? 's' : ''}</td>
                    <td className={td}>
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{o.currency}</span>
                    </td>
                    <td className={td}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SO_COLOR[o.status] ?? 'bg-gray-50 text-gray-600'}`}>
                        {SO_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/orders/suppliers/${o.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Voir <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Account tab */}
      {tab === 'compte' && (
        <div className="flex flex-col gap-4">
          {invoicesLoading && (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {invoicesLoaded && !invoicesLoading && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p className="text-xs text-gray-400 font-medium mb-1">Total facturé</p>
                  <p className="text-xl font-bold text-gray-900">{fmtXof(totalInvoiced)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-100 p-4 text-center">
                  <p className="text-xs text-green-600 font-medium mb-1">Total réglé</p>
                  <p className="text-xl font-bold text-green-700">{fmtXof(totalPaid)}</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${balance > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-xs font-medium mb-1 ${balance > 0 ? 'text-red-600' : 'text-gray-500'}`}>Reste à payer</p>
                  <p className={`text-xl font-bold ${balance > 0 ? 'text-red-700' : 'text-gray-400'}`}>{fmtXof(balance)}</p>
                </div>
              </div>

              {/* Statement */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Relevé de compte — {supplier.name}</span>
                  {lines.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">{lines.length} opération{lines.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {lines.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">Aucune opération enregistrée.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2.5 text-left w-28">Date</th>
                        <th className="px-4 py-2.5 text-left">Opération</th>
                        <th className="px-4 py-2.5 text-right w-40">Montant dû</th>
                        <th className="px-4 py-2.5 text-right w-40">Versement</th>
                        <th className="px-4 py-2.5 text-right w-40">Solde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lines.map((line, i) => {
                        const isInvoice = line.type === 'invoice'
                        return (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(line.date)}</td>
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
                              {!isInvoice
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
                        <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{fmtXof(totalInvoiced)}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">{fmtXof(totalPaid)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {fmtXof(balance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
