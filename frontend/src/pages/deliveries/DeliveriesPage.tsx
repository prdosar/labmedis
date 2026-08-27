import { useCallback } from 'react'
import { Eye } from 'lucide-react'
import { deliveriesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { deliveryStatusBadge } from '../../components/ui/Badge'

export function DeliveriesPage() {
  const fetcher = useCallback((p: number, s: number) => deliveriesApi.getAll(p, s), [])
  const { data, loading, page, setPage } = usePagedData({ fetcher })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${data.totalCount} livraison(s)` : ''}</p>
      </div>
      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucune livraison."
        columns={[
          { key: 'reference', header: 'Référence', render: r => <span className="font-mono font-semibold text-gray-900">{r.reference}</span> },
          { key: 'deliveryDate', header: 'Date', width: 'w-28', render: r => <span className="text-sm">{new Date(r.deliveryDate).toLocaleDateString('fr-FR')}</span> },
          { key: 'invoiceReference', header: 'Facture', render: r => <span className="font-mono text-sm text-brand-600">{r.invoiceReference ?? '—'}</span> },
          { key: 'status', header: 'Statut', width: 'w-32', render: r => deliveryStatusBadge(r.status) },
          { key: 'recipientName', header: 'Destinataire', render: r => r.recipientName ?? <span className="text-gray-300">—</span> },
          { key: 'carrierName', header: 'Transporteur', render: r => r.carrierName ?? <span className="text-gray-300">—</span> },
          { key: 'lines', header: 'Lignes', width: 'w-16', render: r => <span className="text-sm text-gray-600">{r.lines?.length ?? 0}</span> },
        ]}
        actions={() => (
          <button title="Voir détail" className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
            <Eye size={14} />
          </button>
        )}
      />
      {data && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}
    </div>
  )
}
