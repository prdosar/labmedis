import { useCallback } from 'react'
import { stockMovementsApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'

function movementBadge(type: string) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    Entry: { label: 'Entrée', variant: 'green' },
    Exit: { label: 'Sortie', variant: 'red' },
    Adjustment: { label: 'Ajustement', variant: 'blue' },
    Transfer: { label: 'Transfert', variant: 'gray' },
  }
  const s = map[type] ?? { label: type, variant: 'gray' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function StockMovementsPage() {
  const fetcher = useCallback((p: number, s: number) => stockMovementsApi.getAll(p, s), [])
  const { data, loading, page, setPage } = usePagedData({ fetcher })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${data.totalCount} mouvement(s)` : ''}</p>
      </div>
      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucun mouvement de stock."
        columns={[
          { key: 'movementDate', header: 'Date', width: 'w-28', render: r => <span className="text-sm">{new Date(r.movementDate).toLocaleDateString('fr-FR')}</span> },
          { key: 'movementType', header: 'Type', width: 'w-28', render: r => movementBadge(r.movementType) },
          { key: 'productDesignation', header: 'Produit', render: r => (
            <div>
              <p className="font-medium text-gray-900">{r.productDesignation ?? '—'}</p>
              <p className="text-xs text-gray-400">{r.productCode}</p>
            </div>
          )},
          { key: 'quantity', header: 'Qté', width: 'w-16', render: r => (
            <span className={`font-semibold ${r.movementType === 'Exit' ? 'text-red-600' : 'text-green-600'}`}>
              {r.movementType === 'Exit' ? '-' : '+'}{r.quantity}
            </span>
          )},
          { key: 'warehouseName', header: 'Entrepôt', render: r => <span className="text-sm text-gray-600">{r.warehouseName ?? '—'}</span> },
          { key: 'lotNumber', header: 'Lot', render: r => r.lotNumber ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.lotNumber}</span> : <span className="text-gray-300">—</span> },
          { key: 'reference', header: 'Référence', render: r => <span className="text-sm text-gray-500">{r.reference ?? '—'}</span> },
        ]}
      />
      {data && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}
    </div>
  )
}
