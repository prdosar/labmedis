import { useEffect, useState } from 'react'
import { BookOpen, Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import type { ChartAccountDto } from '../../api/types'
import { accountingApi } from '../../api/endpoints'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'

const classLabel: Record<string, string> = {
  Asset: 'Actif',
  Liability: 'Passif',
  Equity: 'Capitaux',
  Income: 'Produits',
  Expense: 'Charges',
  ThirdParty: 'Tiers',
}
const classBadge: Record<string, string> = {
  Asset: 'bg-blue-50 text-blue-700',
  Liability: 'bg-purple-50 text-purple-700',
  Equity: 'bg-indigo-50 text-indigo-700',
  Income: 'bg-green-50 text-green-700',
  Expense: 'bg-red-50 text-red-700',
  ThirdParty: 'bg-orange-50 text-orange-700',
}

const classOptions = [
  { value: 'Asset', label: 'Actif' },
  { value: 'Liability', label: 'Passif' },
  { value: 'Equity', label: 'Capitaux propres' },
  { value: 'ThirdParty', label: 'Tiers (4xx)' },
  { value: 'Expense', label: 'Charges (6xx)' },
  { value: 'Income', label: 'Produits (7xx)' },
]

const normalBalanceOptions = [
  { value: 'Debit', label: 'Débit' },
  { value: 'Credit', label: 'Crédit' },
]

const searchInputClass = 'rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

interface AccountForm {
  code: string
  name: string
  accountClass: string
  normalBalance: string
  isThirdParty: boolean
  parentCode: string
}

function emptyForm(): AccountForm {
  return { code: '', name: '', accountClass: 'Expense', normalBalance: 'Debit', isThirdParty: false, parentCode: '' }
}

export function ChartOfAccountsPage() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<ChartAccountDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ChartAccountDto | null>(null)
  const [form, setForm] = useState<AccountForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ChartAccountDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  function load() {
    setLoading(true)
    accountingApi.getChartOfAccounts()
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm())
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(a: ChartAccountDto) {
    setEditTarget(a)
    setForm({
      code: a.code,
      name: a.name,
      accountClass: a.accountClass,
      normalBalance: a.normalBalance,
      isThirdParty: a.isThirdParty,
      parentCode: a.parentCode ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      setFormError('Code et intitulé sont obligatoires.')
      return
    }
    setSaving(true); setFormError(null)
    try {
      if (editTarget) {
        await accountingApi.updateChartAccount(editTarget.id, {
          name: form.name.trim(),
          isThirdParty: form.isThirdParty,
          parentCode: form.parentCode.trim() || null,
        })
        toast('Compte mis à jour.')
      } else {
        await accountingApi.createChartAccount({
          code: form.code.trim(),
          name: form.name.trim(),
          accountClass: form.accountClass,
          normalBalance: form.normalBalance,
          isThirdParty: form.isThirdParty,
          parentCode: form.parentCode.trim() || null,
        })
        toast('Compte créé.')
      }
      setModalOpen(false)
      load()
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erreur lors de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await accountingApi.deleteChartAccount(deleteTarget.id)
      toast('Compte supprimé.', 'info')
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur lors de la suppression.', 'error')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  // Auto-detect normalBalance from accountClass
  function handleClassChange(cls: string) {
    const isCredit = cls === 'Liability' || cls === 'Equity' || cls === 'Income' || cls === 'ThirdParty'
    setForm(f => ({ ...f, accountClass: cls, normalBalance: isCredit ? 'Credit' : 'Debit' }))
  }

  const filtered = accounts.filter(a =>
    a.code.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase()),
  )

  const grouped = filtered.reduce<Record<string, ChartAccountDto[]>>((acc, a) => {
    const cls = a.accountClass
    if (!acc[cls]) acc[cls] = []
    acc[cls].push(a)
    return acc
  }, {})

  const classOrder = ['Asset', 'Liability', 'Equity', 'ThirdParty', 'Expense', 'Income']

  // Parent account options for the form (only root accounts = no parentCode)
  const parentOptions = accounts
    .filter(a => !a.parentCode)
    .map(a => ({ value: a.code, label: `${a.code} — ${a.name}` }))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{accounts.length} comptes SYSCOHADA</p>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Nouveau compte</Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher un compte…"
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

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {classOrder.filter(cls => grouped[cls]?.length).map(cls => (
            <div key={cls} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <BookOpen size={15} className="text-gray-400" />
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${classBadge[cls] ?? 'bg-gray-100 text-gray-600'}`}>
                  {classLabel[cls] ?? cls}
                </span>
                <span className="text-xs text-gray-400">{grouped[cls].length} comptes</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Code</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Intitulé</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Sens</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Tiers</th>
                    <th className="px-5 py-2.5 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grouped[cls].map(a => (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-2.5">
                        <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${a.parentCode ? 'bg-gray-50 text-gray-600' : 'bg-brand-50 text-brand-700'}`}>{a.code}</span>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`text-gray-800 ${a.parentCode ? 'pl-4 text-gray-500' : 'font-medium'}`}>{a.parentCode ? '↳ ' : ''}{a.name}</span>
                        {a.isSystem && <span className="ml-2 text-xs text-gray-300">système</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`text-xs font-medium ${a.normalBalance === 'Debit' ? 'text-blue-600' : 'text-orange-600'}`}>
                          {a.normalBalance === 'Debit' ? 'Débit' : 'Crédit'}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        {a.isThirdParty && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">Tiers</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        {!a.isSystem && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(a)}
                              title="Modifier"
                              className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(a)}
                              title="Supprimer"
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? `Modifier — ${editTarget.code}` : 'Nouveau compte'}
      >
        <div className="flex flex-col gap-4">
          {formError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code *"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="ex : 6011"
              disabled={!!editTarget}
            />
            <Input
              label="Intitulé *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex : Achats de marchandises"
            />
          </div>

          {!editTarget && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Classe *"
                value={form.accountClass}
                onChange={handleClassChange}
                options={classOptions}
              />
              <Select
                label="Sens normal *"
                value={form.normalBalance}
                onChange={v => setForm(f => ({ ...f, normalBalance: v }))}
                options={normalBalanceOptions}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Compte parent (optionnel)</label>
              <select
                value={form.parentCode}
                onChange={e => setForm(f => ({ ...f, parentCode: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">— Compte racine —</option>
                {parentOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={form.isThirdParty}
                onChange={e => setForm(f => ({ ...f, isThirdParty: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">Compte tiers (client/fournisseur)</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>
              {editTarget ? 'Enregistrer les modifications' : 'Créer le compte'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer le compte"
        message={deleteTarget ? `Supprimer le compte ${deleteTarget.code} — ${deleteTarget.name} ?` : ''}
        loading={deleting}
        confirmLabel="Supprimer"
        confirmVariant="danger"
      />
    </div>
  )
}
