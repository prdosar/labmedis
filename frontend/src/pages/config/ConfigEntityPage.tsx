import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import type { PagedResult, SimpleEntity } from '../../api/types'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Textarea } from '../../components/ui/Input'

interface EntityApi<T extends SimpleEntity> {
  getAll: (page: number, size: number) => Promise<PagedResult<T>>
  create: (dto: { name: string; description?: string | null }) => Promise<T>
  update: (id: number, dto: { name: string; description?: string | null }) => Promise<T>
  delete: (id: number) => Promise<void>
  restore: (id: number) => Promise<void>
}

interface Props<T extends SimpleEntity> {
  entityApi: EntityApi<T>
  entityName: string
  entityNamePlural: string
}

interface FormState {
  name: string
  description: string
}

const searchInputClass = 'w-full rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export function ConfigEntityPage<T extends SimpleEntity>({ entityApi, entityName, entityNamePlural }: Props<T>) {
  const { toast } = useToast()
  const fetcher = useCallback((p: number, s: number) => entityApi.getAll(p, s), [entityApi])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher, pageSize: 200 })

  const [search, setSearch] = useState('')

  const filtered = (data?.items ?? []).filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '' })
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(item: T) {
    setEditing(item)
    setForm({ name: item.name, description: item.description ?? '' })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Le nom est obligatoire.'); return }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await entityApi.update(editing.id, { name: form.name.trim(), description: form.description || null })
        toast(`${entityName} mis à jour.`)
      } else {
        await entityApi.create({ name: form.name.trim(), description: form.description || null })
        toast(`${entityName} créé.`)
      }
      setModalOpen(false)
      refresh()
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await entityApi.delete(deleteTarget.id)
      toast(`${entityName} supprimé.`, 'info')
      setDeleteTarget(null)
      refresh()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Suppression impossible.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {data ? `${search ? `${filtered.length} / ` : ''}${data.totalCount} ${entityNamePlural.toLowerCase()}` : ''}
        </p>
        <Button onClick={openCreate} icon={<Plus size={15} />}>
          Ajouter
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={`Rechercher un(e) ${entityName.toLowerCase()}…`}
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

      {/* Table */}
      <DataTable
        rows={filtered}
        loading={loading}
        keyExtractor={r => r.id}
        emptyMessage={search ? `Aucun résultat pour "${search}".` : `Aucun(e) ${entityName.toLowerCase()} pour l'instant.`}
        columns={[
          { key: 'id', header: '#', width: 'w-14', render: r => <span className="text-gray-400 text-xs">#{r.id}</span> },
          { key: 'name', header: 'Nom', render: r => <span className="font-medium text-gray-900">{r.name}</span> },
          {
            key: 'description', header: 'Description',
            render: r => <span className="text-gray-500 text-sm">{r.description ?? <span className="text-gray-300 italic">—</span>}</span>
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

      {/* Pagination — hidden when search active */}
      {data && !search && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          onPageChange={setPage}
        />
      )}

      {/* Create/Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Modifier — ${editing.name}` : `Nouveau(elle) ${entityName}`}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          {formError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}
          <Input
            label="Nom *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={`Nom de ${entityName.toLowerCase()}`}
            autoFocus
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description optionnelle…"
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirmer la suppression"
        message={`Supprimer "${deleteTarget?.name}" ? Cette action est réversible via la restauration.`}
        loading={deleting}
      />
    </div>
  )
}
