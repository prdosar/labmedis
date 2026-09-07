import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageX, Filter, Truck, Package } from 'lucide-react'
import {
  notificationsApi,
  suppliersApi,
  categoriesApi,
} from '../../api/endpoints'
import type {
  LowStockRowDto,
  SupplierDto,
  CategoryDto,
} from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import type { BadgeVariant } from '../../components/ui/Badge'
import { ComboSelect } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'

const PAGE_SIZE = 25

function stockBadge(row: LowStockRowDto): { label: string; variant: BadgeVariant } {
  if (row.stockUnits === 0) return { label: 'Épuisé', variant: 'red' }
  const ratio = row.stockUnits / row.thresholdUnits
  if (ratio < 0.25) return { label: 'Critique', variant: 'red' }
  if (ratio < 0.5) return { label: 'Bas', variant: 'orange' }
  return { label: 'Sous seuil', variant: 'yellow' }
}

export function LowStockPage() {
  const navigate = useNavigate()

  const [rows, setRows] = useState<LowStockRowDto[]>([])
  const [total, setTotal] = useState(0)
  const [thresholdCartons, setThresholdCartons] = useState(10)
  const [thresholdUnits, setThresholdUnits] = useState(50)
  const [supplierId, setSupplierId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])

  useEffect(() => {
    Promise.all([suppliersApi.getForSelect(), categoriesApi.getForSelect()])
      .then(([s, c]) => { setSuppliers(s); setCategories(c) })
  }, [])

  useEffect(() => {
    setLoading(true)
    notificationsApi.getLowStock({
      supplierId: supplierId ? Number(supplierId) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      page,
      size: PAGE_SIZE,
    })
      .then(r => {
        setRows(r.items)
        setTotal(r.totalCount)
        setThresholdCartons(r.lowStockCartonsThreshold)
        setThresholdUnits(r.lowStockUnitsThreshold)
      })
      .finally(() => setLoading(false))
  }, [supplierId, categoryId, page])

  function passerCommande(row: LowStockRowDto) {
    if (!row.supplierId) return
    // Quantité suggérée : de quoi remonter à 2× le seuil (arrondie au carton si applicable)
    const suggestedUnits = Math.max(row.thresholdUnits * 2 - row.stockUnits, row.thresholdUnits)
    const suggestedQty = row.isCartonBased
      ? Math.ceil(suggestedUnits / row.unitsPerCarton)
      : suggestedUnits
    const orderUnit = row.isCartonBased ? 'Carton' : 'Boite'
    const params = new URLSearchParams({
      prefillSupplierId: String(row.supplierId),
      prefillProductId: String(row.productId),
      prefillQuantity: String(suggestedQty),
      prefillOrderUnit: orderUnit,
      prefillUnitsPerCarton: String(row.unitsPerCarton),
    })
    navigate(`/orders/suppliers/new?${params}`)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const supplierOptions = useMemo(
    () => [{ value: '', label: 'Tous fournisseurs' }, ...suppliers.map(s => ({ value: String(s.id), label: `${s.code} – ${s.name}` }))],
    [suppliers],
  )
  const categoryOptions = useMemo(
    () => [{ value: '', label: 'Toutes catégories' }, ...categories.map(c => ({ value: String(c.id), label: c.name }))],
    [categories],
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <PackageX size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Produits en stock faible</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total} produit{total > 1 ? 's' : ''} — seuils : {thresholdCartons} cartons ou {thresholdUnits} unités
            </p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-end gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter size={14} />
          <span className="font-medium">Filtres</span>
        </div>
        <div className="w-64">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Fournisseur</label>
          <ComboSelect
            value={supplierId}
            onChange={v => { setSupplierId(v); setPage(1) }}
            options={supplierOptions}
            placeholder="Tous fournisseurs"
          />
        </div>
        <div className="w-56">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Catégorie</label>
          <ComboSelect
            value={categoryId}
            onChange={v => { setCategoryId(v); setPage(1) }}
            options={categoryOptions}
            placeholder="Toutes catégories"
          />
        </div>
        {(supplierId || categoryId) && (
          <button
            onClick={() => { setSupplierId(''); setCategoryId(''); setPage(1) }}
            className="text-xs text-gray-500 hover:text-gray-700 underline ml-auto"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-sm text-gray-400">
            <Package size={24} className="text-gray-300" />
            <span>Aucun produit sous les seuils configurés.</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Désignation</th>
                <th className="px-4 py-3 text-left">Catégorie</th>
                <th className="px-4 py-3 text-right">Stock actuel</th>
                <th className="px-4 py-3 text-right">Seuil</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-left">Fournisseur</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => {
                const sb = stockBadge(r)
                return (
                  <tr key={r.productId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.productCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 max-w-xs truncate">{r.productDesignation}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.categoryName ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-gray-900">
                        {r.isCartonBased
                          ? <>{r.stockCartons} <span className="text-xs text-gray-400 font-normal">carton{r.stockCartons > 1 ? 's' : ''}</span></>
                          : <>{r.stockUnits} <span className="text-xs text-gray-400 font-normal">unité{r.stockUnits > 1 ? 's' : ''}</span></>
                        }
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {r.isCartonBased
                          ? `= ${r.stockUnits} boîte(s)`
                          : ''
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {r.isCartonBased
                        ? `${r.thresholdCartons} cartons`
                        : `${r.thresholdUnits} unités`
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={sb.variant}>{sb.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.supplierName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => passerCommande(r)}
                          disabled={!r.supplierId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-200 bg-brand-50 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title={r.supplierId ? 'Ouvrir un bon de commande pré-rempli' : 'Aucun fournisseur associé'}
                        >
                          <Truck size={13} />
                          Passer commande
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
