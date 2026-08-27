import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw, Mail, Phone } from 'lucide-react'
import type { CustomerDto, CountryDto } from '../../api/types'
import { customersApi, countriesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'

interface Form {
  code: string | null; name: string; address: string | null; postalBox: string | null
  phone: string | null; email: string | null; city: string | null
  countryId: string; contactPerson: string | null
}

const empty: Form = { code: null, name: '', address: null, postalBox: null, phone: null, email: null, city: null, countryId: '', contactPerson: null }

function toForm(c: CustomerDto): Form {
  return {
    code: c.code, name: c.name, address: c.address, postalBox: c.postalBox,
    phone: c.phone, email: c.email, city: c.city,
    countryId: c.countryId ? String(c.countryId) : '',
    contactPerson: c.contactPerson,
  }
}

export function CustomersPage() {
  const { toast } = useToast()
  const fetcher = useCallback((p: number, s: number) => customersApi.getAll(p, s), [])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher })
  const [countries, setCountries] = useState<CountryDto[]>([])

  useEffect(() => { countriesApi.getForSelect().then(setCountries).catch(() => {}) }, [])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerDto | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true) }
  function openEdit(item: CustomerDto) { setEditing(item); setForm(toForm(item)); setFormError(null); setModalOpen(true) }

  const setF = (k: keyof Pick<Form, 'code' | 'name' | 'address' | 'postalBox' | 'phone' | 'email' | 'city' | 'contactPerson'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value || null }))

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Le nom est obligatoire.'); return }
    setSaving(true); setFormError(null)
    try {
      const dto = {
        code: form.code || null, name: form.name.trim(), address: form.address,
        postalBox: form.postalBox, phone: form.phone, email: form.email, city: form.city,
        countryId: form.countryId ? Number(form.countryId) : null,
        contactPerson: form.contactPerson,
      }
      if (editing) { await customersApi.update(editing.id, dto); toast('Client mis à jour.') }
      else { await customersApi.create(dto); toast('Client créé.') }
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur.') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await customersApi.delete(deleteTarget.id); toast('Client supprimé.', 'info'); setDeleteTarget(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Impossible.', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${data.totalCount} client(s)` : ''}</p>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Ajouter</Button>
      </div>

      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucun client."
        columns={[
          { key: 'code', header: 'Code', width: 'w-24', render: r => r.code ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.code}</span> : <span className="text-gray-300">—</span> },
          { key: 'name', header: 'Client', render: r => (
            <div>
              <p className="font-semibold text-gray-900">{r.name}</p>
              {r.contactPerson && <p className="text-xs text-gray-500">{r.contactPerson}</p>}
            </div>
          )},
          { key: 'contact', header: 'Contact', render: r => (
            <div className="flex flex-col gap-0.5">
              {r.email && <a href={`mailto:${r.email}`} className="text-xs text-brand-600 hover:underline flex items-center gap-1"><Mail size={11}/>{r.email}</a>}
              {r.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11}/>{r.phone}</span>}
            </div>
          )},
          { key: 'city', header: 'Ville', render: r => r.city ?? <span className="text-gray-300">—</span> },
          { key: 'countryName', header: 'Pays', render: r => r.countryName ?? <span className="text-gray-300">—</span> },
        ]}
        actions={row => (<>
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
          <button onClick={async () => { await customersApi.restore(row.id); toast('Restauré.'); refresh() }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><RotateCcw size={14} /></button>
        </>)}
      />
      {data && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Modifier — ${editing.name}` : 'Nouveau client'} size="lg">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code client" value={form.code ?? ''} onChange={setF('code')} placeholder="CLI-001" />
            <Input label="Nom *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Raison sociale" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email ?? ''} onChange={setF('email')} />
            <Input label="Téléphone" value={form.phone ?? ''} onChange={setF('phone')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Pays" value={form.countryId} onChange={v => setForm(f => ({ ...f, countryId: v }))}
              options={countries.map(c => ({ value: c.id, label: c.name }))} placeholder="Sélectionner un pays" />
            <Input label="Ville" value={form.city ?? ''} onChange={setF('city')} placeholder="Lomé" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Boîte postale" value={form.postalBox ?? ''} onChange={setF('postalBox')} />
            <Input label="Personne de contact" value={form.contactPerson ?? ''} onChange={setF('contactPerson')} />
          </div>
          <Input label="Adresse" value={form.address ?? ''} onChange={setF('address')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Supprimer le client" message={`Supprimer "${deleteTarget?.name}" ?`} loading={deleting} />
    </div>
  )
}
