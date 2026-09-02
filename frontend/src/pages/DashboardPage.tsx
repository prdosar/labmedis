import { useEffect, useState } from 'react'
import { Package, Users, ShoppingCart, FileText, Send, BarChart3, Truck } from 'lucide-react'
import { productsApi, suppliersApi, customersApi, purchasesApi, invoicesApi, deliveriesApi, stockMovementsApi } from '../api/endpoints'

interface Stat {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  bg: string
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
        <span className={stat.color}>{stat.icon}</span>
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      productsApi.getAll(1, 1),
      suppliersApi.getAll(1, 1),
      customersApi.getAll(1, 1),
      purchasesApi.getAll(1, 1),
      invoicesApi.getAll(1, 1),
      deliveriesApi.getAll(1, 1),
      stockMovementsApi.getAll(1, 1),
    ]).then(results => {
      const [products, suppliers, customers, purchases, invoices, deliveries, movements] = results
      setStats({
        products: products.status === 'fulfilled' ? products.value.totalCount : 0,
        suppliers: suppliers.status === 'fulfilled' ? suppliers.value.totalCount : 0,
        customers: customers.status === 'fulfilled' ? customers.value.totalCount : 0,
        purchases: purchases.status === 'fulfilled' ? purchases.value.totalCount : 0,
        invoices: invoices.status === 'fulfilled' ? invoices.value.totalCount : 0,
        deliveries: deliveries.status === 'fulfilled' ? deliveries.value.totalCount : 0,
        movements: movements.status === 'fulfilled' ? movements.value.totalCount : 0,
      })
      setLoading(false)
    })
  }, [])

  const cardStats: Stat[] = [
    { label: 'Produits', value: loading ? '—' : stats.products ?? 0, icon: <Package size={22} />, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Fournisseurs', value: loading ? '—' : stats.suppliers ?? 0, icon: <Truck size={22} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Clients', value: loading ? '—' : stats.customers ?? 0, icon: <Users size={22} />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Achats', value: loading ? '—' : stats.purchases ?? 0, icon: <ShoppingCart size={22} />, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Factures', value: loading ? '—' : stats.invoices ?? 0, icon: <FileText size={22} />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Livraisons', value: loading ? '—' : stats.deliveries ?? 0, icon: <Send size={22} />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Mvts de stock', value: loading ? '—' : stats.movements ?? 0, icon: <BarChart3 size={22} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="flex flex-col gap-8">
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

      {/* Stats */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Vue d'ensemble</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cardStats.map(stat => <StatCard key={stat.label} stat={stat} />)}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Accès rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Nouvel achat', href: '/purchases', emoji: '🛒' },
            { label: 'Nouvelle facture', href: '/invoices', emoji: '🧾' },
            { label: 'Nouveau produit', href: '/products', emoji: '💊' },
            { label: 'Nouveau client', href: '/customers', emoji: '👤' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-700
                hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors shadow-sm"
            >
              <span className="text-xl">{link.emoji}</span>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
