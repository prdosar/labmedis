import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Filter, Trash2, ArrowLeftRight, PackageMinus, Package } from 'lucide-react'
import {
  notificationsApi,
  stockMovementsApi,
  suppliersApi,
  warehousesApi,
} from '../../api/endpoints'
import type {
  ExpiringProductRowDto,
  SupplierDto,
  WarehouseDto,
} from '../../api/types'
import { ApiError } from '../../api/client'
import { Badge } from '../../components/ui/Badge'
import type { BadgeVariant } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ComboSelect, Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'

const PAGE_SIZE = 25

const WINDOW_OPTIONS = [
  { value: 1, label: '< 1 mois' },
  { value: 3, label: '< 3 mois' },
  { value: 6, label: '< 6 mois (défaut)' },
  { value: 12, label: '< 12 mois' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysBadge(days: number): { label: string; variant: BadgeVariant } {
  if (days < 0) return { label: `Périmé (${Math.abs(days)} j)`, variant: 'red' }
  if (days === 0) return { label: 'Périme aujourd\'hui', variant: 'red' }
  if (days <= 30) return { label: `${days} j`, variant: 'red' }
  if (days <= 90) return { label: `${days} j`, variant: 'orange' }
  if (days <= 180) return { label: `${days} j`, variant: 'yellow' }
  return { label: `${days} j`, variant: 'blue' }
}

// ─── Modal « Retirer du stock » ─────────────────────────────────────────────

type RemoveMode = 'choice' | 'loss'

function RemoveStockModal({
  isOpen,
  onClose,
  onSuccess,
  row,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  row: ExpiringProductRowDto | null
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [mode, setMode] = useState<RemoveMode>('choice')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('Péremption')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && row) {
      setMode('choice')
      setQuantity(String(row.quantityRemaining))
      setReason('Péremption')
      setNotes('')
    }
  }, [isOpen, row])

  if (!row) return null

  const qtyNum = Number(quantity) || 0
  const invalidQty = qtyNum <= 0 || qtyNum > row.quantityRemaining

  async function submitLoss() {
    if (invalidQty || !row) return
    setSaving(true)
    try {
      await stockMovementsApi.createDiverseExit({
        productId: row.productId,
        warehouseId: row.warehouseId ?? 0,
        purchaseLineId: row.purchaseLineId,
        quantity: qtyNum,
        reason: reason.trim() || 'Péremption',
        notes: notes.trim() || null,
        exitDate: new Date().toISOString().slice(0, 10),
      })
      toast('Sortie enregistrée.', 'success')
      onSuccess()
      onClose()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur inattendue.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function goToSupplierReturn() {
    const params = new URLSearchParams({
      prefillProductId: String(row!.productId),
      prefillPurchaseLineId: String(row!.purchaseLineId),
      prefillLot: row!.lotNumber,
      prefillQuantity: String(qtyNum || row!.quantityRemaining),
      prefillReason: 'Péremption',
    })
    if (row!.warehouseId) params.set('prefillWarehouseId', String(row!.warehouseId))
    if (row!.supplierId) params.set('prefillSupplierId', String(row!.supplierId))
    navigate(`/stock/supplier-returns?${params}`)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Retirer du stock" size="lg">
      <div className="flex flex-col gap-4">
        {/* Résumé du lot */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm border border-gray-200">
          <div className="font-semibold text-gray-900">{row.productDesignation}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Lot <span className="font-mono">{row.lotNumber}</span> · Péremption {fmtDate(row.expirationDate)} · Stock : <span className="font-semibold">{row.quantityRemaining}</span> unité(s)
          </div>
        </div>

        {mode === 'choice' && (
          <>
            <p className="text-sm text-gray-600">Comment souhaitez-vous retirer ce lot du stock ?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('loss')}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 text-red-600">
                  <Trash2 size={18} />
                  <span className="font-semibold text-sm">Perte</span>
                </div>
                <p className="text-xs text-gray-600">
                  Enregistrer une sortie diverse (produit détruit / jeté). Aucun retour financier.
                </p>
              </button>
              <button
                onClick={goToSupplierReturn}
                disabled={!row.supplierId}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent transition-colors text-left"
              >
                <div className="flex items-center gap-2 text-orange-600">
                  <ArrowLeftRight size={18} />
                  <span className="font-semibold text-sm">Retour fournisseur</span>
                </div>
                <p className="text-xs text-gray-600">
                  Ouvre le formulaire de retour fournisseur pré-rempli avec ce produit et lot.
                </p>
                {!row.supplierId && (
                  <span className="text-[10px] text-red-500 font-medium">Aucun fournisseur associé</span>
                )}
              </button>
            </div>
          </>
        )}

        {mode === 'loss' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantité à sortir *"
                type="number"
                min={1}
                max={row.quantityRemaining}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                error={invalidQty ? `1 → ${row.quantityRemaining}` : undefined}
              />
              <Input
                label="Motif *"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Péremption"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Observations facultatives…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                onClick={() => setMode('choice')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Choisir un autre type
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>Annuler</Button>
                <Button onClick={submitLoss} loading={saving} disabled={invalidQty}>
                  Valider la sortie
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ExpiringProductsPage() {
  const [rows, setRows] = useState<ExpiringProductRowDto[]>([])
  const [total, setTotal] = useState(0)
  const [windowMonths, setWindowMonths] = useState(6)
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([])

  const [removeTarget, setRemoveTarget] = useState<ExpiringProductRowDto | null>(null)

  useEffect(() => {
    Promise.all([suppliersApi.getForSelect(), warehousesApi.getForSelect()])
      .then(([s, w]) => { setSuppliers(s); setWarehouses(w) })
  }, [])

  function load() {
    setLoading(true)
    notificationsApi.getExpiringProducts({
      windowMonths,
      supplierId: supplierId ? Number(supplierId) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      page,
      size: PAGE_SIZE,
    })
      .then(r => { setRows(r.items); setTotal(r.totalCount) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [windowMonths, supplierId, warehouseId, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const supplierOptions = useMemo(
    () => [{ value: '', label: 'Tous fournisseurs' }, ...suppliers.map(s => ({ value: String(s.id), label: `${s.code} – ${s.name}` }))],
    [suppliers],
  )
  const warehouseOptions = useMemo(
    () => [{ value: '', label: 'Tous magasins' }, ...warehouses.map(w => ({ value: String(w.id), label: w.name }))],
    [warehouses],
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Produits proches péremption</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total} lot{total > 1 ? 's' : ''} — fenêtre : {WINDOW_OPTIONS.find(w => w.value === windowMonths)?.label ?? `${windowMonths} mois`}
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
        <div className="w-48">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Fenêtre</label>
          <select
            value={windowMonths}
            onChange={e => { setWindowMonths(Number(e.target.value)); setPage(1) }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {WINDOW_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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
          <label className="text-xs font-medium text-gray-600 mb-1 block">Magasin</label>
          <ComboSelect
            value={warehouseId}
            onChange={v => { setWarehouseId(v); setPage(1) }}
            options={warehouseOptions}
            placeholder="Tous magasins"
          />
        </div>
        {(supplierId || warehouseId || windowMonths !== 6) && (
          <button
            onClick={() => { setSupplierId(''); setWarehouseId(''); setWindowMonths(6); setPage(1) }}
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
            <span>Aucun lot proche péremption dans cette fenêtre.</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Désignation</th>
                <th className="px-4 py-3 text-left">Lot</th>
                <th className="px-4 py-3 text-left">Péremption</th>
                <th className="px-4 py-3 text-center">Restant</th>
                <th className="px-4 py-3 text-right">Qté</th>
                <th className="px-4 py-3 text-left">Fournisseur</th>
                <th className="px-4 py-3 text-left">Magasin</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => {
                const db = daysBadge(r.daysRemaining)
                return (
                  <tr key={r.purchaseLineId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.productCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 max-w-xs truncate">{r.productDesignation}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.lotNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{fmtDate(r.expirationDate)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={db.variant}>{db.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{r.quantityRemaining}</td>
                    <td className="px-4 py-3 text-gray-600">{r.supplierName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.warehouseName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setRemoveTarget(r)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                          title="Retirer ce lot du stock"
                        >
                          <PackageMinus size={13} />
                          Retirer du stock
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

      <RemoveStockModal
        isOpen={!!removeTarget}
        row={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onSuccess={load}
      />
    </div>
  )
}
