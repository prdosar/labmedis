import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import type { TherapeuticClassDto, CategoryDto } from '../../api/types'
import { therapeuticClassesApi, categoriesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Textarea, Select } from '../../components/ui/Input'

interface Form { categoryId: string; name: string; description: string }
const empty: Form = { categoryId: '', name: '', description: '' }

export function TherapeuticClassesPage() {
  const { toast } = useToast()
  const fetcher = useCallback((p: number, s: number) => therapeuticClassesApi.getAll(p, s), [])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher })
  const [categories, setCategories] = useState<CategoryDto[]>([])

  useEffect(() => { categoriesApi.getForSelect().then(setCategories).catch(() => {}) }, [])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TherapeuticClassDto | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TherapeuticClassDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true) }
  function openEdit(item: TherapeuticClassDto) {
    setEditing(item)
    setForm({ categoryId: String(item.categoryId), name: item.name, description: item.description ?? '' })
    setFormError(null); setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.categoryId) { setFormError('Catégorie et nom sont obligatoires.'); return }
    setSaving(true); setFormError(null)
    try {
      const dto = { categoryId: Number(form.categoryId), name: form.name.trim(), description: form.description || null }
      if (editing) { await therapeuticClassesApi.update(editing.id, dto); toast('Classe thérapeutique mise à jour.') }
      else { await therapeuticClassesApi.create(dto); toast('Classe thérapeutique créée.') }
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur.') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await therapeuticClassesApi.delete(deleteTarget.id); toast('Supprimé.', 'info'); setDeleteTarget(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Impossible.', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${data.totalCount} classe(s) thérapeutique(s)` : ''}</p>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Ajouter</Button>
      </div>
      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucune classe thérapeutique."
        columns={[
          { key: 'id', header: '#', width: 'w-14', render: r => <span className="text-gray-400 text-xs">#{r.id}</span> },
          { key: 'categoryName', header: 'Catégorie', render: r => (
            <span className="inline-flex items-center px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">{r.categoryName}</span>
          )},
          { key: 'name', header: 'Classe', render: r => <span className="font-medium text-gray-900">{r.name}</span> },
          { key: 'description', header: 'Description', render: r => <span className="text-gray-500 text-sm">{r.description ?? '—'}</span> },
        ]}
        actions={row => (<>
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
          <button onClick={async () => { await therapeuticClassesApi.restore(row.id); toast('Restauré.'); refresh() }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><RotateCcw size={14} /></button>
        </>)}
      />
      {data && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Modifier — ${editing.name}` : 'Nouvelle classe thérapeutique'} size="sm">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <Select label="Catégorie *" value={form.categoryId} onChange={v => setForm(f => ({ ...f, categoryId: v }))}
            options={categories.map(c => ({ value: c.id, label: c.name }))} placeholder="Sélectionner une catégorie" required />
          <Input label="Nom *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom de la classe" autoFocus />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Supprimer" message={`Supprimer "${deleteTarget?.name}" ?`} loading={deleting} />
    </div>
  )
}
