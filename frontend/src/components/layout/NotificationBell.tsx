import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ClipboardList, Truck, Clock, PackageX, ExternalLink } from 'lucide-react'
import { notificationsApi } from '../../api/endpoints'
import type { NotificationSummaryDto, NotificationItemDto } from '../../api/types'

const POLL_INTERVAL_MS = 60_000

const CATEGORIES: {
  key: keyof Pick<NotificationSummaryDto, 'pendingCustomerOrdersCount' | 'pendingSupplierOrdersCount' | 'expiringProductsCount' | 'lowStockCount'>
  matches: (t: string) => boolean
  label: string
  icon: React.ReactNode
  linkAll?: string
}[] = [
  { key: 'pendingCustomerOrdersCount', matches: t => t === 'PendingCustomerOrder',
    label: 'Commandes clients en attente', icon: <ClipboardList size={13} className="text-blue-500" />,
    linkAll: '/orders/customers' },
  { key: 'pendingSupplierOrdersCount', matches: t => t === 'PendingSupplierOrder',
    label: 'BC fournisseurs en cours', icon: <Truck size={13} className="text-indigo-500" />,
    linkAll: '/orders/suppliers' },
  { key: 'expiringProductsCount', matches: t => t === 'ExpiringProduct',
    label: 'Produits proches péremption (< 6 mois)', icon: <Clock size={13} className="text-amber-500" />,
    linkAll: '/products' },
  { key: 'lowStockCount', matches: t => t === 'LowStock',
    label: 'Stock faible', icon: <PackageX size={13} className="text-red-500" />,
    linkAll: '/products' },
]

function severityDot(sev: string) {
  const cls = sev === 'danger' ? 'bg-red-500'
    : sev === 'warning' ? 'bg-amber-500'
    : 'bg-blue-500'
  return <span className={`w-1.5 h-1.5 rounded-full ${cls} shrink-0 mt-1.5`} />
}

function fmtRelDate(iso: string | null) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch { return '' }
}

export function NotificationBell() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<NotificationSummaryDto | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  async function fetchSummary() {
    setLoading(true)
    try {
      const s = await notificationsApi.getSummary()
      setSummary(s)
    } catch { /* silent — la cloche ne doit pas casser l'UI */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchSummary()
    const id = setInterval(fetchSummary, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function handleItemClick(item: NotificationItemDto) {
    if (item.link) {
      setOpen(false)
      navigate(item.link)
    }
  }

  const total = summary?.totalCount ?? 0

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchSummary() }}
        aria-label="Notifications"
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[70vh] overflow-hidden flex flex-col bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-400">
                {total === 0 ? 'Aucune alerte' : `${total} alerte(s) active(s)`}
              </p>
            </div>
            <button
              onClick={fetchSummary}
              disabled={loading}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:text-gray-300"
            >
              {loading ? '…' : 'Rafraîchir'}
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {!summary && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Chargement…
              </div>
            )}
            {summary && total === 0 && (
              <div className="px-4 py-10 text-center flex flex-col items-center gap-2 text-gray-400">
                <Bell size={22} className="text-gray-300" />
                <span className="text-sm">Tout est à jour — aucune alerte.</span>
              </div>
            )}
            {summary && total > 0 && CATEGORIES.map(cat => {
              const count = summary[cat.key]
              if (count === 0) return null
              const items = summary.items.filter(i => cat.matches(i.type))
              const shownCount = items.length
              const hiddenCount = count - shownCount
              return (
                <div key={cat.key} className="border-b border-gray-100 last:border-b-0">
                  <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                    {cat.icon}
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{cat.label}</span>
                    <span className="ml-auto text-xs text-gray-500 font-medium bg-white border border-gray-200 rounded-full px-2 py-0.5">
                      {count}
                    </span>
                  </div>
                  <ul>
                    {items.map((item, i) => (
                      <li key={`${cat.key}-${i}`}>
                        <button
                          onClick={() => handleItemClick(item)}
                          className="w-full flex items-start gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-left group"
                        >
                          {severityDot(item.severity)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                            <p className="text-xs text-gray-500 truncate">{item.message}</p>
                            {item.date && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{fmtRelDate(item.date)}</p>
                            )}
                          </div>
                          {item.link && (
                            <ExternalLink size={12} className="text-gray-300 group-hover:text-brand-500 mt-1 shrink-0" />
                          )}
                        </button>
                      </li>
                    ))}
                    {hiddenCount > 0 && cat.linkAll && (
                      <li>
                        <button
                          onClick={() => { setOpen(false); navigate(cat.linkAll!) }}
                          className="w-full text-left px-4 py-2 text-xs text-brand-600 hover:bg-brand-50 hover:text-brand-700 font-medium"
                        >
                          + {hiddenCount} autre(s) — voir tout
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
