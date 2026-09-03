import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, TableProperties, X } from 'lucide-react'
import type { DepreciationLineDto, FixedAssetDto } from '../../api/types'
import { fixedAssetsApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Select, Textarea } from '../../components/ui/Input'

const CATEGORIES = [
  { value: 'Materiel', label: 'Matériel' },
  { value: 'Vehicule', label: 'Véhicule' },
  { value: 'Informatique', label: 'Informatique' },
  { value: 'Mobilier', label: 'Mobilier' },
  { value: 'Batiment', label: 'Bâtiment' },
  { value: 'Incorporel', label: 'Incorporel' },
  { value: 'Autre', label: 'Autre' },
]

const METHODS = [
  { value: 'Lineaire', label: 'Linéaire' },
  { value: 'Degressif', label: 'Dégressif' },
]

const STATUSES = [
  { value: 'EnService', label: 'En service' },
  { value: 'PleinementAmorti', label: 'Pleinement amorti' },
  { value: 'Cede', label: 'Cédé' },
]

function labelFor(list: { value: string; label: string }[], value: string) {
  return list.find(x => x.value === value)?.label ?? value
}

interface Form {
  code: string; designation: string; categorie: string
  dateAcquisition: string; coutAcquisition: string; valeurResiduelle: string
  dureeVieAns: string; methode: string; status: string; notes: string
}

const empty: Form = {
  code: '', designation: '', categorie: 'Materiel',
  dateAcquisition: new Date().toISOString().slice(0, 10),
  coutAcquisition: '', valeurResiduelle: '0',
  dureeVieAns: '5', methode: 'Lineaire', status: 'EnService', notes: '',
}

function toForm(item: FixedAssetDto): Form {
  return {
    code: item.code, designation: item.designation, categorie: item.categorie,
    dateAcquisition: item.dateAcquisition, coutAcquisition: String(item.coutAcquisition),
    valeurResiduelle: String(item.valeurResiduelle), dureeVieAns: String(item.dureeVieAns),
    methode: item.methode, status: item.status, notes: item.notes ?? '',
  }
}

function statusBadge(status: string) {
  if (status === 'EnService') return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">En service</span>
  if (status === 'PleinementAmorti') return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Amorti</span>
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Cédé</span>
}

function currentVNC(tableau: DepreciationLineDto[]): number {
  if (!tableau.length) return 0
  const sorted = [...tableau].sort((a, b) => a.annee - b.annee)
  const now = new Date().getFullYear()
  const line = [...sorted].reverse().find(l => l.annee <= now)
  return line ? line.valeurNette : sorted[0].baseAmortissable
}

function DepreciationTable({ asset }: { asset: FixedAssetDto }) {
  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const lines = [...asset.tableau].sort((a, b) => a.annee - b.annee)
  const nowYear = new Date().getFullYear()

  return (
    <div className="border border-brand-100 rounded-xl overflow-hidden bg-white">
      <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-center gap-2">
        <TableProperties size={16} className="text-brand-500" />
        <span className="text-sm font-semibold text-brand-800">
          Tableau d'amortissement — {asset.designation} ({labelFor(METHODS, asset.methode)})
        </span>
        <span className="ml-2 text-xs text-brand-600">
          {asset.methode === 'Lineaire'
            ? `Taux : ${asset.tauxLineaire.toFixed(2)}%`
            : `Taux linéaire ${asset.tauxLineaire.toFixed(2)}% × ${asset.coefficientDegressif} = ${(asset.tauxLineaire * asset.coefficientDegressif).toFixed(2)}%`
          }
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Année</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">Base amortissable (XOF)</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">Dotation annuelle (XOF)</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">Cumul amortissements (XOF)</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">Valeur nette (XOF)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr
                key={l.annee}
                className={`border-b border-gray-100 ${l.annee === nowYear ? 'bg-brand-50 font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <td className="px-4 py-2 font-medium">
                  {l.annee}
                  {l.annee === nowYear && <span className="ml-2 text-xs text-brand-500 font-normal">(en cours)</span>}
                </td>
                <td className="px-4 py-2 text-right">{fmt(l.baseAmortissable)}</td>
                <td className="px-4 py-2 text-right text-brand-700 font-semibold">{fmt(l.dotationAnnuelle)}</td>
                <td className="px-4 py-2 text-right">{fmt(l.cumulAmortissements)}</td>
                <td className="px-4 py-2 text-right font-bold">{fmt(l.valeurNette)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function FixedAssetsPage() {
  const { toast } = useToast()
  const fetcher = useCallback((p: number, s: number) => fixedAssetsApi.getAll(p, s), [])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher, pageSize: 20 })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FixedAssetDto | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FixedAssetDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<FixedAssetDto | null>(null)

  function openCreate() { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true) }
  function openEdit(item: FixedAssetDto) { setEditing(item); setForm(toForm(item)); setFormError(null); setModalOpen(true) }

  const dureeVie = parseInt(form.dureeVieAns) || 0
  const tauxLineaire = dureeVie > 0 ? (100 / dureeVie).toFixed(2) : '0'
  const coeff = dureeVie <= 4 ? '1.50' : dureeVie <= 6 ? '2.00' : '2.50'
  const tauxDegressif = dureeVie > 0 ? ((100 / dureeVie) * parseFloat(coeff)).toFixed(2) : '0'

  async function handleSave() {
    if (!form.code.trim()) { setFormError('Le code est obligatoire.'); return }
    if (!form.designation.trim()) { setFormError('La désignation est obligatoire.'); return }
    const cout = parseFloat(form.coutAcquisition)
    const residuelle = parseFloat(form.valeurResiduelle)
    const duree = parseInt(form.dureeVieAns)
    if (isNaN(cout) || cout <= 0) { setFormError("Le coût d'acquisition doit être positif."); return }
    if (isNaN(residuelle) || residuelle < 0) { setFormError('La valeur résiduelle ne peut pas être négative.'); return }
    if (isNaN(duree) || duree <= 0) { setFormError('La durée de vie doit être supérieure à 0.'); return }

    setSaving(true); setFormError(null)
    const dto = {
      code: form.code.trim(), designation: form.designation.trim(), categorie: form.categorie,
      dateAcquisition: form.dateAcquisition, coutAcquisition: cout, valeurResiduelle: residuelle,
      dureeVieAns: duree, methode: form.methode,
      ...(editing ? { status: form.status } : {}),
      notes: form.notes.trim() || null,
    }
    try {
      if (editing) {
        const updated = await fixedAssetsApi.update(editing.id, dto)
        if (selectedAsset?.id === editing.id) setSelectedAsset(updated)
        toast('Immobilisation modifiée')
      } else {
        await fixedAssetsApi.create(dto)
        toast('Immobilisation créée')
      }
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur inattendue') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fixedAssetsApi.delete(deleteTarget.id)
      toast('Immobilisation supprimée')
      if (selectedAsset?.id === deleteTarget.id) setSelectedAsset(null)
      setDeleteTarget(null); refresh()
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Erreur', 'error') }
    finally { setDeleting(false) }
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Immobilisations & Amortissements</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data ? `${data.totalCount} bien(s) immobilisé(s)` : ''}</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Nouveau bien</Button>
      </div>

      <DataTable
        rows={items} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucune immobilisation enregistrée"
        rowClassName={r => selectedAsset?.id === r.id ? 'ring-1 ring-brand-300 bg-brand-50/30' : ''}
        columns={[
          { key: 'code', header: 'Code', width: 'w-24', render: r => <span className="font-mono font-semibold text-brand-700">{r.code}</span> },
          { key: 'designation', header: 'Désignation', render: r => <span className="font-medium">{r.designation}</span> },
          { key: 'categorie', header: 'Catégorie', width: 'w-28', render: r => <span className="text-xs">{labelFor(CATEGORIES, r.categorie)}</span> },
          { key: 'dateAcquisition', header: 'Acquisition', width: 'w-28', render: r => new Date(r.dateAcquisition).toLocaleDateString('fr-FR') },
          { key: 'coutAcquisition', header: 'Coût (XOF)', width: 'w-32', render: r => <span className="text-right block">{fmt(r.coutAcquisition)}</span> },
          { key: 'methode', header: 'Méthode', width: 'w-24', render: r => <span className="text-xs">{labelFor(METHODS, r.methode)}</span> },
          { key: 'vnc', header: 'VNC (XOF)', width: 'w-32', render: r => <span className="text-right block font-bold">{fmt(currentVNC(r.tableau))}</span> },
          { key: 'status', header: 'Statut', width: 'w-32', render: r => statusBadge(r.status) },
        ]}
        actions={row => (
          <div className="flex items-center gap-1">
            <button
              title="Voir tableau d'amortissement"
              onClick={() => setSelectedAsset(selectedAsset?.id === row.id ? null : row)}
              className={`p-1.5 transition-colors ${selectedAsset?.id === row.id ? 'text-brand-600' : 'text-gray-400 hover:text-brand-600'}`}
            >
              <TableProperties size={14} />
            </button>
            <button title="Modifier" onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-brand-600"><Pencil size={14} /></button>
            <button title="Supprimer" onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        )}
      />

      {data && (
        <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />
      )}

      {/* Tableau d'amortissement */}
      {selectedAsset && (
        <div className="relative">
          <button
            onClick={() => setSelectedAsset(null)}
            className="absolute top-3 right-3 z-10 p-1 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-200"
          >
            <X size={14} />
          </button>
          <DepreciationTable asset={selectedAsset} />
        </div>
      )}

      {/* Modal création/modification */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le bien' : 'Nouveau bien immobilisé'} size="lg">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Code *" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ex: IMM-001" />
            <Select label="Catégorie *" value={form.categorie} onChange={v => setForm(f => ({ ...f, categorie: v }))} options={CATEGORIES} />
          </div>

          <Input label="Désignation *" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Nom du bien" />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Date d'acquisition *" type="date" value={form.dateAcquisition} onChange={e => setForm(f => ({ ...f, dateAcquisition: e.target.value }))} />
            <Input label="Coût d'acquisition (XOF) *" type="number" step="1" min="0" value={form.coutAcquisition} onChange={e => setForm(f => ({ ...f, coutAcquisition: e.target.value }))} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Valeur résiduelle (XOF)" type="number" step="1" min="0" value={form.valeurResiduelle} onChange={e => setForm(f => ({ ...f, valeurResiduelle: e.target.value }))} />
            <Input label="Durée de vie (ans) *" type="number" step="1" min="1" value={form.dureeVieAns} onChange={e => setForm(f => ({ ...f, dureeVieAns: e.target.value }))} />
            <Select label="Méthode *" value={form.methode} onChange={v => setForm(f => ({ ...f, methode: v }))} options={METHODS} />
          </div>

          {/* Aperçu taux */}
          <div className="flex gap-4 p-3 bg-brand-50 border border-brand-100 rounded-lg text-xs text-brand-700">
            <span>Taux linéaire : <strong>{tauxLineaire}%</strong></span>
            {form.methode === 'Degressif' && (
              <>
                <span>Coefficient SYSCOHADA : <strong>×{coeff}</strong></span>
                <span>Taux dégressif : <strong>{tauxDegressif}%</strong></span>
              </>
            )}
          </div>

          {editing && (
            <Select label="Statut" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUSES} />
          )}

          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer & générer tableau'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Supprimer le bien"
        message={`Supprimer "${deleteTarget?.designation}" et son tableau d'amortissement ?`}
        loading={deleting}
      />
    </div>
  )
}
