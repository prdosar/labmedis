import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import type { CountryDto } from '../../api/types'
import { countriesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Textarea } from '../../components/ui/Input'

const searchInputClass = 'w-full rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export function CountriesPage() {
  const { toast } = useToast()
  const fetcher = useCallback((p: number, s: number) => countriesApi.getAll(p, s), [])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher, pageSize: 200 })
  const [search, setSearch] = useState('')
  const filtered = (data?.items ?? []).filter(r => r.name.toLowerCase().includes(search.toLowerCase()))

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CountryDto | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CountryDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() { setEditing(null); setForm({ name: '', description: '' }); setFormError(null); setModalOpen(true) }
  function openEdit(item: CountryDto) { setEditing(item); setForm({ name: item.name, description: item.description ?? '' }); setFormError(null); setModalOpen(true) }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Le nom est obligatoire.'); return }
    setSaving(true); setFormError(null)
    try {
      if (editing) {
        await countriesApi.update(editing.id, { name: form.name.trim(), description: form.description || null })
        toast('Pays mis à jour.')
      } else {
        await countriesApi.create({ name: form.name.trim(), description: form.description || null })
        toast('Pays créé.')
      }
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur.') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await countriesApi.delete(deleteTarget.id); toast('Pays supprimé.', 'info'); setDeleteTarget(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Suppression impossible.', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${search ? `${filtered.length} / ` : ''}${data.totalCount} pays` : ''}</p>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Ajouter</Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input type="text" placeholder="Rechercher un pays…" value={search} onChange={e => setSearch(e.target.value)} className={searchInputClass} />
        {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"><X size={13} /></button>}
      </div>

      <DataTable
        rows={filtered} loading={loading} keyExtractor={r => r.id}
        emptyMessage={search ? `Aucun résultat pour "${search}".` : 'Aucun pays pour l\'instant.'}
        columns={[
          { key: 'isoCode', header: 'Code', width: 'w-16', render: r => (
            <span className="font-mono text-xs font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{r.isoCode ?? '—'}</span>
          )},
          { key: 'name', header: 'Pays', render: r => <span className="font-medium text-gray-900">{r.name}</span> },
          { key: 'description', header: 'Description', render: r => <span className="text-gray-500 text-sm">{r.description ?? <span className="text-gray-300 italic">—</span>}</span> },
        ]}
        actions={row => (
          <>
            <button onClick={() => openEdit(row)} title="Modifier" className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={14} /></button>
            <button onClick={() => setDeleteTarget(row)} title="Supprimer" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
          </>
        )}
      />

      {data && !search && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Modifier — ${editing.name}` : 'Nouveau pays'} size="sm">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">Le code à 2 chiffres est attribué automatiquement.</p>
          <Input label="Nom *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom du pays" autoFocus />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description optionnelle…" rows={3} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Confirmer la suppression" message={`Supprimer "${deleteTarget?.name}" ?`} loading={deleting} />
    </div>
  )
}
