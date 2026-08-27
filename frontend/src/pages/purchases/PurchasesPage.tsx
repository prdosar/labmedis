import { useCallback } from 'react'
import { Eye } from 'lucide-react'
import { purchasesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'

const CURRENCY = ['XOF', 'EUR', 'USD']

export function PurchasesPage() {
  const fetcher = useCallback((p: number, s: number) => purchasesApi.getAll(p, s), [])
  const { data, loading, page, setPage } = usePagedData({ fetcher })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${data.totalCount} achat(s)` : ''}</p>
      </div>

      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucun achat enregistré."
        columns={[
          { key: 'reference', header: 'Référence', render: r => <span className="font-mono font-semibold text-gray-900">{r.reference}</span> },
          { key: 'purchaseDate', header: 'Date achat', width: 'w-28', render: r => <span className="text-sm">{new Date(r.purchaseDate).toLocaleDateString('fr-FR')}</span> },
          { key: 'supplierName', header: 'Fournisseur', render: r => <span className="font-medium">{r.supplierName ?? '—'}</span> },
          { key: 'purchaseCurrency', header: 'Devise', width: 'w-20', render: r => (
            <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
              {CURRENCY[r.purchaseCurrency] ?? r.purchaseCurrency}
            </span>
          )},
          { key: 'lines', header: 'Lignes', width: 'w-16', render: r => (
            <span className="text-sm text-gray-600">{r.lines?.length ?? 0}</span>
          )},
          { key: 'containerReference', header: 'Conteneur', render: r => <span className="text-sm text-gray-500">{r.containerReference ?? '—'}</span> },
          { key: 'arrivalDate', header: 'Date arrivée', width: 'w-28', render: r => r.arrivalDate ? <span className="text-sm">{new Date(r.arrivalDate).toLocaleDateString('fr-FR')}</span> : <span className="text-gray-300">—</span> },
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
