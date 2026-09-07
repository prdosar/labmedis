import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Users, ShoppingCart, Send, BarChart3, Truck, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { dashboardApi } from '../api/endpoints'
import type { DashboardSummaryDto } from '../api/types'

function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'XOF', maximumFractionDigits: 0,
  }).format(n)
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function firstOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function fmtDateFr(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Presets rapides ─────────────────────────────────────────────────────────

type Preset = { key: string; label: string; from: () => Date; to: () => Date }

const PRESETS: Preset[] = [
  { key: 'this-month', label: 'Ce mois',
    from: () => firstOfMonth(new Date()), to: () => new Date() },
  { key: 'last-month', label: 'Mois dernier',
    from: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return firstOfMonth(d) },
    to: () => { const d = new Date(); d.setDate(0); return d } },
  { key: 'last-30d', label: '30 derniers jours',
    from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d },
    to: () => new Date() },
  { key: 'this-year', label: 'Année en cours',
    from: () => new Date(new Date().getFullYear(), 0, 1), to: () => new Date() },
]

// ─── Cartes ──────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  count,
  amount,
  icon,
  color,
  bg,
  href,
  loading,
}: {
  title: string
  count: number
  amount: number
  icon: React.ReactNode
  color: string
  bg: string
  href: string
  loading: boolean
}) {
  return (
    <Link
      to={href}
      className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
          <span className={color}>{icon}</span>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-brand-500 transition-colors">Voir détails →</span>
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="mt-1 text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {loading ? '—' : fmtXof(amount)}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? '—' : (
            <>
              <span className="font-semibold text-gray-700">{count.toLocaleString('fr-FR')}</span>
              {' '}opération{count > 1 ? 's' : ''} sur la période
            </>
          )}
        </p>
      </div>
    </Link>
  )
}

function MiniCard({
  label,
  value,
  icon,
  color,
  bg,
  href,
  hint,
  loading,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  bg: string
  href: string
  hint?: string
  loading: boolean
}) {
  return (
    <Link
      to={href}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex items-center gap-3"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{loading ? '—' : value.toLocaleString('fr-FR')}</p>
        {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </Link>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  // Défaut : ce mois
  const [dateFrom, setDateFrom] = useState(toIsoDate(firstOfMonth(new Date())))
  const [dateTo, setDateTo] = useState(toIsoDate(new Date()))
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    dashboardApi.getSummary({ dateFrom, dateTo })
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  const activePresetKey = useMemo(() => {
    for (const p of PRESETS) {
      if (toIsoDate(p.from()) === dateFrom && toIsoDate(p.to()) === dateTo) return p.key
    }
    return null
  }, [dateFrom, dateTo])

  function applyPreset(p: Preset) {
    setDateFrom(toIsoDate(p.from()))
    setDateTo(toIsoDate(p.to()))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome banner */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #155d15 0%, #27a327 100%)' }}>
        <div className="px-8 py-7 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Bienvenue sur LabMedis</h2>
            <p className="text-green-100 mt-1 text-sm">Gestion pharmaceutique — Lomé, Togo</p>
          </div>
          <div className="hidden md:flex items-center gap-6 text-right">
            <div>
              <p className="text-green-200 text-xs uppercase tracking-wider">Date</p>
              <p className="text-white font-semibold">
                {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtre période */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
          <Calendar size={16} className="text-brand-500" />
          Période
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <span className="text-sm text-gray-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border
                ${activePresetKey === p.key
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {summary && (
          <div className="ml-auto text-xs text-gray-400">
            Données du <span className="font-medium text-gray-600">{fmtDateFr(summary.dateFrom)}</span> au <span className="font-medium text-gray-600">{fmtDateFr(summary.dateTo)}</span>
          </div>
        )}
      </div>

      {/* Achats / Ventes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Activité sur la période</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <KpiCard
            title="Achats fournisseurs (factures reçues)"
            count={summary?.supplierInvoicesCount ?? 0}
            amount={summary?.supplierInvoicesTotalXof ?? 0}
            icon={<TrendingDown size={22} />}
            color="text-orange-600"
            bg="bg-orange-50"
            href="/invoices/suppliers"
            loading={loading}
          />
          <KpiCard
            title="Ventes clients (factures émises)"
            count={summary?.salesCount ?? 0}
            amount={summary?.salesTotalXof ?? 0}
            icon={<TrendingUp size={22} />}
            color="text-green-600"
            bg="bg-green-50"
            href="/invoices/customers"
            loading={loading}
          />
        </div>
      </div>

      {/* Livraisons / Mouvements */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Logistique sur la période</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MiniCard
            label="Livraisons effectuées"
            value={summary?.deliveriesCount ?? 0}
            icon={<Send size={18} />}
            color="text-cyan-600"
            bg="bg-cyan-50"
            href="/deliveries"
            loading={loading}
          />
          <MiniCard
            label="Mouvements de stock"
            value={summary?.stockMovementsCount ?? 0}
            icon={<BarChart3 size={18} />}
            color="text-indigo-600"
            bg="bg-indigo-50"
            href="/stock-movements"
            loading={loading}
          />
        </div>
      </div>

      {/* Référentiel all-time */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Référentiel (total)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MiniCard
            label="Produits actifs"
            value={summary?.productsCount ?? 0}
            icon={<Package size={18} />}
            color="text-brand-600"
            bg="bg-brand-50"
            href="/products"
            loading={loading}
          />
          <MiniCard
            label="Fournisseurs"
            value={summary?.suppliersCount ?? 0}
            icon={<Truck size={18} />}
            color="text-blue-600"
            bg="bg-blue-50"
            href="/suppliers"
            loading={loading}
          />
          <MiniCard
            label="Clients"
            value={summary?.customersCount ?? 0}
            icon={<Users size={18} />}
            color="text-purple-600"
            bg="bg-purple-50"
            href="/customers"
            loading={loading}
          />
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Accès rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Nouvel arrivage', href: '/purchases', icon: <ShoppingCart size={16} /> },
            { label: 'Nouvelle facture', href: '/invoices/customers', icon: <TrendingUp size={16} /> },
            { label: 'Nouveau produit', href: '/products', icon: <Package size={16} /> },
            { label: 'Nouveau client', href: '/customers', icon: <Users size={16} /> },
          ].map(link => (
            <Link
              key={link.label}
              to={link.href}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-700
                hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors shadow-sm"
            >
              <span className="text-brand-600">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
