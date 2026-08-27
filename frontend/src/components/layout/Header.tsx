import { useLocation } from 'react-router-dom'

const titles: Record<string, string> = {
  '/': 'Tableau de bord',
  '/products': 'Produits',
  '/suppliers': 'Fournisseurs',
  '/customers': 'Clients',
  '/purchases': 'Achats',
  '/invoices': 'Factures',
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
}

export function Header() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'LabMedis'

  return (
    <header className="fixed top-0 right-0 left-64 h-14 bg-white border-b border-gray-200 flex items-center px-6 z-20">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-md">
          LabMedis · Lomé, Togo
        </span>
      </div>
    </header>
  )
}
