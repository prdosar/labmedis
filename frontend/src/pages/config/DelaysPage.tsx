import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Truck, CreditCard } from 'lucide-react'
import type { DelayDto } from '../../api/types'
import { deliveryDelaysApi, paymentDelaysApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'

type DelayKind = 'delivery' | 'payment'

const KIND_META: Record<DelayKind, { label: string; api: typeof deliveryDelaysApi; icon: typeof Truck }> = {
  delivery: { label: 'livraison', api: deliveryDelaysApi, icon: Truck },
  payment: { label: 'paiement', api: paymentDelaysApi, icon: CreditCard },
}

interface FormState { label: string; sortOrder: string; isActive: boolean }

function DelaysList({ kind }: { kind: DelayKind }) {
  const { toast } = useToast()
  const meta = KIND_META[kind]
  const Icon = meta.icon
  const [items, setItems] = useState<DelayDto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DelayDto | null>(null)
  const [form, setForm] = useState<FormState>({ label: '', sortOrder: '0', isActive: true })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DelayDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    meta.api.getAll().then(setItems).finally(() => setLoading(false))
  }

  useEffect(load, [kind])

  function openCreate() {
    setEditing(null)
    setForm({ label: '', sortOrder: String(items.length), isActive: true })
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(d: DelayDto) {
    setEditing(d)
    setForm({ label: d.label, sortOrder: String(d.sortOrder), isActive: d.isActive })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.label.trim()) { setFormError('Le libellé est obligatoire.'); return }
    setSaving(true)
    setFormError(null)
    try {
      const dto = { label: form.label.trim(), sortOrder: parseInt(form.sortOrder) || 0, isActive: form.isActive }
      if (editing) {
        await meta.api.update(editing.id, dto)
        toast(`Délai de ${meta.label} mis à jour.`)
      } else {
        await meta.api.create(dto)
        toast(`Délai de ${meta.label} créé.`)
      }
      setModalOpen(false)
      load()
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erreur.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await meta.api.delete(deleteTarget.id)
      toast(`Délai de ${meta.label} supprimé.`, 'info')
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Suppression impossible.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700">
          <Icon size={18} className="text-brand-600" />
          <h2 className="text-base font-semibold">Délais de {meta.label}</h2>
          <span className="text-sm text-gray-400">({items.length})</span>
        </div>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Ajouter</Button>
      </div>

      <DataTable
        rows={items}
        loading={loading}
        keyExtractor={r => r.id}
        emptyMessage={`Aucun délai de ${meta.label} pour l'instant.`}
        columns={[
          { key: 'sortOrder', header: '#', width: 'w-14', render: r => <span className="text-gray-400 text-xs">{r.sortOrder}</span> },
          { key: 'label', header: 'Libellé', render: r => <span className="font-medium text-gray-900">{r.label}</span> },
          {
            key: 'isActive', header: 'État', width: 'w-24', render: r => r.isActive
              ? <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Actif</span>
              : <span className="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">Inactif</span>,
          },
        ]}
        actions={row => (
          <>
            <button onClick={() => openEdit(row)} title="Modifier"
              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => setDeleteTarget(row)} title="Supprimer"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
          </>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? `Modifier — ${editing.label}` : `Nouveau délai de ${meta.label}`}
        size="sm">
        <div className="flex flex-col gap-4">
          {formError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>
          )}
          <Input label="Libellé *" value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder={kind === 'delivery' ? 'Ex: 24 heures, 48 heures…' : 'Ex: Comptant, 30 jours date facture…'}
            autoFocus />
          <Input label="Ordre d'affichage" type="number" value={form.sortOrder}
            onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            Actif (visible dans les dropdowns de commande)
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirmer la suppression"
        message={`Supprimer le délai "${deleteTarget?.label}" ? Impossible si utilisé par des commandes.`}
        loading={deleting} />
    </div>
  )
}

export function DelaysPage() {
  const [tab, setTab] = useState<DelayKind>('delivery')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('delivery')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'delivery' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Délais de livraison
        </button>
        <button onClick={() => setTab('payment')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'payment' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Délais de paiement
        </button>
      </div>

      <DelaysList kind={tab} />
    </div>
  )
}
