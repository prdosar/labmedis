import { useCallback } from 'react'
import { Eye } from 'lucide-react'
import { invoicesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { invoiceStatusBadge } from '../../components/ui/Badge'

function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
}

export function InvoicesPage() {
  const fetcher = useCallback((p: number, s: number) => invoicesApi.getAll(p, s), [])
  const { data, loading, page, setPage } = usePagedData({ fetcher })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${data.totalCount} facture(s)` : ''}</p>
      </div>

      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucune facture."
        columns={[
          { key: 'reference', header: 'Référence', render: r => <span className="font-mono font-semibold text-gray-900">{r.reference}</span> },
          { key: 'invoiceDate', header: 'Date', width: 'w-28', render: r => <span className="text-sm">{new Date(r.invoiceDate).toLocaleDateString('fr-FR')}</span> },
          { key: 'customerName', header: 'Client', render: r => <span className="font-medium">{r.customerName ?? '—'}</span> },
          { key: 'status', header: 'Statut', width: 'w-32', render: r => invoiceStatusBadge(r.status) },
          { key: 'totalTtc', header: 'Total TTC', width: 'w-36', render: r => <span className="font-semibold text-gray-900">{fmtXof(r.totalTtc)}</span> },
          { key: 'balanceDue', header: 'Solde dû', width: 'w-32', render: r => (
            <span className={r.balanceDue > 0 ? 'font-semibold text-red-600' : 'text-green-600'}>{fmtXof(r.balanceDue)}</span>
          )},
          { key: 'dueDate', header: 'Échéance', width: 'w-28', render: r => r.dueDate ? <span className="text-sm">{new Date(r.dueDate).toLocaleDateString('fr-FR')}</span> : <span className="text-gray-300">—</span> },
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
