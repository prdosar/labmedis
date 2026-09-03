import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye } from 'lucide-react'
import { customerCreditNotesApi } from '../../api/endpoints'
import type { CustomerCreditNoteDto } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { BadgeVariant } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'

const STATUS_LABELS: Record<string, string> = {
  EnAttente: 'En attente',
  DéduitDeFacture: 'Déduit facture',
  Remboursé: 'Remboursé',
  Annulé: 'Annulé',
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  EnAttente: 'yellow',
  DéduitDeFacture: 'green',
  Remboursé: 'green',
  Annulé: 'red',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR')
}

function fmtXof(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(n)
}

const PAGE_SIZE = 20

export function CustomerReturnsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CustomerCreditNoteDto[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    customerCreditNotesApi
      .getAll({ page, size: PAGE_SIZE })
      .then(r => {
        setItems(r.items)
        setTotal(r.totalCount)
      })
      .finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Retours clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} avoir{total !== 1 ? 's' : ''} client
          </p>
        </div>
        <Button
          onClick={() => navigate('/invoices/customers/credit-notes/new')}
          icon={<Plus size={16} />}
        >
          Nouveau retour
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12 text-sm text-gray-400">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400 gap-2">
            <span>Aucun retour client enregistré</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/invoices/customers/credit-notes/new')}
              icon={<Plus size={14} />}
            >
              Créer un retour
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Référence avoir</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Facture d'origine</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Montant TTC</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {item.reference}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.customerName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.invoiceReference ?? <span className="italic text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(item.creditNoteDate)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {fmtXof(item.totalAmountTtc)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANT[item.status] ?? 'gray'}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => navigate(`/invoices/customers/credit-notes/${item.id}`)}
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <Eye size={14} />
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
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
