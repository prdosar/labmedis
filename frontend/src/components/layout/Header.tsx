import { useLocation } from 'react-router-dom'
import { NotificationBell } from './NotificationBell'

const titles: Record<string, string> = {
  '/': 'Tableau de bord',
  '/products': 'Produits',
  '/suppliers': 'Fournisseurs',
  '/customers': 'Clients',
  '/orders/customers': 'Commandes clients',
  '/orders/customers/new': 'Nouvelle commande client',
  '/orders/suppliers': 'Commandes fournisseurs',
  '/orders/suppliers/new': 'Nouveau bon de commande fournisseur',
  '/purchases': 'Achats',
  '/invoices/customers': 'Factures clients',
  '/invoices/suppliers': 'Factures fournisseurs',
  '/deliveries': 'Livraisons',
  '/stock-movements': 'Mouvements de stock',
  '/config/categories': 'Catégories',
  '/config/therapeutic-classes': 'Classes thérapeutiques',
  '/config/product-forms': 'Formes pharmaceutiques',
  '/config/dosages': 'Dosages',
  '/config/packagings': 'Conditionnements',
  '/config/warehouses': 'Entrepôts',
  '/config/countries': 'Pays',
  '/config/customs-regimes': 'Régimes douaniers',
  '/config/transport-types': 'Types de transport',
  '/users': 'Utilisateurs',
  '/accounting/journal': 'Journal comptable',
  '/accounting/chart-of-accounts': 'Plan comptable SYSCOHADA',
  '/accounting/trial-balance': 'Balance générale',
  '/accounting/pnl': 'Compte de résultat',
  '/accounting/third-party-ledger': 'Grand livre tiers',
}

export function Header() {
  const { pathname } = useLocation()
  const title = titles[pathname]
    ?? (/^\/products\/\d+/.test(pathname) ? 'Fiche produit'
      : /^\/orders\/customers\/\d+\/edit/.test(pathname) ? 'Commande client'
      : /^\/orders\/suppliers\/\d+\/edit/.test(pathname) ? 'Bon de commande fournisseur'
      : /^\/orders\/suppliers\/\d+\/receive-proforma/.test(pathname) ? 'Saisie proforma'
      : /^\/orders\/suppliers\/\d+\/receive-invoice/.test(pathname) ? 'Facture fournisseur'
      : /^\/orders\/suppliers\/\d+\/receive-goods/.test(pathname) ? 'Réception marchandises'
      : 'LabMedis')

  return (
    <header className="fixed top-0 right-0 left-64 h-14 bg-white border-b border-gray-200 flex items-center px-6 z-20">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-md">
          LabMedis · Lomé, Togo
        </span>
      </div>
    </header>
  )
}
