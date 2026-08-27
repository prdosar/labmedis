import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import type { UserDto } from '../../api/types'
import { usersApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'

interface CreateForm { userName: string; email: string; password: string; fullName: string; roles: string }
interface EditForm { email: string; fullName: string; isActive: boolean; roles: string }

const AVAILABLE_ROLES = ['Admin', 'Gestionnaire', 'Commercial', 'Technicien', 'Caissier']

const searchInputClass = 'rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export function UsersPage() {
  const { toast } = useToast()
  const fetcher = useCallback((p: number, s: number) => usersApi.getAll(p, s), [])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher, pageSize: 100 })
  const [search, setSearch] = useState('')
  const filtered = (data?.items ?? []).filter(r =>
    r.userName.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    (r.fullName ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserDto | null>(null)
  const [createForm, setCreateForm] = useState<CreateForm>({ userName: '', email: '', password: '', fullName: '', roles: '' })
  const [editForm, setEditForm] = useState<EditForm>({ email: '', fullName: '', isActive: true, roles: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openEdit(u: UserDto) {
    setEditTarget(u)
    setEditForm({ email: u.email, fullName: u.fullName ?? '', isActive: u.isActive, roles: u.roles.join(', ') })
    setFormError(null)
  }

  async function handleCreate() {
    if (!createForm.userName.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setFormError('Identifiant, email et mot de passe sont obligatoires.'); return
    }
    setSaving(true); setFormError(null)
    try {
      const roles = createForm.roles.split(',').map(r => r.trim()).filter(Boolean)
      await usersApi.create({ userName: createForm.userName.trim(), email: createForm.email.trim(), password: createForm.password, fullName: createForm.fullName || null, roles })
      toast('Utilisateur créé.')
      setCreateOpen(false)
      setCreateForm({ userName: '', email: '', password: '', fullName: '', roles: '' })
      refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur.') }
    finally { setSaving(false) }
  }

  async function handleUpdate() {
    if (!editTarget || !editForm.email.trim()) { setFormError('Email obligatoire.'); return }
    setSaving(true); setFormError(null)
    try {
      const roles = editForm.roles.split(',').map(r => r.trim()).filter(Boolean)
      await usersApi.update(editTarget.id, { email: editForm.email.trim(), fullName: editForm.fullName || null, isActive: editForm.isActive, roles })
      toast('Utilisateur mis à jour.')
      setEditTarget(null); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur.') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await usersApi.delete(deleteTarget.id); toast('Utilisateur supprimé.', 'info'); setDeleteTarget(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Impossible.', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${search ? `${filtered.length} / ` : ''}${data.totalCount} utilisateur(s)` : ''}</p>
        <Button onClick={() => { setFormError(null); setCreateOpen(true) }} icon={<Plus size={15} />}>Ajouter</Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input type="text" placeholder="Rechercher un utilisateur…" value={search} onChange={e => setSearch(e.target.value)} className={searchInputClass} />
        {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"><X size={13} /></button>}
      </div>

      <DataTable
        rows={filtered} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucun utilisateur."
        columns={[
          { key: 'userName', header: 'Identifiant', render: r => (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                {(r.fullName ?? r.userName).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{r.fullName ?? r.userName}</p>
                <p className="text-xs text-gray-400">@{r.userName}</p>
              </div>
            </div>
          )},
          { key: 'email', header: 'Email', render: r => <span className="text-sm text-gray-600">{r.email}</span> },
          { key: 'roles', header: 'Rôles', render: r => (
            <div className="flex flex-wrap gap-1">
              {r.roles.length > 0 ? r.roles.map(role => (
                <Badge key={role} variant="blue">{role}</Badge>
              )) : <span className="text-gray-300 text-xs">Aucun rôle</span>}
            </div>
          )},
          { key: 'isActive', header: 'Statut', width: 'w-20', render: r => (
            <Badge variant={r.isActive ? 'green' : 'gray'}>{r.isActive ? 'Actif' : 'Inactif'}</Badge>
          )},
        ]}
        actions={row => (<>
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </>)}
      />
      {data && !search && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}

      {/* Create */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel utilisateur" size="sm">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Identifiant *" value={createForm.userName} onChange={e => setCreateForm(f => ({ ...f, userName: e.target.value }))} placeholder="admin" />
            <Input label="Nom complet" value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))} />
          </div>
          <Input label="Email *" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Mot de passe *" type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 8 caractères" />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rôles (séparés par virgule)</label>
            <p className="text-xs text-gray-400 mb-2">Disponibles : {AVAILABLE_ROLES.join(', ')}</p>
            <Input value={createForm.roles} onChange={e => setCreateForm(f => ({ ...f, roles: e.target.value }))} placeholder="Admin, Gestionnaire" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} loading={saving}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* Edit */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Modifier — ${editTarget?.userName}`} size="sm">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <Input label="Email *" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Nom complet" value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Statut</label>
            <select value={editForm.isActive ? '1' : '0'} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.value === '1' }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="1">Actif</option>
              <option value="0">Inactif</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rôles (séparés par virgule)</label>
            <Input value={editForm.roles} onChange={e => setEditForm(f => ({ ...f, roles: e.target.value }))} placeholder="Admin, Gestionnaire" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Annuler</Button>
            <Button onClick={handleUpdate} loading={saving}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Supprimer l'utilisateur" message={`Supprimer "@${deleteTarget?.userName}" ?`} loading={deleting} />
    </div>
  )
}
