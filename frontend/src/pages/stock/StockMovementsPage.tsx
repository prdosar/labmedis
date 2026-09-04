import { useEffect, useMemo, useState } from 'react'
import { XCircle, X } from 'lucide-react'
import { stockMovementsApi, productsApi, warehousesApi } from '../../api/endpoints'
import type { StockMovementDto, ProductDto, WarehouseDto } from '../../api/types'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { ComboSelect } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'PurchaseEntry', label: 'Entrée achat' },
  { value: 'SaleExit', label: 'Sortie vente' },
  { value: 'Loss', label: 'Perte' },
  { value: 'Adjustment', label: 'Ajustement' },
  { value: 'Return', label: 'Retour client' },
  { value: 'SupplierReturn', label: 'Retour fourn.' },
  { value: 'Transfer', label: 'Transfert' },
]

const TYPE_META: Record<string, { label: string; variant: BadgeVariant; isExit: boolean }> = {
  PurchaseEntry: { label: 'Entrée achat', variant: 'green', isExit: false },
  SaleExit: { label: 'Sortie vente', variant: 'red', isExit: true },
  Loss: { label: 'Perte', variant: 'red', isExit: true },
  Adjustment: { label: 'Ajustement', variant: 'yellow', isExit: true },
  Return: { label: 'Retour client', variant: 'green', isExit: false },
  SupplierReturn: { label: 'Retour fourn.', variant: 'yellow', isExit: true },
  Transfer: { label: 'Transfert', variant: 'gray', isExit: false },
}

const CANCELLABLE_TYPES = new Set(['Loss', 'Adjustment'])

const PAGE_SIZE = 20

const inputCls =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white'

export function StockMovementsPage() {
  const { toast } = useToast()
  const [data, setData] = useState<{ items: StockMovementDto[]; totalCount: number; totalPages: number; pageSize: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Filters
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [movementType, setMovementType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Reference data
  const [products, setProducts] = useState<ProductDto[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([])

  // Cancel action
  const [cancelTarget, setCancelTarget] = useState<StockMovementDto | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const productOptions = useMemo(
    () => products.map(p => ({ value: String(p.id), label: `${p.code} — ${p.designation}` })),
    [products],
  )
  const warehouseOptions = useMemo(
    () => warehouses.map(w => ({ value: String(w.id), label: w.name })),
    [warehouses],
  )

  useEffect(() => {
    Promise.all([productsApi.getForSelect(), warehousesApi.getForSelect()])
      .then(([p, w]) => { setProducts(p); setWarehouses(w) })
  }, [])

  const loadItems = () => {
    setLoading(true)
    stockMovementsApi.getAll(page, PAGE_SIZE, {
      productId: productId ? Number(productId) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      movementType: movementType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }).then(r => setData(r)).finally(() => setLoading(false))
  }

  useEffect(loadItems, [page, productId, warehouseId, movementType, dateFrom, dateTo])

  const resetFilters = () => {
    setProductId('')
    setWarehouseId('')
    setMovementType('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await stockMovementsApi.cancel(cancelTarget.id)
      toast('Mouvement annulé, stock rétabli.', 'success')
      setCancelTarget(null)
      loadItems()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setCancelling(false)
    }
  }

  const hasFilters = productId || warehouseId || movementType || dateFrom || dateTo

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {data ? `${data.totalCount} mouvement(s)` : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Produit</label>
          <ComboSelect
            value={productId}
            onChange={v => { setProductId(v); setPage(1) }}
            options={productOptions}
            placeholder="Tous les produits"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Entrepôt</label>
          <ComboSelect
            value={warehouseId}
            onChange={v => { setWarehouseId(v); setPage(1) }}
            options={warehouseOptions}
            placeholder="Tous les entrepôts"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select
            value={movementType}
            onChange={e => { setMovementType(e.target.value); setPage(1) }}
            className={`w-full ${inputCls}`}
          >
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className={`w-full ${inputCls}`}
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className={`w-full ${inputCls}`}
            />
          </div>
          {hasFilters && (
            <button
              onClick={resetFilters}
              title="Réinitialiser"
              className="p-2 mb-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucun mouvement de stock pour ces filtres."
        columns={[
          { key: 'movementDate', header: 'Date', width: 'w-28', render: r => <span className="text-sm">{new Date(r.movementDate).toLocaleDateString('fr-FR')}</span> },
          {
            key: 'movementType', header: 'Type', width: 'w-32', render: r => {
              const meta = TYPE_META[r.movementType]
              return <Badge variant={meta?.variant ?? 'gray'}>{meta?.label ?? r.movementType}</Badge>
            },
          },
          { key: 'productDesignation', header: 'Produit', render: r => (
            <div>
              <p className="font-medium text-gray-900">{r.productDesignation ?? '—'}</p>
              <p className="text-xs text-gray-400">{r.productCode}</p>
            </div>
          )},
          { key: 'quantity', header: 'Qté', width: 'w-20', render: r => {
            const meta = TYPE_META[r.movementType]
            const isExit = meta?.isExit ?? false
            return (
              <span className={`font-semibold ${isExit ? 'text-red-600' : 'text-green-600'}`}>
                {isExit ? '-' : '+'}{Math.abs(r.quantity)}
              </span>
            )
          }},
          { key: 'warehouseName', header: 'Entrepôt', render: r => <span className="text-sm text-gray-600">{r.warehouseName ?? '—'}</span> },
          { key: 'lotNumber', header: 'Lot', render: r => r.lotNumber ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.lotNumber}</span> : <span className="text-gray-300">—</span> },
          { key: 'reference', header: 'Référence', render: r => <span className="text-sm text-gray-500">{r.reference ?? '—'}</span> },
        ]}
        actions={r => (
          CANCELLABLE_TYPES.has(r.movementType) ? (
            <button
              title="Annuler le mouvement et rétablir le stock"
              onClick={() => setCancelTarget(r)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <XCircle size={14} />
            </button>
          ) : null
        )}
      />

      {data && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Annuler le mouvement"
        message={cancelTarget
          ? `Annuler ce mouvement de ${Math.abs(cancelTarget.quantity)} sur "${cancelTarget.productDesignation}" (lot ${cancelTarget.lotNumber ?? '—'}) ? Le stock sera rétabli.`
          : ''}
        loading={cancelling}
        confirmLabel="Annuler le mouvement"
        confirmVariant="danger"
      />
    </div>
  )
}
