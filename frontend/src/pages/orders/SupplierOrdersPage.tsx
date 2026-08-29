import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Edit2, Send, XCircle, Search, X, FileInput,
  CheckCircle, AlertTriangle, FileText, Package,
} from 'lucide-react'
import type { SupplierOrderSummaryDto } from '../../api/types'
import { supplierOrdersApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'

const STATUS_LABELS: Record<string, string> = {
  Brouillon: 'Brouillon',
  Envoyée: 'Envoyée',
  ProformaReçue: 'Proforma reçue',
  ProformaValidée: 'Proforma validée',
  FactureReçue: 'Facture reçue',
  Réceptionnée: 'Réceptionnée',
  Convertie: 'Convertie',
  Annulée: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  Brouillon: 'bg-gray-50 text-gray-600 border border-gray-200',
  Envoyée: 'bg-blue-50 text-blue-700 border border-blue-200',
  ProformaReçue: 'bg-amber-50 text-amber-700 border border-amber-200',
  ProformaValidée: 'bg-violet-50 text-violet-700 border border-violet-200',
  FactureReçue: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  Réceptionnée: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Convertie: 'bg-green-50 text-green-700 border border-green-200',
  Annulée: 'bg-red-50 text-red-500 border border-red-200',
}

const STATUSES = [
  '', 'Brouillon', 'Envoyée', 'ProformaReçue',
  'ProformaValidée', 'FactureReçue', 'Réceptionnée', 'Convertie', 'Annulée',
]

const TERMINAL = new Set(['Réceptionnée', 'Convertie', 'Annulée'])

const searchInputClass =
  'rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export function SupplierOrdersPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetcher = useCallback(
    (p: number, s: number) =>
      supplierOrdersApi.getAll({ page: p, size: s, status: statusFilter || undefined }),
    [statusFilter],
  )
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher, pageSize: 20 })

  const filtered = (data?.items ?? []).filter(
    r =>
      r.reference.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(search.toLowerCase()),
  )

  const [confirmSend, setConfirmSend] = useState<SupplierOrderSummaryDto | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<SupplierOrderSummaryDto | null>(null)
  const [confirmValidate, setConfirmValidate] = useState<SupplierOrderSummaryDto | null>(null)
  const [rejectModal, setRejectModal] = useState<{ order: SupplierOrderSummaryDto; reason: string } | null>(null)
  const [acting, setActing] = useState(false)

  async function handleSend() {
    if (!confirmSend) return
    setActing(true)
    try {
      await supplierOrdersApi.send(confirmSend.id)
      toast('Bon de commande marqué comme envoyé.', 'success')
      setConfirmSend(null)
      refresh()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setActing(false)
    }
  }

  async function handleCancel() {
    if (!confirmCancel) return
    setActing(true)
    try {
      await supplierOrdersApi.cancel(confirmCancel.id)
      toast('Bon de commande annulé.', 'info')
      setConfirmCancel(null)
      refresh()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setActing(false)
    }
  }

  async function handleValidate() {
    if (!confirmValidate) return
    setActing(true)
    try {
      await supplierOrdersApi.validateProforma(confirmValidate.id)
      toast('Proforma validée.', 'success')
      setConfirmValidate(null)
      refresh()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setActing(false)
    }
  }

  async function handleRejectProforma() {
    if (!rejectModal || !rejectModal.reason.trim()) return
    setActing(true)
    try {
      await supplierOrdersApi.rejectProforma(rejectModal.order.id, { reason: rejectModal.reason.trim() })
      toast('Proforma rejetée — commande remise en brouillon.', 'info')
      setRejectModal(null)
      refresh()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur.', 'error')
    } finally {
      setActing(false)
    }
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
            onChange={e => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s ? STATUS_LABELS[s] : 'Tous les statuts'}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => navigate('/orders/suppliers/new')} icon={<Plus size={15} />}>
          Nouvelle commande
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={searchInputClass}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <DataTable
        rows={filtered}
        loading={loading}
        keyExtractor={r => r.id}
        emptyMessage="Aucun bon de commande fournisseur."
        columns={[
          {
            key: 'reference',
            header: 'Référence',
            width: 'w-36',
            render: r => (
              <span className="font-mono text-xs font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                {r.reference}
              </span>
            ),
          },
          {
            key: 'date',
            header: 'Date',
            width: 'w-28',
            render: r => new Date(r.orderDate).toLocaleDateString('fr-FR'),
          },
          {
            key: 'supplier',
            header: 'Fournisseur',
            render: r => <span className="font-medium text-gray-900">{r.supplierName}</span>,
          },
          {
            key: 'currency',
            header: 'Devise',
            width: 'w-20',
            render: r => (
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {r.currency}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Statut',
            width: 'w-40',
            render: r => (
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-50 text-gray-600'}`}
              >
                {STATUS_LABELS[r.status] ?? r.status}
              </span>
            ),
          },
          {
            key: 'lineCount',
            header: 'Nb lignes',
            width: 'w-24',
            render: r => (
              <span className="text-sm text-gray-600">{r.lineCount} produit{r.lineCount > 1 ? 's' : ''}</span>
            ),
          },
        ]}
        actions={row => (
          <div className="flex items-center gap-1">
            {/* Brouillon: edit + send */}
            {row.status === 'Brouillon' && (
              <>
                <button
                  title="Modifier"
                  onClick={() => navigate(`/orders/suppliers/${row.id}/edit`)}
                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  title="Marquer comme envoyée"
                  onClick={() => setConfirmSend(row)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Send size={14} />
                </button>
              </>
            )}

            {/* Envoyée ou ProformaReçue: saisir/modifier la proforma */}
            {(row.status === 'Envoyée' || row.status === 'ProformaReçue') && (
              <button
                title="Saisir / modifier la proforma reçue"
                onClick={() => navigate(`/orders/suppliers/${row.id}/receive-proforma`)}
                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <FileInput size={14} />
              </button>
            )}

            {/* ProformaReçue: valider ou rejeter */}
            {row.status === 'ProformaReçue' && (
              <>
                <button
                  title="Valider la proforma"
                  onClick={() => setConfirmValidate(row)}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <CheckCircle size={14} />
                </button>
                <button
                  title="Rejeter la proforma"
                  onClick={() => setRejectModal({ order: row, reason: '' })}
                  className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <AlertTriangle size={14} />
                </button>
              </>
            )}

            {/* ProformaValidée: saisir la facture fournisseur */}
            {row.status === 'ProformaValidée' && (
              <button
                title="Saisir la facture fournisseur"
                onClick={() => navigate(`/orders/suppliers/${row.id}/receive-invoice`)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <FileText size={14} />
              </button>
            )}

            {/* FactureReçue: réceptionner les marchandises */}
            {row.status === 'FactureReçue' && (
              <button
                title="Réceptionner les marchandises"
                onClick={() => navigate(`/orders/suppliers/${row.id}/receive-goods`)}
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <Package size={14} />
              </button>
            )}

            {/* Annuler: disponible tant que non terminal */}
            {!TERMINAL.has(row.status) && (
              <button
                title="Annuler"
                onClick={() => setConfirmCancel(row)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <XCircle size={14} />
              </button>
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
        isOpen={!!confirmSend}
        onClose={() => setConfirmSend(null)}
        onConfirm={handleSend}
        title="Marquer comme envoyée"
        message={`Marquer le bon de commande ${confirmSend?.reference} comme envoyé au fournisseur ?`}
        loading={acting}
        confirmLabel="Confirmer l'envoi"
        confirmVariant="primary"
      />

      <ConfirmDialog
        isOpen={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={handleCancel}
        title="Annuler le bon de commande"
        message={`Annuler le bon de commande ${confirmCancel?.reference} ?`}
        loading={acting}
        confirmLabel="Annuler la commande"
        confirmVariant="danger"
      />

      <ConfirmDialog
        isOpen={!!confirmValidate}
        onClose={() => setConfirmValidate(null)}
        onConfirm={handleValidate}
        title="Valider la proforma"
        message={`Valider la proforma de la commande ${confirmValidate?.reference} ? Cette action permet de passer à la réception de la facture fournisseur.`}
        loading={acting}
        confirmLabel="Valider la proforma"
        confirmVariant="primary"
      />

      <Modal
        isOpen={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Rejeter la proforma"
        size="md"
      >
        <p className="text-sm text-gray-600 mb-4">
          Indiquez la raison du rejet pour la proforma de la commande{' '}
          <strong>{rejectModal?.order.reference}</strong>.{' '}
          La commande sera remise en brouillon pour permettre une nouvelle négociation.
        </p>
        <textarea
          value={rejectModal?.reason ?? ''}
          onChange={e =>
            setRejectModal(prev => prev ? { ...prev, reason: e.target.value } : null)
          }
          rows={4}
          placeholder="Ex : Prix trop élevé, délai trop long, produits manquants…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none mb-6"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setRejectModal(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleRejectProforma}
            disabled={!rejectModal?.reason.trim() || acting}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
          >
            {acting && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Rejeter la proforma
          </button>
        </div>
      </Modal>
    </div>
  )
}
