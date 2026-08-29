import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, RotateCcw, Mail, Phone, Search, X, Eye } from 'lucide-react'
import type { SupplierDto, CountryDto } from '../../api/types'
import { suppliersApi, countriesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'

interface Form {
  name: string; address: string | null; postalBox: string | null
  phone: string | null; email: string | null; countryId: string; contactPerson: string | null
}

const empty: Form = { name: '', address: null, postalBox: null, phone: null, email: null, countryId: '', contactPerson: null }

function toForm(s: SupplierDto): Form {
  return {
    name: s.name, address: s.address, postalBox: s.postalBox,
    phone: s.phone, email: s.email, countryId: s.countryId ? String(s.countryId) : '',
    contactPerson: s.contactPerson,
  }
}

const searchInputClass = 'rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export function SuppliersPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [showDeleted, setShowDeleted] = useState(false)
  const fetcher = useCallback((p: number, s: number) => suppliersApi.getAll(p, s, showDeleted), [showDeleted])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher, pageSize: 100 })
  const [countries, setCountries] = useState<CountryDto[]>([])
  const [search, setSearch] = useState('')
  const filtered = (data?.items ?? []).filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  )

  useEffect(() => { countriesApi.getForSelect().then(setCountries).catch(() => {}) }, [])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierDto | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SupplierDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true) }
  function openEdit(item: SupplierDto) { setEditing(item); setForm(toForm(item)); setFormError(null); setModalOpen(true) }

  const setF = (k: keyof Pick<Form, 'name' | 'address' | 'postalBox' | 'phone' | 'email' | 'contactPerson'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value || null }))

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Le nom est obligatoire.'); return }
    setSaving(true); setFormError(null)
    try {
      const dto = {
        name: form.name.trim(), address: form.address, postalBox: form.postalBox,
        phone: form.phone, email: form.email,
        countryId: form.countryId ? Number(form.countryId) : null,
        contactPerson: form.contactPerson,
      }
      if (editing) { await suppliersApi.update(editing.id, dto); toast('Fournisseur mis à jour.') }
      else { await suppliersApi.create(dto); toast('Fournisseur créé.') }
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur.') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await suppliersApi.delete(deleteTarget.id); toast('Fournisseur supprimé.', 'info'); setDeleteTarget(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Impossible.', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{data ? `${search ? `${filtered.length} / ` : ''}${data.totalCount} fournisseur(s)` : ''}</p>
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            Afficher supprimés
          </label>
        </div>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Ajouter</Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input type="text" placeholder="Rechercher un fournisseur…" value={search} onChange={e => setSearch(e.target.value)} className={searchInputClass} />
        {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"><X size={13} /></button>}
      </div>

      <DataTable
        rows={filtered} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucun fournisseur."
        rowClassName={r => r.isDeleted ? 'opacity-50' : ''}
        columns={[
          { key: 'code', header: 'Code', width: 'w-16', render: r => (
            <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r.code}</span>
          )},
          { key: 'name', header: 'Fournisseur', render: r => (
            <div>
              <p className="font-semibold text-gray-900">{r.name}</p>
              {r.isDeleted && <span className="text-xs text-red-500 font-medium">Supprimé</span>}
              {!r.isDeleted && r.contactPerson && <p className="text-xs text-gray-500">{r.contactPerson}</p>}
            </div>
          )},
          { key: 'contact', header: 'Contact', render: r => (
            <div className="flex flex-col gap-0.5">
              {r.email && <a href={`mailto:${r.email}`} className="text-xs text-brand-600 hover:underline flex items-center gap-1"><Mail size={11}/>{r.email}</a>}
              {r.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11}/>{r.phone}</span>}
            </div>
          )},
          { key: 'countryName', header: 'Pays', render: r => r.countryName ?? <span className="text-gray-300">—</span> },
          { key: 'address', header: 'Adresse', render: r => <span className="text-gray-500 text-sm">{r.address ?? '—'}</span> },
        ]}
        actions={row => row.isDeleted ? (
          <button title="Restaurer" onClick={async () => { await suppliersApi.restore(row.id); toast('Restauré.'); refresh() }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><RotateCcw size={14} /></button>
        ) : (<>
          <button title="Détails" onClick={() => navigate(`/suppliers/${row.id}`)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Eye size={14} /></button>
          <button title="Modifier" onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button title="Supprimer" onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </>)}
      />
      {data && !search && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Modifier — ${editing.name}` : 'Nouveau fournisseur'} size="lg">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <Input label="Nom *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Raison sociale" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email ?? ''} onChange={setF('email')} placeholder="contact@example.com" />
            <Input label="Téléphone" value={form.phone ?? ''} onChange={setF('phone')} placeholder="+228 XX XX XX XX" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Pays" value={form.countryId} onChange={v => setForm(f => ({ ...f, countryId: v }))}
              options={countries.map(c => ({ value: c.id, label: c.name }))} placeholder="Sélectionner un pays" />
            <Input label="Boîte postale" value={form.postalBox ?? ''} onChange={setF('postalBox')} placeholder="BP 1234" />
          </div>
          <Input label="Adresse" value={form.address ?? ''} onChange={setF('address')} placeholder="Rue, quartier…" />
          <Input label="Personne de contact" value={form.contactPerson ?? ''} onChange={setF('contactPerson')} placeholder="Nom du contact" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Supprimer le fournisseur" message={`Supprimer "${deleteTarget?.name}" ?`} loading={deleting} />
    </div>
  )
}
