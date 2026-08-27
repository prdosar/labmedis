import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import type { ProductDto, CategoryDto, TherapeuticClassDto, WarehouseDto, SupplierDto, ProductFormDto, DosageDto, PackagingDto, CountryDto, CustomsRegimeDto } from '../../api/types'
import { productsApi, categoriesApi, therapeuticClassesApi, warehousesApi, suppliersApi, productFormsApi, dosagesApi, packagingsApi, countriesApi, customsRegimesApi } from '../../api/endpoints'
import { usePagedData } from '../../hooks/usePagedData'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import { DataTable } from '../../components/ui/DataTable'
import { Pagination } from '../../components/ui/Pagination'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'

interface Form {
  code: string; designation: string; cipCode: string; activeIngredient: string
  warehouseId: string; categoryId: string; therapeuticClassId: string
  productFormId: string; dosageId: string; packagingId: string
  originCountryId: string; customsRegimeId: string; supplierId: string
}
const empty: Form = { code: '', designation: '', cipCode: '', activeIngredient: '', warehouseId: '', categoryId: '', therapeuticClassId: '', productFormId: '', dosageId: '', packagingId: '', originCountryId: '', customsRegimeId: '', supplierId: '' }

export function ProductsPage() {
  const { toast } = useToast()
  const fetcher = useCallback((p: number, s: number) => productsApi.getAll(p, s), [])
  const { data, loading, page, setPage, refresh } = usePagedData({ fetcher })

  const [refs, setRefs] = useState<{
    categories: CategoryDto[]; therapeuticClasses: TherapeuticClassDto[]
    warehouses: WarehouseDto[]; suppliers: SupplierDto[]; productForms: ProductFormDto[]
    dosages: DosageDto[]; packagings: PackagingDto[]; countries: CountryDto[]; customsRegimes: CustomsRegimeDto[]
  }>({ categories: [], therapeuticClasses: [], warehouses: [], suppliers: [], productForms: [], dosages: [], packagings: [], countries: [], customsRegimes: [] })

  useEffect(() => {
    Promise.allSettled([
      categoriesApi.getForSelect(), therapeuticClassesApi.getForSelect(), warehousesApi.getForSelect(),
      suppliersApi.getForSelect(), productFormsApi.getForSelect(), dosagesApi.getForSelect(),
      packagingsApi.getForSelect(), countriesApi.getForSelect(), customsRegimesApi.getForSelect(),
    ]).then(([cats, tc, wh, sup, pf, dos, pak, cou, cr]) => {
      setRefs({
        categories: cats.status === 'fulfilled' ? cats.value : [],
        therapeuticClasses: tc.status === 'fulfilled' ? tc.value : [],
        warehouses: wh.status === 'fulfilled' ? wh.value : [],
        suppliers: sup.status === 'fulfilled' ? sup.value : [],
        productForms: pf.status === 'fulfilled' ? pf.value : [],
        dosages: dos.status === 'fulfilled' ? dos.value : [],
        packagings: pak.status === 'fulfilled' ? pak.value : [],
        countries: cou.status === 'fulfilled' ? cou.value : [],
        customsRegimes: cr.status === 'fulfilled' ? cr.value : [],
      })
    })
  }, [])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductDto | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true) }
  function openEdit(item: ProductDto) {
    setEditing(item)
    setForm({
      code: item.code, designation: item.designation, cipCode: item.cipCode ?? '', activeIngredient: item.activeIngredient ?? '',
      warehouseId: String(item.warehouseId), categoryId: String(item.categoryId), therapeuticClassId: String(item.therapeuticClassId),
      productFormId: item.productFormId ? String(item.productFormId) : '', dosageId: item.dosageId ? String(item.dosageId) : '',
      packagingId: item.packagingId ? String(item.packagingId) : '', originCountryId: item.originCountryId ? String(item.originCountryId) : '',
      customsRegimeId: item.customsRegimeId ? String(item.customsRegimeId) : '', supplierId: String(item.supplierId),
    })
    setFormError(null); setModalOpen(true)
  }

  const setF = (k: keyof Form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.code.trim() || !form.designation.trim() || !form.warehouseId || !form.categoryId || !form.therapeuticClassId || !form.supplierId) {
      setFormError('Code, désignation, entrepôt, catégorie, classe thérapeutique et fournisseur sont obligatoires.')
      return
    }
    setSaving(true); setFormError(null)
    try {
      const dto = {
        code: form.code.trim(), designation: form.designation.trim(),
        cipCode: form.cipCode || null, activeIngredient: form.activeIngredient || null,
        warehouseId: Number(form.warehouseId), categoryId: Number(form.categoryId),
        therapeuticClassId: Number(form.therapeuticClassId), supplierId: Number(form.supplierId),
        productFormId: form.productFormId ? Number(form.productFormId) : null,
        dosageId: form.dosageId ? Number(form.dosageId) : null,
        packagingId: form.packagingId ? Number(form.packagingId) : null,
        originCountryId: form.originCountryId ? Number(form.originCountryId) : null,
        customsRegimeId: form.customsRegimeId ? Number(form.customsRegimeId) : null,
      }
      if (editing) { await productsApi.update(editing.id, dto); toast('Produit mis à jour.') }
      else { await productsApi.create(dto); toast('Produit créé.') }
      setModalOpen(false); refresh()
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Erreur.') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await productsApi.delete(deleteTarget.id); toast('Produit supprimé.', 'info'); setDeleteTarget(null); refresh() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Impossible.', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data ? `${data.totalCount} produit(s)` : ''}</p>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Ajouter</Button>
      </div>

      <DataTable
        rows={data?.items ?? []} loading={loading} keyExtractor={r => r.id}
        emptyMessage="Aucun produit."
        columns={[
          { key: 'code', header: 'Code', width: 'w-28', render: r => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.code}</span> },
          { key: 'designation', header: 'Désignation', render: r => (
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{r.designation}</p>
              {r.activeIngredient && <p className="text-xs text-gray-400 mt-0.5">{r.activeIngredient}</p>}
            </div>
          )},
          { key: 'categoryName', header: 'Catégorie', render: r => (
            <span className="inline-flex items-center px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">{r.categoryName ?? '—'}</span>
          )},
          { key: 'therapeuticClassName', header: 'Classe', render: r => <span className="text-sm text-gray-600">{r.therapeuticClassName ?? '—'}</span> },
          { key: 'supplierName', header: 'Fournisseur', render: r => <span className="text-sm text-gray-600">{r.supplierName ?? '—'}</span> },
          { key: 'warehouseName', header: 'Entrepôt', render: r => <span className="text-xs text-gray-500">{r.warehouseName ?? '—'}</span> },
        ]}
        actions={row => (<>
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
          <button onClick={async () => { await productsApi.restore(row.id); toast('Restauré.'); refresh() }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><RotateCcw size={14} /></button>
        </>)}
      />
      {data && <Pagination page={page} totalPages={data.totalPages} totalCount={data.totalCount} pageSize={data.pageSize} onPageChange={setPage} />}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Modifier — ${editing.designation}` : 'Nouveau produit'} size="xl">
        <div className="flex flex-col gap-4">
          {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code *" value={form.code} onChange={e => setF('code')(e.target.value)} placeholder="LMD-PROD-001" />
            <Input label="Code CIP" value={form.cipCode} onChange={e => setF('cipCode')(e.target.value)} />
          </div>
          <Input label="Désignation *" value={form.designation} onChange={e => setF('designation')(e.target.value)} placeholder="Nom commercial du produit" />
          <Input label="Principe actif" value={form.activeIngredient} onChange={e => setF('activeIngredient')(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Catégorie *" value={form.categoryId} onChange={setF('categoryId')} options={refs.categories.map(c => ({ value: c.id, label: c.name }))} placeholder="Sélectionner…" />
            <Select label="Classe thérapeutique *" value={form.therapeuticClassId} onChange={setF('therapeuticClassId')} options={refs.therapeuticClasses.map(c => ({ value: c.id, label: c.name }))} placeholder="Sélectionner…" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select label="Forme pharm." value={form.productFormId} onChange={setF('productFormId')} options={refs.productForms.map(c => ({ value: c.id, label: c.name }))} placeholder="—" />
            <Select label="Dosage" value={form.dosageId} onChange={setF('dosageId')} options={refs.dosages.map(c => ({ value: c.id, label: c.name }))} placeholder="—" />
            <Select label="Conditionnement" value={form.packagingId} onChange={setF('packagingId')} options={refs.packagings.map(c => ({ value: c.id, label: c.name }))} placeholder="—" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Fournisseur *" value={form.supplierId} onChange={setF('supplierId')} options={refs.suppliers.map(s => ({ value: s.id, label: s.name }))} placeholder="Sélectionner…" />
            <Select label="Entrepôt *" value={form.warehouseId} onChange={setF('warehouseId')} options={refs.warehouses.map(w => ({ value: w.id, label: w.name }))} placeholder="Sélectionner…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Pays d'origine" value={form.originCountryId} onChange={setF('originCountryId')} options={refs.countries.map(c => ({ value: c.id, label: c.name }))} placeholder="—" />
            <Select label="Régime douanier" value={form.customsRegimeId} onChange={setF('customsRegimeId')} options={refs.customsRegimes.map(c => ({ value: c.id, label: c.name }))} placeholder="—" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Supprimer le produit" message={`Supprimer "${deleteTarget?.designation}" ?`} loading={deleting} />
    </div>
  )
}
