import { useEffect, useState } from 'react'
import { Plus, Eye, X } from 'lucide-react'
import { supplierReturnsApi, suppliersApi, productsApi, warehousesApi } from '../../api/endpoints'
import type { SupplierReturnDto, SupplierDto, ProductDto, WarehouseDto } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { BadgeVariant } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReturnLine {
  _id: number
  productId: string
  productCode: string
  productDesignation: string
  purchaseLineId: string
  lotNumber: string
  warehouseId: string
  warehouseName: string
  quantityReturned: string
  unitCostForeign: string
  unitCostXof: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  EnCours: 'En cours',
  Envoyé: 'Envoyé',
  CreditNoteReçue: 'Avoir reçu',
  Résolu: 'Résolu',
  Annulé: 'Annulé',
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  EnCours: 'yellow',
  Envoyé: 'blue',
  CreditNoteReçue: 'orange',
  Résolu: 'green',
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

function today() {
  return new Date().toISOString().slice(0, 10)
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white'

let lineCounter = 0

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export function SupplierReturnsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<SupplierReturnDto[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState<SupplierReturnDto | null>(null)

  // Form state
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([])
  const [products, setProducts] = useState<ProductDto[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [purchaseId, setPurchaseId] = useState('')
  const [returnDate, setReturnDate] = useState(today())
  const [currency, setCurrency] = useState('EUR')
  const [exchangeRate, setExchangeRate] = useState('655.957')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [createCreditNote, setCreateCreditNote] = useState(true)
  const [lines, setLines] = useState<ReturnLine[]>([])
  const [saving, setSaving] = useState(false)

  // Load list
  const loadItems = () => {
    setLoading(true)
    supplierReturnsApi
      .getAll({ page, size: PAGE_SIZE })
      .then(r => {
        setItems(r.items)
        setTotal(r.totalCount)
      })
      .finally(() => setLoading(false))
  }

  useEffect(loadItems, [page])

  // Load form data
  useEffect(() => {
    if (!showForm) return
    Promise.all([
      suppliersApi.getForSelect(),
      warehousesApi.getForSelect(),
      productsApi.getForSelect(),
    ]).then(([s, w, p]) => {
      setSuppliers(s)
      setWarehouses(w)
      setProducts(p)
    })
  }, [showForm])

  const openForm = () => {
    setSupplierId('')
    setPurchaseId('')
    setReturnDate(today())
    setCurrency('EUR')
    setExchangeRate('655.957')
    setReason('')
    setNotes('')
    setCreateCreditNote(true)
    setLines([addEmptyLine()])
    setShowForm(true)
    setDetail(null)
  }

  function addEmptyLine(): ReturnLine {
    return {
      _id: ++lineCounter,
      productId: '',
      productCode: '',
      productDesignation: '',
      purchaseLineId: '',
      lotNumber: '',
      warehouseId: '',
      warehouseName: '',
      quantityReturned: '',
      unitCostForeign: '0',
      unitCostXof: '0',
    }
  }

  function updateLine(id: number, patch: Partial<ReturnLine>) {
    setLines(prev => prev.map(l => (l._id === id ? { ...l, ...patch } : l)))
  }

  function removeLine(id: number) {
    setLines(prev => prev.filter(l => l._id !== id))
  }

  const handleProductChange = (lineId: number, productId: string) => {
    const product = products.find(p => p.id === Number(productId))
    updateLine(lineId, {
      productId,
      productCode: product?.code ?? '',
      productDesignation: product?.designation ?? '',
    })
  }

  const handleWarehouseChange = (lineId: number, warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === Number(warehouseId))
    updateLine(lineId, {
      warehouseId,
      warehouseName: warehouse?.name ?? '',
    })
  }

  const handleSubmit = async () => {
    if (!supplierId) return toast('Veuillez sélectionner un fournisseur.', 'error')
    if (lines.length === 0) return toast('Ajoutez au moins une ligne.', 'error')
    for (const l of lines) {
      if (!l.productId) return toast('Sélectionnez un produit pour chaque ligne.', 'error')
      if (!l.warehouseId) return toast('Sélectionnez un entrepôt pour chaque ligne.', 'error')
      if (!l.quantityReturned || Number(l.quantityReturned) <= 0)
        return toast('Quantité retournée invalide.', 'error')
    }

    setSaving(true)
    try {
      await supplierReturnsApi.create({
        supplierId: Number(supplierId),
        purchaseId: purchaseId ? Number(purchaseId) : null,
        returnDate,
        currency,
        exchangeRateToXof: Number(exchangeRate),
        reason: reason || null,
        notes: notes || null,
        createCreditNote,
        lines: lines.map(l => ({
          productId: Number(l.productId),
          purchaseLineId: l.purchaseLineId ? Number(l.purchaseLineId) : null,
          warehouseId: Number(l.warehouseId),
          quantityReturned: Number(l.quantityReturned),
          lotNumber: l.lotNumber || null,
          unitCostForeign: Number(l.unitCostForeign),
          unitCostXof: Number(l.unitCostXof),
        })),
      })
      toast('Retour fournisseur créé avec succès.', 'success')
      setShowForm(false)
      loadItems()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erreur inattendue.'
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ─── Render ────────────────────────────────────────────────────────────────

  if (detail) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDetail(null)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Retours fournisseurs
          </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold font-mono">{detail.reference}</h1>
              <p className="text-sm text-gray-500">{detail.supplierName} · {fmtDate(detail.returnDate)}</p>
            </div>
            <Badge variant={STATUS_VARIANT[detail.status] ?? 'gray'}>
              {STATUS_LABELS[detail.status] ?? detail.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Motif :</span> <span className="text-gray-900">{detail.reason ?? '—'}</span></div>
            <div><span className="text-gray-500">Avoir fournisseur :</span> <span className="font-mono text-gray-900">{detail.supplierCreditNoteReference ?? '—'}</span></div>
            <div><span className="text-gray-500">Montant ({detail.currency}) :</span> <span className="font-medium">{detail.totalAmountForeign.toFixed(2)}</span></div>
            <div><span className="text-gray-500">Montant XOF :</span> <span className="font-medium">{fmtXof(detail.totalAmountXof)}</span></div>
          </div>
          <table className="w-full text-sm mt-4">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Produit</th>
                <th className="px-3 py-2 text-left">Lot</th>
                <th className="px-3 py-2 text-left">Entrepôt</th>
                <th className="px-3 py-2 text-right">Qté retournée</th>
                <th className="px-3 py-2 text-right">Total XOF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detail.lines.map(l => (
                <tr key={l.id}>
                  <td className="px-3 py-2">{l.productCode} — {l.productDesignation}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.lotNumber ?? '—'}</td>
                  <td className="px-3 py-2">{l.warehouseName}</td>
                  <td className="px-3 py-2 text-right">{l.quantityReturned}</td>
                  <td className="px-3 py-2 text-right">{fmtXof(l.lineTotalXof)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Retours fournisseurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} retour{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openForm} icon={<Plus size={16} />}>
          Nouveau retour
        </Button>
      </div>

      {/* ─── Form ───────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Nouveau retour fournisseur</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {/* Entête */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fournisseur *</label>
              <select className={inputCls} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Sélectionner…</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date du retour *</label>
              <input type="date" className={inputCls} value={returnDate} onChange={e => setReturnDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Devise</label>
              <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="XOF">XOF</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Taux de change → XOF</label>
              <Input type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} step="0.001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motif du retour</label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: produits défectueux, périmés…" />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={createCreditNote}
                  onChange={e => setCreateCreditNote(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600"
                />
                Générer un avoir fournisseur (SYSCOHADA)
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              className={inputCls}
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes internes…"
            />
          </div>

          {/* Lignes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Produits retournés</h3>
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setLines(prev => [...prev, addEmptyLine()])}
              >
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map(line => (
                <div key={line._id} className="grid grid-cols-6 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Produit *</label>
                    <select
                      className={inputCls}
                      value={line.productId}
                      onChange={e => handleProductChange(line._id, e.target.value)}
                    >
                      <option value="">Sélectionner…</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.code} — {p.designation}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Entrepôt *</label>
                    <select
                      className={inputCls}
                      value={line.warehouseId}
                      onChange={e => handleWarehouseChange(line._id, e.target.value)}
                    >
                      <option value="">Sélectionner…</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Lot</label>
                    <Input
                      value={line.lotNumber}
                      onChange={e => updateLine(line._id, { lotNumber: e.target.value })}
                      placeholder="Num. lot"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Qté retournée *</label>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantityReturned}
                      onChange={e => updateLine(line._id, { quantityReturned: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">PA unitaire ({currency})</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.0001"
                        value={line.unitCostForeign}
                        onChange={e => {
                          const foreign = Number(e.target.value)
                          const xof = Math.round(foreign * Number(exchangeRate) * 10000) / 10000
                          updateLine(line._id, {
                            unitCostForeign: e.target.value,
                            unitCostXof: String(xof),
                          })
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removeLine(line._id)}
                      className="mt-5 text-red-400 hover:text-red-600 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Valider le retour'}
            </Button>
          </div>
        </div>
      )}

      {/* ─── List ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12 text-sm text-gray-400">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400 gap-2">
            <span>Aucun retour fournisseur enregistré</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Référence</th>
                <th className="px-4 py-3 text-left">Fournisseur</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Motif</th>
                <th className="px-4 py-3 text-right">Total XOF</th>
                <th className="px-4 py-3 text-center">Avoir</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{item.reference}</td>
                  <td className="px-4 py-3 text-gray-700">{item.supplierName}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(item.returnDate)}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{item.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtXof(item.totalAmountXof)}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-gray-600">
                    {item.supplierCreditNoteReference ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANT[item.status] ?? 'gray'}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setDetail(item)}
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
