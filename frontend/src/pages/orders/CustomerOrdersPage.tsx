import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, CheckCircle, XCircle, CheckCheck, Search, X } from 'lucide-react'
import type { CustomerOrderSummaryDto } from '../../api/types'
import { customerOrdersApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Modal'
import { fmtXof } from '../../utils/format'

const STATUS_LABELS: Record<string, string> = {
  EnAttente: 'En attente',
  Validée: 'Validée',
  EnPréparation: 'En préparation',
  Terminée: 'Terminée',
  Annulée: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  EnAttente: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Validée: 'bg-blue-50 text-blue-700 border border-blue-200',
  EnPréparation: 'bg-purple-50 text-purple-700 border border-purple-200',
  Terminée: 'bg-green-50 text-green-700 border border-green-200',
  Annulée: 'bg-red-50 text-red-500 border border-red-200',
}

const STATUSES = ['', 'EnAttente', 'Validée', 'EnPréparation', 'Terminée', 'Annulée']

const searchInputClass = 'rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'


export function CustomerOrdersPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetcher = useCallback(
    (p: number, s: number) => customerOrdersApi.getAll({ page: p, size: s, status: statusFilter || undefined }),
    [statusFilter],
  )
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher, pageSize: 20 })

  const filtered = (data?.items ?? []).filter(r =>
    r.reference.toLowerCase().includes(search.toLowerCase()) ||
    r.customerName.toLowerCase().includes(search.toLowerCase()),
  )

  const [confirmAction, setConfirmAction] = useState<{ order: CustomerOrderSummaryDto; action: 'validate' | 'complete' | 'cancel' } | null>(null)
  const [acting, setActing] = useState(false)

  async function handleConfirmAction() {
    if (!confirmAction) return
    setActing(true)
    try {
      const { order, action } = confirmAction
      if (action === 'validate') await customerOrdersApi.validate(order.id)
      else if (action === 'complete') {
        await customerOrdersApi.complete(order.id)
        toast('Commande clôturée.', 'success')
        setConfirmAction(null)
        navigate(`/orders/customers/${order.id}`)
        return
      }
      else await customerOrdersApi.cancel(order.id)
      toast(action === 'cancel' ? 'Commande annulée.' : 'Commande validée.', action === 'cancel' ? 'info' : 'success')
      setConfirmAction(null)
      refresh()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setActing(false)
    }
  }

  const confirmMessages = {
    validate: (name: string) => `Valider la commande ${name} et générer une facture brouillon ?`,
    complete: (name: string) => `Clôturer la commande ${name} ? Le stock sera déduit et les écritures comptables passées.`,
    cancel: (name: string) => `Annuler la commande ${name} ?`,
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            {data ? `${search ? `${filtered.length} / ` : ''}${data.totalCount} commande(s)` : ''}
          </p>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s ? STATUS_LABELS[s] : 'Tous les statuts'}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => navigate('/orders/customers/new')} icon={<Plus size={15} />}>
          Nouvelle commande
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={searchInputClass}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
            <X size={13} />
          </button>
        )}
      </div>

      <DataTable
        rows={filtered}
        loading={loading}
        keyExtractor={r => r.id}
        emptyMessage="Aucune commande."
        columns={[
          {
            key: 'reference', header: 'Référence', width: 'w-36', render: r => (
              <span className="font-mono text-xs font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{r.reference}</span>
            ),
          },
          {
            key: 'date', header: 'Date', width: 'w-28', render: r =>
              new Date(r.orderDate).toLocaleDateString('fr-FR'),
          },
          {
            key: 'customer', header: 'Client', render: r => (
              <div>
                <p className="font-medium text-gray-900">{r.customerName}</p>
                <p className="text-xs text-gray-400">Solde : {fmtXof(r.customerBalance)}</p>
              </div>
            ),
          },
          {
            key: 'status', header: 'Statut', width: 'w-28', render: r => (
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-50 text-gray-600'}`}>
                {STATUS_LABELS[r.status] ?? r.status}
              </span>
            ),
          },
          {
            key: 'vat', header: 'TVA', width: 'w-16', render: r => (
              r.vatApplied
                ? <span className="text-xs text-green-600 font-medium">18%</span>
                : <span className="text-xs text-gray-400">—</span>
            ),
          },
          {
            key: 'totalHt', header: 'Total HT', width: 'w-28', render: r => (
              <span className="text-right block text-gray-800">{fmtXof(r.totalHt)}</span>
            ),
          },
          {
            key: 'totalTtc', header: 'Total TTC', width: 'w-28', render: r => (
              <span className="text-right block font-semibold text-gray-900">{fmtXof(r.totalTtc)}</span>
            ),
          },
          {
            key: 'profit', header: 'Bénéfice', width: 'w-28', render: r => (
              <span className={`text-right block text-xs font-medium ${r.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {fmtXof(r.profit)}
              </span>
            ),
          },
        ]}
        actions={row => (
          <div className="flex items-center gap-1">
            <button
              title={row.status === 'Terminée' || row.status === 'Annulée' ? 'Voir le détail' : 'Voir / Modifier'}
              onClick={() => navigate(
                row.status === 'Terminée' || row.status === 'Annulée' || row.status === 'EnPréparation'
                  ? `/orders/customers/${row.id}`
                  : `/orders/customers/${row.id}/edit`
              )}
              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <Eye size={14} />
            </button>
            {(row.status === 'EnAttente' || row.status === 'Validée' || row.status === 'EnPréparation') && (
              <>
                {row.status === 'EnAttente' && (
                  <button
                    title="Valider"
                    onClick={() => setConfirmAction({ order: row, action: 'validate' })}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <CheckCircle size={14} />
                  </button>
                )}
                {(row.status === 'Validée' || row.status === 'EnPréparation') && (
                  <button
                    title="Clôturer (livré)"
                    onClick={() => setConfirmAction({ order: row, action: 'complete' })}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                <button
                  title="Annuler"
                  onClick={() => setConfirmAction({ order: row, action: 'cancel' })}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XCircle size={14} />
                </button>
              </>
            )}
          </div>
        )}
      />

      {data && !search && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={
          confirmAction?.action === 'validate' ? 'Valider la commande' :
          confirmAction?.action === 'complete' ? 'Clôturer la commande' :
          'Annuler la commande'
        }
        message={confirmAction ? confirmMessages[confirmAction.action](confirmAction.order.reference) : ''}
        loading={acting}
        confirmLabel={
          confirmAction?.action === 'cancel' ? 'Annuler la commande' :
          confirmAction?.action === 'validate' ? 'Valider' : 'Clôturer'
        }
        confirmVariant={confirmAction?.action === 'cancel' ? 'danger' : 'primary'}
      />
    </div>
  )
}
