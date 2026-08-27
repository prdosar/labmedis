import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Search, X, Paperclip } from 'lucide-react'
import type { ChartAccountDto, JournalEntryDto, ManualJournalEntryInput } from '../../api/types'
import { accountingApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import { useEffect } from 'react'

const journalBadge: Record<string, string> = {
  JV: 'bg-green-50 text-green-700',
  JA: 'bg-blue-50 text-blue-700',
  JT: 'bg-purple-50 text-purple-700',
  JOD: 'bg-orange-50 text-orange-700',
}
const journalLabel: Record<string, string> = {
  JV: 'Journal Ventes',
  JA: 'Journal Achats',
  JT: 'Journal Trésorerie',
  JOD: 'Opérations Diverses',
}
const sourceLabel: Record<string, string> = {
  InvoiceIssued: 'Facture émise',
  InvoicePayment: 'Règlement facture',
  InvoiceCancelled: 'Annulation facture',
  PurchaseArrival: 'Arrivage fournisseur',
  SupplierPayment: 'Règlement fournisseur',
  StockLoss: 'Perte de stock',
  Manual: 'Saisie manuelle',
}

const xof = (v: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(v) + ' XOF'
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const selectClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

interface LineForm { accountId: string; label: string; debitAmount: string; creditAmount: string }

const emptyLine = (): LineForm => ({ accountId: '', label: '', debitAmount: '', creditAmount: '' })

function ExpandedEntry({ entry }: { entry: JournalEntryDto }) {
  const totalDebit = entry.lines.reduce((s, l) => s + l.debitAmount, 0)
  const totalCredit = entry.lines.reduce((s, l) => s + l.creditAmount, 0)
  return (
    <div className="px-4 pb-4 pt-2 bg-gray-50/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 font-medium uppercase tracking-wide">
            <th className="text-left py-1.5 w-20">Compte</th>
            <th className="text-left py-1.5">Libellé</th>
            <th className="text-right py-1.5 w-32">Débit</th>
            <th className="text-right py-1.5 w-32">Crédit</th>
            <th className="text-left py-1.5 w-28">Tiers</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entry.lines.map(l => (
            <tr key={l.id}>
              <td className="py-1.5"><span className="font-mono text-brand-700">{l.accountCode}</span></td>
              <td className="py-1.5 text-gray-600">{l.label ?? l.accountName}</td>
              <td className="py-1.5 text-right font-medium text-gray-800">{l.debitAmount > 0 ? xof(l.debitAmount) : ''}</td>
              <td className="py-1.5 text-right font-medium text-gray-800">{l.creditAmount > 0 ? xof(l.creditAmount) : ''}</td>
              <td className="py-1.5 text-gray-500">{l.customerName ?? l.supplierName ?? ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-200 font-semibold text-gray-700">
          <tr>
            <td colSpan={2} className="py-1.5 text-xs uppercase text-gray-400">Total</td>
            <td className="py-1.5 text-right">{xof(totalDebit)}</td>
            <td className="py-1.5 text-right">{xof(totalCredit)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      {entry.attachmentFileName && (
        <div className="mt-2 flex items-center gap-2 text-xs text-brand-600">
          <Paperclip size={12} />
          <span>Pièce : {entry.attachmentFileName}</span>
        </div>
      )}
    </div>
  )
}

export function JournalPage() {
  const { toast } = useToast()

  const [journalFilter, setJournalFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetcher = useCallback(
    (p: number, s: number) => accountingApi.getJournal({
      page: p, size: s,
      journalCode: journalFilter || undefined,
      from: from || undefined,
      to: to || undefined,
      search: search || undefined,
    }),
    [journalFilter, from, to, search],
  )
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher })

  // Manual entry modal
  const [modalOpen, setModalOpen] = useState(false)
  const [accounts, setAccounts] = useState<ChartAccountDto[]>([])
  const [form, setForm] = useState({ journalCode: 'JOD', entryDate: new Date().toISOString().slice(0, 10), reference: '', description: '', attachmentFileName: '', attachmentPath: '' })
  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openModal() {
    setFormError(null)
    setForm({ journalCode: 'JOD', entryDate: new Date().toISOString().slice(0, 10), reference: '', description: '', attachmentFileName: '', attachmentPath: '' })
    setLines([emptyLine(), emptyLine()])
    if (accounts.length === 0) accountingApi.getChartOfAccounts().then(setAccounts).catch(() => {})
    setModalOpen(true)
  }

  function addLine() { setLines(l => [...l, emptyLine()]) }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)) }
  function setLine(i: number, patch: Partial<LineForm>) { setLines(l => l.map((x, idx) => idx === i ? { ...x, ...patch } : x)) }

  async function handleSave() {
    if (!form.reference.trim() || !form.description.trim()) { setFormError('Référence et description obligatoires.'); return }
    const inputLines = lines.filter(l => l.accountId)
    if (inputLines.length < 2) { setFormError('Au moins 2 lignes requises.'); return }
    const totalD = inputLines.reduce((s, l) => s + (parseFloat(l.debitAmount) || 0), 0)
    const totalC = inputLines.reduce((s, l) => s + (parseFloat(l.creditAmount) || 0), 0)
    if (Math.abs(totalD - totalC) > 0.01) { setFormError(`L'écriture n'est pas équilibrée : Débit ${xof(totalD)} ≠ Crédit ${xof(totalC)}.`); return }

    setSaving(true); setFormError(null)
    try {
      const dto: ManualJournalEntryInput = {
        journalCode: form.journalCode,
        entryDate: form.entryDate,
        reference: form.reference.trim(),
        description: form.description.trim(),
        attachmentFileName: form.attachmentFileName || null,
        attachmentPath: form.attachmentPath || null,
        lines: inputLines.map(l => ({
          accountId: Number(l.accountId),
          label: l.label || null,
          debitAmount: parseFloat(l.debitAmount) || 0,
          creditAmount: parseFloat(l.creditAmount) || 0,
          customerId: null,
          supplierId: null,
        })),
      }
      await accountingApi.postManualEntry(dto)
      toast('Écriture comptable enregistrée.')
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur.') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${data.totalCount} écriture(s)` : ''}</p>
        <Button onClick={openModal} icon={<Plus size={15} />}>Saisie manuelle</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Référence, description…" value={searchInput} onChange={e => setSearchInput(e.target.value)} className={`${selectClass} pl-9 w-full`} />
        </div>
        <select value={journalFilter} onChange={e => setJournalFilter(e.target.value)} className={selectClass}>
          <option value="">Tous les journaux</option>
          <option value="JV">Journal Ventes (JV)</option>
          <option value="JA">Journal Achats (JA)</option>
          <option value="JT">Journal Trésorerie (JT)</option>
          <option value="JOD">Opérations Diverses (JOD)</option>
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={selectClass} title="Date de début" />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={selectClass} title="Date de fin" />
        </div>
        {(journalFilter || from || to || searchInput) && (
          <button onClick={() => { setJournalFilter(''); setFrom(''); setTo(''); setSearchInput(''); setSearch('') }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
            <X size={14} /> Effacer
          </button>
        )}
      </div>

      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucune écriture comptable."
        columns={[
          { key: 'entryDate', header: 'Date', width: 'w-28', render: r => <span className="text-sm text-gray-600">{fmtDate(r.entryDate)}</span> },
          { key: 'journalCode', header: 'Journal', width: 'w-28', render: r => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${journalBadge[r.journalCode] ?? 'bg-gray-100 text-gray-600'}`}>
              {r.journalCode}
            </span>
          )},
          { key: 'reference', header: 'Référence', render: r => (
            <div>
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{r.reference}</span>
              {r.attachmentFileName && <span title={r.attachmentFileName}><Paperclip size={11} className="inline ml-1.5 text-gray-400" /></span>}
            </div>
          )},
          { key: 'description', header: 'Description', render: r => (
            <div>
              <p className="text-sm text-gray-800">{r.description}</p>
              <p className="text-xs text-gray-400">{sourceLabel[r.sourceType] ?? r.sourceType}</p>
            </div>
          )},
          { key: 'debit', header: 'Débit total', width: 'w-36', render: r => (
            <span className="text-sm font-medium text-gray-700">{xof(r.lines.reduce((s, l) => s + l.debitAmount, 0))}</span>
          )},
        ]}
        actions={row => (
          <button
            onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Voir les lignes"
          >
            {expanded === row.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      />

      {/* Expanded detail rows */}
      {(data?.items ?? []).filter(r => r.id === expanded).map(r => (
        <div key={r.id} className="rounded-xl border border-brand-100 bg-white shadow-sm -mt-3">
          <div className="px-4 py-2 text-xs font-semibold text-brand-700 border-b border-brand-100">
            Écriture {r.reference} — {journalLabel[r.journalCode] ?? r.journalCode}
          </div>
          <ExpandedEntry entry={r} />
        </div>
      ))}

      {data && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}

      {/* Manual entry modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Saisie d'écriture manuelle" size="xl">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}

          <div className="grid grid-cols-3 gap-4">
            <Select label="Journal *" value={form.journalCode} onChange={v => setForm(f => ({ ...f, journalCode: v }))}
              options={[
                { value: 'JV', label: 'Journal Ventes (JV)' },
                { value: 'JA', label: 'Journal Achats (JA)' },
                { value: 'JT', label: 'Journal Trésorerie (JT)' },
                { value: 'JOD', label: 'Opérations Diverses (JOD)' },
              ]} />
            <Input label="Date *" type="date" value={form.entryDate} onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))} />
            <Input label="Référence *" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="REF-001" />
          </div>
          <Input label="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Libellé de l'écriture" />

          {/* Attachment */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom du fichier joint" value={form.attachmentFileName} onChange={e => setForm(f => ({ ...f, attachmentFileName: e.target.value }))} placeholder="facture.pdf (optionnel)" />
            <Input label="Chemin / URL" value={form.attachmentPath} onChange={e => setForm(f => ({ ...f, attachmentPath: e.target.value }))} placeholder="Chemin vers le fichier (optionnel)" />
          </div>

          {/* Lines */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
              Lignes de l'écriture
            </div>
            <div className="divide-y divide-gray-100">
              {lines.map((l, i) => (
                <div key={i} className="px-4 py-3 grid grid-cols-5 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Compte</label>
                    <select value={l.accountId} onChange={e => setLine(i, { accountId: e.target.value })} className={`${selectClass} w-full`}>
                      <option value="">Choisir…</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Libellé</label>
                    <input type="text" value={l.label} onChange={e => setLine(i, { label: e.target.value })} className={`${selectClass} w-full`} placeholder="Libellé ligne" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Débit XOF</label>
                    <input type="number" min="0" step="1" value={l.debitAmount} onChange={e => setLine(i, { debitAmount: e.target.value })} className={`${selectClass} w-full`} placeholder="0" />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Crédit XOF</label>
                      <input type="number" min="0" step="1" value={l.creditAmount} onChange={e => setLine(i, { creditAmount: e.target.value })} className={`${selectClass} w-full`} placeholder="0" />
                    </div>
                    {lines.length > 2 && (
                      <button onClick={() => removeLine(i)} className="mb-0.5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
              <button onClick={addLine} className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
                <Plus size={12} /> Ajouter une ligne
              </button>
              <div className="text-xs text-gray-500">
                Débit : <span className="font-semibold">{xof(lines.reduce((s, l) => s + (parseFloat(l.debitAmount) || 0), 0))}</span>
                {' | '}
                Crédit : <span className="font-semibold">{xof(lines.reduce((s, l) => s + (parseFloat(l.creditAmount) || 0), 0))}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
