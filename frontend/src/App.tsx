import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { ProductDetailPage } from './pages/products/ProductDetailPage'
import { SuppliersPage } from './pages/suppliers/SuppliersPage'
import { CustomersPage } from './pages/customers/CustomersPage'
import { PurchasesPage } from './pages/purchases/PurchasesPage'
import { InvoicesPage } from './pages/invoices/InvoicesPage'
import { DeliveriesPage } from './pages/deliveries/DeliveriesPage'
import { StockMovementsPage } from './pages/stock/StockMovementsPage'
import { CategoriesPage } from './pages/config/CategoriesPage'
import { TherapeuticClassesPage } from './pages/config/TherapeuticClassesPage'
import { ProductFormsPage } from './pages/config/ProductFormsPage'
import { DosagesPage } from './pages/config/DosagesPage'
import { PackagingsPage } from './pages/config/PackagingsPage'
import { WarehousesPage } from './pages/config/WarehousesPage'
import { CountriesPage } from './pages/config/CountriesPage'
import { CustomsRegimesPage } from './pages/config/CustomsRegimesPage'
import { TransportTypesPage } from './pages/config/TransportTypesPage'
import { UsersPage } from './pages/users/UsersPage'
import { ChartOfAccountsPage } from './pages/accounting/ChartOfAccountsPage'
import { JournalPage } from './pages/accounting/JournalPage'
import { TrialBalancePage } from './pages/accounting/TrialBalancePage'
import { PnLPage } from './pages/accounting/PnLPage'
import { ThirdPartyLedgerPage } from './pages/accounting/ThirdPartyLedgerPage'
import { CustomerOrdersPage } from './pages/orders/CustomerOrdersPage'
import { CustomerOrderFormPage } from './pages/orders/CustomerOrderFormPage'
import { SupplierOrdersPage } from './pages/orders/SupplierOrdersPage'
import { SupplierOrderFormPage } from './pages/orders/SupplierOrderFormPage'
import { ReceiveProformaPage } from './pages/orders/ReceiveProformaPage'

function ProtectedRoutes() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <AppLayout />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/orders/customers" element={<CustomerOrdersPage />} />
              <Route path="/orders/customers/new" element={<CustomerOrderFormPage />} />
              <Route path="/orders/customers/:id/edit" element={<CustomerOrderFormPage />} />
              <Route path="/orders/suppliers" element={<SupplierOrdersPage />} />
              <Route path="/orders/suppliers/new" element={<SupplierOrderFormPage />} />
              <Route path="/orders/suppliers/:id/edit" element={<SupplierOrderFormPage />} />
              <Route path="/orders/suppliers/:id/receive-proforma" element={<ReceiveProformaPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/deliveries" element={<DeliveriesPage />} />
              <Route path="/stock-movements" element={<StockMovementsPage />} />
              <Route path="/config/categories" element={<CategoriesPage />} />
              <Route path="/config/therapeutic-classes" element={<TherapeuticClassesPage />} />
              <Route path="/config/product-forms" element={<ProductFormsPage />} />
              <Route path="/config/dosages" element={<DosagesPage />} />
              <Route path="/config/packagings" element={<PackagingsPage />} />
              <Route path="/config/warehouses" element={<WarehousesPage />} />
              <Route path="/config/countries" element={<CountriesPage />} />
              <Route path="/config/customs-regimes" element={<CustomsRegimesPage />} />
              <Route path="/config/transport-types" element={<TransportTypesPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/accounting/chart-of-accounts" element={<ChartOfAccountsPage />} />
              <Route path="/accounting/journal" element={<JournalPage />} />
              <Route path="/accounting/trial-balance" element={<TrialBalancePage />} />
              <Route path="/accounting/pnl" element={<PnLPage />} />
              <Route path="/accounting/third-party-ledger" element={<ThirdPartyLedgerPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
