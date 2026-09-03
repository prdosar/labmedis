import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import type { BudgetVsActuelDto, OperatingExpenseDto } from '../../api/types'
import { operatingExpensesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Select, Textarea } from '../../components/ui/Input'

const CATEGORIES = [
  { value: 'Loyer', label: 'Loyer' },
  { value: 'Electricite', label: 'Électricité' },
  { value: 'Eau', label: 'Eau' },
  { value: 'Telephone', label: 'Téléphone' },
  { value: 'Salaires', label: 'Salaires' },
  { value: 'Assurance', label: 'Assurance' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Divers', label: 'Divers' },
]

const PAYMENT_METHODS = [
  { value: 'Especes', label: 'Espèces' },
  { value: 'Virement', label: 'Virement' },
  { value: 'Cheque', label: 'Chèque' },
  { value: 'MobileMoney', label: 'Mobile Money' },
]

const MONTHS = [
  { value: '0', label: 'Annuel' },
  { value: '1', label: 'Janvier' }, { value: '2', label: 'Février' }, { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' }, { value: '5', label: 'Mai' }, { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' }, { value: '8', label: 'Août' }, { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' }, { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
]

function labelCat(value: string) { return CATEGORIES.find(x => x.value === value)?.label ?? value }
function labelPayment(value: string) { return PAYMENT_METHODS.find(x => x.value === value)?.label ?? value }

interface Form {
  date: string; categorie: string; description: string
  montant: string; modePaiement: string; reference: string; notes: string
}

const empty: Form = {
  date: new Date().toISOString().slice(0, 10),
  categorie: 'Loyer', description: '', montant: '',
  modePaiement: 'Especes', reference: '', notes: '',
}

function toForm(item: OperatingExpenseDto): Form {
  return {
    date: item.date, categorie: item.categorie, description: item.description,
    montant: String(item.montant), modePaiement: item.modePaiement,
    reference: item.reference ?? '', notes: item.notes ?? '',
  }
}

const searchInputClass = 'rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

export function OperatingExpensesPage() {
  const { toast } = useToast()
  const now = new Date()
  const [activeTab, setActiveTab] = useState<'charges' | 'budget'>('charges')

  // Filtres liste
  const [filterAnnee, setFilterAnnee] = useState(now.getFullYear())
  const [filterMois, setFilterMois] = useState(now.getMonth() + 1)

  const fetcher = useCallback(
    (p: number, s: number) => operatingExpensesApi.getAll(p, s, filterAnnee, filterMois),
    [filterAnnee, filterMois],
  )
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher, pageSize: 20 })

  const [search, setSearch] = useState('')
  const filtered = (data?.items ?? []).filter(r =>
    r.description.toLowerCase().includes(search.toLowerCase()) ||
    labelCat(r.categorie).toLowerCase().includes(search.toLowerCase()),
  )

  // Modal charges
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OperatingExpenseDto | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OperatingExpenseDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Budget vs Réalisé
  const [budgetAnnee, setBudgetAnnee] = useState(now.getFullYear())
  const [budgetMois, setBudgetMois] = useState(now.getMonth() + 1)
  const [budgetData, setBudgetData] = useState<BudgetVsActuelDto[]>([])
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [budgetValue, setBudgetValue] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)

  useEffect(() => {
    if (activeTab !== 'budget') return
    setBudgetLoading(true)
    operatingExpensesApi.getBudgetVsActuel(budgetAnnee, budgetMois)
      .then(setBudgetData)
      .catch(() => {})
      .finally(() => setBudgetLoading(false))
  }, [activeTab, budgetAnnee, budgetMois])

  function openCreate() { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true) }
  function openEdit(item: OperatingExpenseDto) { setEditing(item); setForm(toForm(item)); setFormError(null); setModalOpen(true) }

  async function handleSave() {
    if (!form.description.trim()) { setFormError('La description est obligatoire.'); return }
    const montant = parseFloat(form.montant)
    if (isNaN(montant) || montant <= 0) { setFormError('Le montant doit être positif.'); return }

    setSaving(true); setFormError(null)
    const dto = {
      date: form.date, categorie: form.categorie,
      description: form.description.trim(), montant,
      modePaiement: form.modePaiement,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
    }
    try {
      if (editing) { await operatingExpensesApi.update(editing.id, dto); toast('Charge modifiée') }
      else { await operatingExpensesApi.create(dto); toast('Charge créée') }
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur inattendue') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await operatingExpensesApi.delete(deleteTarget.id); toast('Charge supprimée'); setDeleteTarget(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Erreur', 'error') }
    finally { setDeleting(false) }
  }

  async function handleSaveBudget(categorie: string) {
    const val = parseFloat(budgetValue)
    if (isNaN(val) || val < 0) return
    setSavingBudget(true)
    try {
      await operatingExpensesApi.upsertBudget({ annee: budgetAnnee, mois: budgetMois, categorie, montantBudget: val })
      toast('Budget enregistré')
      setEditingBudget(null)
      // Rafraîchir
      const updated = await operatingExpensesApi.getBudgetVsActuel(budgetAnnee, budgetMois)
      setBudgetData(updated)
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Erreur', 'error') }
    finally { setSavingBudget(false) }
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const yearsOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i
    return { value: String(y), label: String(y) }
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Charges d'exploitation</h1>
        {activeTab === 'charges' && (
          <Button onClick={openCreate} icon={<Plus size={15} />}>Nouvelle charge</Button>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {(['charges', 'budget'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'charges' ? 'Charges' : 'Budget vs Réalisé'}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'charges' && (
        <>
          {/* Filtres */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select label="" value={String(filterAnnee)} onChange={v => setFilterAnnee(Number(v))} options={yearsOptions} />
            <Select label="" value={String(filterMois)} onChange={v => setFilterMois(Number(v))} options={MONTHS.filter(m => m.value !== '0')} />
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" placeholder="Rechercher…" value={search}
                onChange={e => setSearch(e.target.value)} className={searchInputClass}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <span className="text-sm text-gray-400">{data ? `${filtered.length} charge(s)` : ''}</span>
          </div>

          <DataTable
            rows={filtered} loading={loading} keyExtractor={r => r.id}
            emptyMessage="Aucune charge enregistrée"
            columns={[
              { key: 'date', header: 'Date', width: 'w-24', render: r => new Date(r.date).toLocaleDateString('fr-FR') },
              { key: 'categorie', header: 'Catégorie', width: 'w-32', render: r => <span className="text-xs font-medium text-gray-700">{labelCat(r.categorie)}</span> },
              { key: 'description', header: 'Description', render: r => r.description },
              { key: 'reference', header: 'Réf.', width: 'w-24', render: r => r.reference ? <span className="font-mono text-xs">{r.reference}</span> : <span className="text-gray-300">—</span> },
              { key: 'modePaiement', header: 'Paiement', width: 'w-28', render: r => <span className="text-xs text-gray-600">{labelPayment(r.modePaiement)}</span> },
              { key: 'montant', header: 'Montant (XOF)', width: 'w-32', render: r => <span className="text-right block font-bold text-gray-900">{fmt(r.montant)}</span> },
            ]}
            actions={row => (
              <div className="flex gap-1">
                <button title="Modifier" onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-brand-600"><Pencil size={14} /></button>
                <button title="Supprimer" onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            )}
          />
          {data && !search && (
            <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />
          )}
        </>
      )}

      {activeTab === 'budget' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Select label="" value={String(budgetAnnee)} onChange={v => setBudgetAnnee(Number(v))} options={yearsOptions} />
            <Select label="" value={String(budgetMois)} onChange={v => setBudgetMois(Number(v))} options={MONTHS} />
            <p className="text-sm text-gray-500">Cliquer sur le budget d'une catégorie pour le modifier.</p>
          </div>

          {budgetLoading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Catégorie</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 w-36">Budget (XOF)</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 w-36">Réalisé (XOF)</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 w-36">Écart (XOF)</th>
                    <th className="px-4 py-3 w-48">Consommation</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetData.map(row => {
                    const pct = Math.min(row.pctConsomme, 100)
                    const color = row.pctConsomme >= 100 ? 'bg-red-500' : row.pctConsomme >= 80 ? 'bg-amber-400' : 'bg-green-500'
                    return (
                      <tr key={row.categorie} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-800">{labelCat(row.categorie)}</td>
                        <td className="px-4 py-3 text-right">
                          {editingBudget === row.categorie ? (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number" value={budgetValue} onChange={e => setBudgetValue(e.target.value)}
                                className="w-28 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                                autoFocus
                              />
                              <Button onClick={() => handleSaveBudget(row.categorie)} loading={savingBudget} variant="secondary">OK</Button>
                              <button onClick={() => setEditingBudget(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingBudget(row.categorie); setBudgetValue(String(row.budget)) }}
                              className="text-gray-700 hover:text-brand-600 hover:underline"
                            >
                              {fmt(row.budget)}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{fmt(row.realise)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${row.ecart >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {row.ecart >= 0 ? '+' : ''}{fmt(row.ecart)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-xs font-semibold w-10 text-right ${row.pctConsomme >= 100 ? 'text-red-600' : 'text-gray-600'}`}>
                              {row.pctConsomme.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                    <td className="px-4 py-3 text-right font-bold">{fmt(budgetData.reduce((s, r) => s + r.budget, 0))}</td>
                    <td className="px-4 py-3 text-right font-bold">{fmt(budgetData.reduce((s, r) => s + r.realise, 0))}</td>
                    <td className="px-4 py-3 text-right font-bold">{fmt(budgetData.reduce((s, r) => s + r.ecart, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal charge */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la charge' : 'Nouvelle charge'} size="lg">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date *" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <Select label="Catégorie *" value={form.categorie} onChange={v => setForm(f => ({ ...f, categorie: v }))} options={CATEGORIES} />
          </div>
          <Input label="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Décrivez la charge" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Montant (XOF) *" type="number" step="1" min="0" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
            <Select label="Mode de paiement" value={form.modePaiement} onChange={v => setForm(f => ({ ...f, modePaiement: v }))} options={PAYMENT_METHODS} />
          </div>
          <Input label="Référence" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Supprimer la charge" message={`Supprimer "${deleteTarget?.description}" ?`} loading={deleting}
      />
    </div>
  )
}
