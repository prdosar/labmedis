import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import type { WarehouseDto } from '../../api/types'
import { warehousesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Textarea } from '../../components/ui/Input'

interface Form { code: string; name: string; address: string; city: string; notes: string }
const empty: Form = { code: '', name: '', address: '', city: '', notes: '' }

export function WarehousesPage() {
  const { toast } = useToast()
  const fetcher = useCallback((p: number, s: number) => warehousesApi.getAll(p, s), [])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WarehouseDto | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WarehouseDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true) }
  function openEdit(item: WarehouseDto) {
    setEditing(item)
    setForm({ code: item.code, name: item.name, address: item.address ?? '', city: item.city ?? '', notes: item.notes ?? '' })
    setFormError(null); setModalOpen(true)
  }

  const setF = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) { setFormError('Code et Nom sont obligatoires.'); return }
    setSaving(true); setFormError(null)
    try {
      const dto = { code: form.code.trim(), name: form.name.trim(), address: form.address || null, city: form.city || null, notes: form.notes || null }
      if (editing) { await warehousesApi.update(editing.id, dto); toast('Entrepôt mis à jour.') }
      else { await warehousesApi.create(dto); toast('Entrepôt créé.') }
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur.') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await warehousesApi.delete(deleteTarget.id); toast('Entrepôt supprimé.', 'info'); setDeleteTarget(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Suppression impossible.', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${data.totalCount} entrepôts` : ''}</p>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Ajouter</Button>
      </div>
      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucun entrepôt."
        columns={[
          { key: 'code', header: 'Code', width: 'w-24', render: r => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.code}</span> },
          { key: 'name', header: 'Nom', render: r => <span className="font-medium text-gray-900">{r.name}</span> },
          { key: 'city', header: 'Ville', render: r => r.city ?? <span className="text-gray-300">—</span> },
          { key: 'address', header: 'Adresse', render: r => <span className="text-gray-500 text-sm truncate max-w-xs block">{r.address ?? '—'}</span> },
        ]}
        actions={row => (<>
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
          <button onClick={async () => { await warehousesApi.restore(row.id); toast('Restauré.'); refresh() }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><RotateCcw size={14} /></button>
        </>)}
      />
      {data && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Modifier — ${editing.name}` : 'Nouvel entrepôt'} size="md">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code *" value={form.code} onChange={setF('code')} placeholder="EX: LMD-001" />
            <Input label="Nom *" value={form.name} onChange={setF('name')} placeholder="Nom de l'entrepôt" />
          </div>
          <Input label="Ville" value={form.city} onChange={setF('city')} placeholder="Lomé" />
          <Input label="Adresse" value={form.address} onChange={setF('address')} placeholder="Quartier, rue…" />
          <Textarea label="Notes" value={form.notes} onChange={setF('notes')} rows={2} placeholder="Remarques…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Supprimer l'entrepôt" message={`Supprimer "${deleteTarget?.name}" ?`} loading={deleting} />
    </div>
  )
}
