import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, User, Globe, ShoppingCart, BookOpen, ExternalLink } from 'lucide-react'
import type { CustomerDto, CustomerOrderSummaryDto, ThirdPartyLedgerDto } from '../../api/types'
import { customersApi, customerOrdersApi, accountingApi } from '../../api/endpoints'
import { fmtXof } from '../../utils/format'

type Tab = 'commandes' | 'compte'

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const CO_LABEL: Record<string, string> = {
  EnAttente: 'En attente',
  Validée: 'Validée',
  Terminée: 'Terminée',
  Annulée: 'Annulée',
}
const CO_COLOR: Record<string, string> = {
  EnAttente: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Validée: 'bg-blue-50 text-blue-700 border border-blue-200',
  Terminée: 'bg-green-50 text-green-700 border border-green-200',
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

const th = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide'
const td = 'px-4 py-3 text-sm text-gray-700'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('commandes')
  const [customer, setCustomer] = useState<CustomerDto | null>(null)
  const [orders, setOrders] = useState<CustomerOrderSummaryDto[]>([])
  const [ledger, setLedger] = useState<ThirdPartyLedgerDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [ledgerLoading, setLedgerLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const numId = Number(id)
    Promise.all([
      customersApi.getById(numId),
      customerOrdersApi.getAll({ customerId: numId, size: 200 }),
    ]).then(([c, o]) => {
      setCustomer(c)
      setOrders(o.items)
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab !== 'compte' || !id || ledger) return
    setLedgerLoading(true)
    accountingApi.getCustomerLedger(Number(id))
      .then(setLedger)
      .catch(() => {})
      .finally(() => setLedgerLoading(false))
  }, [tab, id, ledger])

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Chargement…</div>
  if (!customer) return <div className="text-sm text-red-500 py-10 text-center">Client introuvable.</div>

  const initials = customer.name.slice(0, 2).toUpperCase()

  const activeOrders = orders.filter(o => o.status !== 'Annulée').length
  const totalOrders = orders.length
  const totalTtc = orders.filter(o => o.status === 'Terminée').reduce((sum, o) => sum + o.totalTtc, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <button onClick={() => navigate('/customers')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 w-fit">
        <ArrowLeft size={14} /> Retour aux clients
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-blue-700">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{customer.code}</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mt-1">{customer.name}</h1>
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
                {totalTtc > 0 && (
                  <>
                    <div className="w-px h-10 bg-gray-200" />
                    <div>
                      <p className="text-lg font-bold text-gray-900">{fmtXof(totalTtc)}</p>
                      <p className="text-xs text-gray-400">CA terminé</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <InfoRow icon={<Mail size={13} />} label="Email" value={customer.email} href={`mailto:${customer.email}`} />
              <InfoRow icon={<Phone size={13} />} label="Téléphone" value={customer.phone} />
              <InfoRow icon={<User size={13} />} label="Contact" value={customer.contactPerson} />
              <InfoRow icon={<Globe size={13} />} label="Pays" value={customer.countryName} />
              <InfoRow icon={<MapPin size={13} />} label="Adresse" value={[customer.city, customer.address].filter(Boolean).join(', ')} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {([
          { key: 'commandes', label: 'Commandes', icon: <ShoppingCart size={14} /> },
          { key: 'compte', label: 'Compte client', icon: <BookOpen size={14} /> },
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
            <p className="text-sm text-gray-400 text-center py-10">Aucune commande pour ce client.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={th}>Référence</th>
                  <th className={th}>Date</th>
                  <th className={th}>Statut</th>
                  <th className={th + ' text-right'}>Total HT</th>
                  <th className={th + ' text-right'}>Total TTC</th>
                  <th className={th}>Facture</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className={td}>
                      <span className="font-mono text-xs font-semibold text-gray-700">{o.reference}</span>
                    </td>
                    <td className={td + ' text-gray-500 whitespace-nowrap'}>{fmtDate(o.orderDate)}</td>
                    <td className={td}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CO_COLOR[o.status] ?? 'bg-gray-50 text-gray-600'}`}>
                        {CO_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className={td + ' text-right font-medium'}>{fmtXof(o.totalHt)}</td>
                    <td className={td + ' text-right font-semibold'}>{fmtXof(o.totalTtc)}</td>
                    <td className={td}>
                      {o.invoiceReference
                        ? <span className="text-xs text-gray-500 font-mono">{o.invoiceReference}</span>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/orders/customers/${o.id}/edit`}
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

      {/* Ledger tab */}
      {tab === 'compte' && (
        <div className="flex flex-col gap-4">
          {ledgerLoading && <div className="text-sm text-gray-400 text-center py-8">Chargement du compte…</div>}

          {ledger && (
            <>
              {/* Balance summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total débits</p>
                  <p className="text-xl font-bold text-gray-900">{fmtXof(ledger.totalDebit)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Créances / ventes</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total crédits</p>
                  <p className="text-xl font-bold text-gray-900">{fmtXof(ledger.totalCredit)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Paiements reçus</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${
                  ledger.balance > 0
                    ? 'bg-amber-50 border-amber-200'
                    : ledger.balance < 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Solde</p>
                  <p className={`text-xl font-bold ${
                    ledger.balance > 0 ? 'text-amber-600' : ledger.balance < 0 ? 'text-green-600' : 'text-gray-700'
                  }`}>
                    {fmtXof(Math.abs(ledger.balance))}
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${
                    ledger.balance > 0 ? 'text-amber-500' : ledger.balance < 0 ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {ledger.balance > 0 ? 'Il nous doit' : ledger.balance < 0 ? 'Nous lui devons' : 'Solde nul'}
                  </p>
                </div>
              </div>

              {/* Ledger entries */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {ledger.entries.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">Aucune écriture comptable.</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>Journal</th>
                        <th className={th}>Référence</th>
                        <th className={th}>Description</th>
                        <th className={th + ' text-right'}>Débit</th>
                        <th className={th + ' text-right'}>Crédit</th>
                        <th className={th + ' text-right'}>Solde courant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ledger.entries.map(e => (
                        <tr key={e.journalEntryId} className="hover:bg-gray-50/50">
                          <td className={td + ' text-gray-500 whitespace-nowrap'}>{fmtDate(e.entryDate)}</td>
                          <td className={td}>
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{e.journalCode}</span>
                          </td>
                          <td className={td + ' text-xs text-gray-500'}>{e.reference}</td>
                          <td className={td + ' text-gray-600 max-w-xs truncate'}>{e.description}</td>
                          <td className={td + ' text-right font-medium text-gray-700'}>
                            {e.debitAmount > 0 ? fmtXof(e.debitAmount) : '—'}
                          </td>
                          <td className={td + ' text-right font-medium text-gray-700'}>
                            {e.creditAmount > 0 ? fmtXof(e.creditAmount) : '—'}
                          </td>
                          <td className={`${td} text-right font-semibold ${
                            e.runningBalance > 0 ? 'text-amber-600' : e.runningBalance < 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {fmtXof(Math.abs(e.runningBalance))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
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
