import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  FileText,
  Send,
  Settings,
  ChevronDown,
  ChevronRight,
  Tag,
  Layers,
  Pill,
  Beaker,
  Archive,
  Warehouse,
  Globe,
  FileCheck,
  Route,
  LogOut,
  Shield,
  BookOpen,
  Scale,
  TrendingUp,
  BookUser,
  ClipboardList,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import logo from '../../assets/logo.png'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const mainNav: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: <LayoutDashboard size={17} /> },
]

const businessNav: NavItem[] = [
  { to: '/products', label: 'Produits', icon: <Package size={17} /> },
  { to: '/suppliers', label: 'Fournisseurs', icon: <Truck size={17} /> },
  { to: '/customers', label: 'Clients', icon: <Users size={17} /> },
]

const ordersNav: NavItem[] = [
  { to: '/orders/customers', label: 'Commandes clients', icon: <ClipboardList size={17} /> },
  { to: '/orders/suppliers', label: 'Commandes fournisseurs', icon: <Truck size={17} /> },
]

const deliveryItem: NavItem = { to: '/deliveries', label: 'Livraisons', icon: <Send size={17} /> }

const configNav: NavItem[] = [
  { to: '/config/categories', label: 'Catégories', icon: <Tag size={16} /> },
  { to: '/config/therapeutic-classes', label: 'Classes thérapeutiques', icon: <Layers size={16} /> },
  { to: '/config/product-forms', label: 'Formes pharmaceutiques', icon: <Pill size={16} /> },
  { to: '/config/dosages', label: 'Dosages', icon: <Beaker size={16} /> },
  { to: '/config/packagings', label: 'Conditionnements', icon: <Archive size={16} /> },
  { to: '/config/warehouses', label: 'Entrepôts', icon: <Warehouse size={16} /> },
  { to: '/config/countries', label: 'Pays', icon: <Globe size={16} /> },
  { to: '/config/customs-regimes', label: 'Régimes douaniers', icon: <FileCheck size={16} /> },
  { to: '/config/transport-types', label: 'Types de transport', icon: <Route size={16} /> },
]

const accountingNav: NavItem[] = [
  { to: '/accounting/journal', label: 'Journal', icon: <ClipboardList size={16} /> },
  { to: '/accounting/chart-of-accounts', label: 'Plan comptable', icon: <BookOpen size={16} /> },
  { to: '/accounting/trial-balance', label: 'Balance générale', icon: <Scale size={16} /> },
  { to: '/accounting/pnl', label: 'Compte de résultat', icon: <TrendingUp size={16} /> },
  { to: '/accounting/third-party-ledger', label: 'Grand livre tiers', icon: <BookUser size={16} /> },
]

const adminNav: NavItem[] = [
  { to: '/users', label: 'Utilisateurs', icon: <Shield size={17} /> },
]

function NavItemLink({ item, compact }: { item: NavItem; compact?: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group
        ${isActive
          ? 'bg-brand-500 text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
        ${compact ? 'py-1.5 pl-10' : ''}`
      }
    >
      <span className="shrink-0 transition-transform group-hover:scale-105">{item.icon}</span>
      {item.label}
    </NavLink>
  )
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <div className="flex flex-col gap-0.5">
        {items.map(item => <NavItemLink key={item.to} item={item} />)}
      </div>
    </div>
  )
}

function InvoicesSection() {
  const location = useLocation()
  const isActive = location.pathname.startsWith('/invoices')
  const [open, setOpen] = useState(isActive)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        <span className="flex items-center gap-3">
          <FileText size={17} className={isActive ? 'text-brand-500' : ''} />
          Factures
        </span>
        {open
          ? <ChevronDown size={14} className="text-gray-400" />
          : <ChevronRight size={14} className="text-gray-400" />
        }
      </button>
      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 ml-2 pl-3 border-l border-gray-100">
          <NavLink
            to="/invoices/customers"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors
              ${isActive ? 'text-brand-600 font-semibold bg-brand-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`
            }
          >
            <Users size={15} className="shrink-0" />
            Clients
          </NavLink>
          <NavLink
            to="/invoices/suppliers"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors
              ${isActive ? 'text-brand-600 font-semibold bg-brand-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`
            }
          >
            <Truck size={15} className="shrink-0" />
            Fournisseurs
          </NavLink>
        </div>
      )}
    </div>
  )
}

function AccountingSection() {
  const location = useLocation()
  const isActive = location.pathname.startsWith('/accounting')
  const [open, setOpen] = useState(isActive)

  return (
    <div>
      <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Comptabilité</p>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        <span className="flex items-center gap-3">
          <Scale size={17} className={isActive ? 'text-brand-500' : ''} />
          SYSCOHADA
        </span>
        {open
          ? <ChevronDown size={14} className="text-gray-400" />
          : <ChevronRight size={14} className="text-gray-400" />
        }
      </button>
      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 ml-2 pl-3 border-l border-gray-100">
          {accountingNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors
                ${isActive ? 'text-brand-600 font-semibold bg-brand-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfigSection() {
  const location = useLocation()
  const isActive = location.pathname.startsWith('/config')
  const [open, setOpen] = useState(isActive)

  return (
    <div>
      <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Configuration</p>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        <span className="flex items-center gap-3">
          <Settings size={17} className={isActive ? 'text-brand-500' : ''} />
          Paramètres produits
        </span>
        {open
          ? <ChevronDown size={14} className="text-gray-400" />
          : <ChevronRight size={14} className="text-gray-400" />
        }
      </button>
      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 ml-2 pl-3 border-l border-gray-100">
          {configNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors
                ${isActive ? 'text-brand-600 font-semibold bg-brand-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <img src={logo} alt="LabMedis" className="h-9 object-contain object-left" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 flex flex-col gap-5">
        <NavSection label="Principal" items={mainNav} />
        <NavSection label="Catalogue & Tiers" items={businessNav} />
        <div>
          <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Commandes</p>
          <div className="flex flex-col gap-0.5">
            {ordersNav.map(item => <NavItemLink key={item.to} item={item} />)}
            <InvoicesSection />
            <NavItemLink item={deliveryItem} />
          </div>
        </div>
        <AccountingSection />
        <ConfigSection />
        <NavSection label="Administration" items={adminNav} />
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
            {(user?.fullName ?? user?.userName ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName ?? user?.userName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Déconnexion"
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
