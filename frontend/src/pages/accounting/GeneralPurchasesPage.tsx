import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X, CheckCircle } from 'lucide-react'
import type { GeneralPurchaseDto } from '../../api/types'
import { generalPurchasesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Select, Textarea } from '../../components/ui/Input'

const CATEGORIES = [
  { value: 'FournituresBureau', label: 'Fournitures bureau' },
  { value: 'Materiel', label: 'Matériel' },
  { value: 'Informatique', label: 'Informatique' },
  { value: 'Entretien', label: 'Entretien' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Services', label: 'Services' },
  { value: 'Divers', label: 'Divers' },
]

const PAYMENT_METHODS = [
  { value: 'Especes', label: 'Espèces' },
  { value: 'Virement', label: 'Virement' },
  { value: 'Cheque', label: 'Chèque' },
  { value: 'MobileMoney', label: 'Mobile Money' },
]

function labelFor(list: { value: string; label: string }[], value: string) {
  return list.find(x => x.value === value)?.label ?? value
}

interface Form {
  dateAchat: string
  reference: string
  fournisseurNom: string
  designation: string
  categorie: string
  montantHT: string
  tauxTVA: string
  modePaiement: string
  notes: string
}

const empty: Form = {
  dateAchat: new Date().toISOString().slice(0, 10),
  reference: '',
  fournisseurNom: '',
  designation: '',
  categorie: 'FournituresBureau',
  montantHT: '',
  tauxTVA: '18',
  modePaiement: 'Especes',
  notes: '',
}

function toForm(item: GeneralPurchaseDto): Form {
  return {
    dateAchat: item.dateAchat,
    reference: item.reference ?? '',
    fournisseurNom: item.fournisseurNom,
    designation: item.designation,
    categorie: item.categorie,
    montantHT: String(item.montantHT),
    tauxTVA: String(item.tauxTVA),
    modePaiement: item.modePaiement,
    notes: item.notes ?? '',
  }
}

const searchInputClass = 'rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export function GeneralPurchasesPage() {
  const { toast } = useToast()
  const fetcher = useCallback((p: number, s: number) => generalPurchasesApi.getAll(p, s), [])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher, pageSize: 20 })

  const [search, setSearch] = useState('')
  const filtered = (data?.items ?? []).filter(r =>
    r.fournisseurNom.toLowerCase().includes(search.toLowerCase()) ||
    r.designation.toLowerCase().includes(search.toLowerCase()) ||
    (r.reference ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GeneralPurchaseDto | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GeneralPurchaseDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<GeneralPurchaseDto | null>(null)
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [markingPaidLoading, setMarkingPaidLoading] = useState(false)

  function openCreate() { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true) }
  function openEdit(item: GeneralPurchaseDto) { setEditing(item); setForm(toForm(item)); setFormError(null); setModalOpen(true) }

  const ht = parseFloat(form.montantHT) || 0
  const tva = parseFloat(form.tauxTVA) || 0
  const ttc = Math.round((ht + ht * tva / 100) * 100) / 100

  async function handleSave() {
    if (!form.fournisseurNom.trim()) { setFormError('Le nom du fournisseur est obligatoire.'); return }
    if (!form.designation.trim()) { setFormError('La désignation est obligatoire.'); return }
    if (!form.montantHT || isNaN(ht) || ht < 0) { setFormError('Le montant HT est invalide.'); return }

    setSaving(true); setFormError(null)
    const dto = {
      dateAchat: form.dateAchat,
      reference: form.reference.trim() || null,
      fournisseurNom: form.fournisseurNom.trim(),
      designation: form.designation.trim(),
      categorie: form.categorie,
      montantHT: ht,
      tauxTVA: tva,
      modePaiement: form.modePaiement,
      notes: form.notes.trim() || null,
    }
    try {
      if (editing) { await generalPurchasesApi.update(editing.id, dto); toast('Achat modifié') }
      else { await generalPurchasesApi.create(dto); toast('Achat créé') }
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur inattendue') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await generalPurchasesApi.delete(deleteTarget.id); toast('Achat supprimé'); setDeleteTarget(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Impossible de supprimer', 'error') }
    finally { setDeleting(false) }
  }

  async function handleMarkPaid() {
    if (!markingPaid) return
    setMarkingPaidLoading(true)
    try { await generalPurchasesApi.markPaid(markingPaid.id, markPaidDate); toast('Achat marqué payé'); setMarkingPaid(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Erreur', 'error') }
    finally { setMarkingPaidLoading(false) }
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Achats généraux</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data ? `${filtered.length} / ${data.totalCount} achat(s)` : ''}
          </p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Nouvel achat</Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" placeholder="Rechercher fournisseur, désignation…"
          value={search} onChange={e => setSearch(e.target.value)}
          className={searchInputClass}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      <DataTable
        rows={filtered}
        loading={loading}
        keyExtractor={r => r.id}
        emptyMessage="Aucun achat enregistré"
        columns={[
          { key: 'dateAchat', header: 'Date', width: 'w-24', render: r => new Date(r.dateAchat).toLocaleDateString('fr-FR') },
          { key: 'reference', header: 'Réf.', width: 'w-24', render: r => r.reference ? <span className="font-mono text-xs">{r.reference}</span> : <span className="text-gray-300">—</span> },
          { key: 'fournisseurNom', header: 'Fournisseur', render: r => <span className="font-medium">{r.fournisseurNom}</span> },
          { key: 'designation', header: 'Désignation', render: r => r.designation },
          { key: 'categorie', header: 'Catégorie', width: 'w-36', render: r => <span className="text-xs text-gray-600">{labelFor(CATEGORIES, r.categorie)}</span> },
          { key: 'montantHT', header: 'HT (XOF)', width: 'w-28', render: r => <span className="text-right block font-semibold">{fmt(r.montantHT)}</span> },
          { key: 'montantTTC', header: 'TTC (XOF)', width: 'w-28', render: r => <span className="text-right block font-bold text-brand-700">{fmt(r.montantTTC)}</span> },
          {
            key: 'estPaye', header: 'Statut', width: 'w-24',
            render: r => r.estPaye
              ? <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold"><CheckCircle size={12} /> Payé</span>
              : <span className="text-xs text-amber-600 font-medium">Non payé</span>,
          },
        ]}
        actions={row => (
          <div className="flex items-center gap-1">
            {!row.estPaye && (
              <button title="Marquer payé" onClick={() => { setMarkingPaid(row); setMarkPaidDate(new Date().toISOString().slice(0, 10)) }} className="p-1.5 text-gray-400 hover:text-green-600">
                <CheckCircle size={14} />
              </button>
            )}
            <button title="Modifier" onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-brand-600"><Pencil size={14} /></button>
            <button title="Supprimer" onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        )}
      />

      {data && !search && (
        <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />
      )}

      {/* Modal création/modification */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier l\'achat' : 'Nouvel achat général'} size="lg">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Date *" type="date" value={form.dateAchat} onChange={e => setForm(f => ({ ...f, dateAchat: e.target.value }))} />
            <Input label="Référence" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Fournisseur *" value={form.fournisseurNom} onChange={e => setForm(f => ({ ...f, fournisseurNom: e.target.value }))} placeholder="Nom du fournisseur" />
            <Select label="Catégorie *" value={form.categorie} onChange={v => setForm(f => ({ ...f, categorie: v }))} options={CATEGORIES} />
          </div>

          <Input label="Désignation *" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Description de l'achat" />

          <div className="grid grid-cols-3 gap-4">
            <Input label="Montant HT (XOF) *" type="number" step="1" min="0" value={form.montantHT} onChange={e => setForm(f => ({ ...f, montantHT: e.target.value }))} />
            <Input label="Taux TVA (%)" type="number" step="0.01" min="0" value={form.tauxTVA} onChange={e => setForm(f => ({ ...f, tauxTVA: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TTC (XOF)</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold text-brand-700">
                {ttc.toLocaleString('fr-FR', { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <Select label="Mode de paiement" value={form.modePaiement} onChange={v => setForm(f => ({ ...f, modePaiement: v }))} options={PAYMENT_METHODS} />

          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal marquer payé */}
      <Modal isOpen={!!markingPaid} onClose={() => setMarkingPaid(null)} title="Marquer comme payé" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">Achat : <strong>{markingPaid?.fournisseurNom}</strong> — {markingPaid?.montantTTC.toLocaleString('fr-FR')} XOF</p>
          <Input label="Date de paiement *" type="date" value={markPaidDate} onChange={e => setMarkPaidDate(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setMarkingPaid(null)}>Annuler</Button>
            <Button onClick={handleMarkPaid} loading={markingPaidLoading}>Confirmer</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Supprimer l'achat" message={`Supprimer l'achat "${deleteTarget?.designation}" ?`} loading={deleting}
      />
    </div>
  )
}
