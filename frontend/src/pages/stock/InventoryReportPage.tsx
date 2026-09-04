import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Globe, Printer, RefreshCw, Search } from 'lucide-react'
import { reportsApi, suppliersApi } from '../../api/endpoints'
import type { InventoryReportDto, SupplierDto } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../contexts/ToastContext'
import { ApiError } from '../../api/client'
import logo from '../../assets/logo.png'

// ── Constants ────────────────────────────────────────────────────────────────

const MOVEMENT_TYPES = [
  { value: '',                label: 'Tous les types' },
  { value: 'PurchaseEntry',   label: 'Entrée achat' },
  { value: 'SaleExit',        label: 'Sortie vente' },
  { value: 'Return',          label: 'Retour client' },
  { value: 'SupplierReturn',  label: 'Retour fournisseur' },
  { value: 'Loss',            label: 'Perte' },
  { value: 'Adjustment',      label: 'Ajustement' },
  { value: 'Transfer',        label: 'Transfert' },
]

const MOVEMENT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  MOVEMENT_TYPES.filter(t => t.value).map(t => [t.value, t.label]),
)

type ReportStyle = 'france-lait' | 'detailed'

const REPORT_STYLES: { value: ReportStyle; label: string; hint: string }[] = [
  { value: 'france-lait', label: 'Format France Lait (2 tableaux)', hint: 'État du stock + quantités mouvementées, sur le modèle du PDF fournisseur.' },
  { value: 'detailed',    label: 'Détaillé (1 ligne par produit)',   hint: '1 colonne par type de mouvement + stock actuel.' },
]

const inputCls =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white'

// ── Helpers ──────────────────────────────────────────────────────────────────

function firstOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function today() { return new Date().toISOString().slice(0, 10) }
function fmtDateFr(iso: string) {
  try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return iso }
}
function fmtInt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}
function fmtCartons(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)
}

// ── Print layout (France Lait style) ─────────────────────────────────────────

function AvoirPrintLayout({ report }: { report: InventoryReportDto }) {
  const titleSuffix = report.supplierName
    ? `DES PRODUITS ${report.supplierName.toUpperCase()}`
    : 'DES PRODUITS'
  const dateToStr = fmtDateFr(report.dateTo)
  const dateFromStr = fmtDateFr(report.dateFrom)
  const periodLabel = report.dateFrom === report.dateTo
    ? `AU ${dateToStr}`
    : `DU ${dateFromStr} AU ${dateToStr}`
  const movementSubtitle = report.movementType
    ? `QUANTITÉS MOUVEMENTÉES (${MOVEMENT_TYPE_LABEL[report.movementType]?.toUpperCase() ?? report.movementType})`
    : 'QUANTITÉS MOUVEMENTÉES'

  const rowsWithMovement = report.rows.filter(r => r.netMovementUnits !== 0)

  const cellH: React.CSSProperties = { border: '1px solid #333', padding: '5px 8px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold', backgroundColor: '#f5f5f5' }
  const cellB: React.CSSProperties = { border: '1px solid #333', padding: '4px 8px', fontSize: '10pt' }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', padding: '15mm 15mm', color: '#000' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <img src={logo} alt="LabMedis" style={{ height: '50px', objectFit: 'contain' }} />
        <div style={{ flex: 1, fontSize: '9pt', lineHeight: '1.4' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>LABMEDIS SARL</div>
          <div>380 Bd de la Kara — 08 BP 80859 Lomé, Togo</div>
          <div>Tél : +228 92 26 99 33 / +228 72 14 08 47</div>
        </div>
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '13pt', fontWeight: 'bold', textDecoration: 'underline', margin: '10px 0 15px' }}>
        ÉTAT DU STOCK {titleSuffix}<br/>
        DANS LES MAGASINS DE LABMEDIS {periodLabel}
      </h1>

      {/* Table 1 : État du stock */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ ...cellH, textAlign: 'left', width: '55%' }}>Produits</th>
            <th style={{ ...cellH, width: '120px' }}>Qtés magasin (unités)</th>
            <th style={{ ...cellH, width: '120px' }}>Qtés magasin (cartons)</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map(r => (
            <tr key={r.productId}>
              <td style={{ ...cellB, textAlign: 'left' }}>{r.productDesignation}</td>
              <td style={{ ...cellB, textAlign: 'center' }}>{fmtInt(r.currentStockUnits)}</td>
              <td style={{ ...cellB, textAlign: 'center' }}>{fmtCartons(r.currentStockCartons)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cellB, textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
            <td style={{ ...cellB, textAlign: 'center', fontWeight: 'bold' }}>{fmtInt(report.totals.totalCurrentStockUnits)}</td>
            <td style={{ ...cellB, textAlign: 'center', fontWeight: 'bold' }}>{fmtCartons(report.totals.totalCurrentStockCartons)}</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', textDecoration: 'underline', margin: '15px 0' }}>
        {movementSubtitle} {periodLabel.replace(/^AU/, 'AU')}
      </h2>

      {/* Table 2 : quantités mouvementées sur la période */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...cellH, textAlign: 'left', width: '55%' }}>Produits</th>
            <th style={{ ...cellH, width: '120px' }}>Qtés (unités)</th>
            <th style={{ ...cellH, width: '120px' }}>Qtés (cartons)</th>
          </tr>
        </thead>
        <tbody>
          {rowsWithMovement.length === 0 ? (
            <tr><td colSpan={3} style={{ ...cellB, textAlign: 'center', fontStyle: 'italic' }}>Aucun mouvement sur la période.</td></tr>
          ) : rowsWithMovement.map(r => (
            <tr key={r.productId}>
              <td style={{ ...cellB, textAlign: 'left' }}>{r.productDesignation}</td>
              <td style={{ ...cellB, textAlign: 'center' }}>{fmtInt(Math.abs(r.netMovementUnits))}</td>
              <td style={{ ...cellB, textAlign: 'center' }}>{fmtCartons(Math.abs(r.netMovementCartons))}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cellB, textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
            <td style={{ ...cellB, textAlign: 'center', fontWeight: 'bold' }}>{fmtInt(Math.abs(report.totals.totalNetMovementUnits))}</td>
            <td style={{ ...cellB, textAlign: 'center', fontWeight: 'bold' }}>{fmtCartons(Math.abs(report.totals.totalNetMovementCartons))}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: '18px', fontSize: '9pt', color: '#666', textAlign: 'right' }}>
        Édité le {new Date().toLocaleDateString('fr-FR')} — LabMedis SARL
      </div>
    </div>
  )
}

// ── Exports ──────────────────────────────────────────────────────────────────

function downloadBlob(content: string | Blob, filename: string, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvEscape(v: unknown): string {
  const s = String(v ?? '')
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function buildCsv(report: InventoryReportDto): string {
  const headers = [
    'Code', 'Désignation', 'Fournisseur', 'Unités/carton',
    'Stock actuel (unités)', 'Stock actuel (cartons)',
    'Net mouvement (unités)', 'Net mouvement (cartons)',
    'Entrée achat', 'Sortie vente', 'Retour client', 'Retour fournisseur', 'Perte', 'Ajustement', 'Transfert',
  ]
  const typeKeys = ['PurchaseEntry', 'SaleExit', 'Return', 'SupplierReturn', 'Loss', 'Adjustment', 'Transfer']
  const rows = report.rows.map(r => [
    r.productCode, r.productDesignation, r.supplierName ?? '', r.unitsPerCarton,
    r.currentStockUnits, r.currentStockCartons,
    r.netMovementUnits, r.netMovementCartons,
    ...typeKeys.map(k => r.movementsByType[k]?.units ?? 0),
  ])
  return [headers, ...rows].map(row => row.map(csvEscape).join(';')).join('\n')
}

function buildHtml(report: InventoryReportDto, printBlockHtml: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Rapport d'inventaire ${report.dateFrom} → ${report.dateTo}</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#000}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:5px 8px;font-size:10pt}th{background:#f5f5f5;font-weight:bold;text-align:center}h1{text-align:center;font-size:13pt;text-decoration:underline}h2{text-align:center;font-size:11pt;text-decoration:underline;margin:15px 0}</style>
</head><body>${printBlockHtml}</body></html>`
}

function buildExcelXml(report: InventoryReportDto): string {
  // SpreadsheetML 2003 : Excel l'ouvre directement, pas besoin de dépendance externe
  const rowsXml = report.rows.map(r => `
    <Row>
      <Cell><Data ss:Type="String">${escapeXml(r.productCode)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(r.productDesignation)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(r.supplierName ?? '')}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.unitsPerCarton}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.currentStockUnits}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.currentStockCartons}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.netMovementUnits}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.netMovementCartons}</Data></Cell>
      ${['PurchaseEntry','SaleExit','Return','SupplierReturn','Loss','Adjustment','Transfer'].map(k =>
        `<Cell><Data ss:Type="Number">${r.movementsByType[k]?.units ?? 0}</Data></Cell>`
      ).join('')}
    </Row>`).join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#F5F5F5" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Rapport inventaire">
  <Table>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Code</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Désignation</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Fournisseur</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Unités/carton</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Stock (unités)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Stock (cartons)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Net mouvement (unités)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Net mouvement (cartons)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Entrée achat</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Sortie vente</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Retour client</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Retour fourn.</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Perte</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Ajustement</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Transfert</Data></Cell>
   </Row>${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === '"' ? '&quot;' : '&apos;')
}

// ── Main page ────────────────────────────────────────────────────────────────

export function InventoryReportPage() {
  const { toast } = useToast()

  const [dateFrom, setDateFrom] = useState(firstOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const [supplierId, setSupplierId] = useState('')
  const [movementType, setMovementType] = useState('')
  const [style, setStyle] = useState<ReportStyle>('france-lait')

  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [report, setReport] = useState<InventoryReportDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    suppliersApi.getForSelect().then(setSuppliers).catch(() => {})
  }, [])

  useEffect(() => {
    if (!printing) return
    const timer = setTimeout(() => window.print(), 100)
    const onAfter = () => setPrinting(false)
    window.addEventListener('afterprint', onAfter)
    return () => { clearTimeout(timer); window.removeEventListener('afterprint', onAfter) }
  }, [printing])

  async function generate() {
    setLoading(true)
    try {
      const r = await reportsApi.getInventory({
        dateFrom, dateTo,
        supplierId: supplierId ? Number(supplierId) : undefined,
        movementType: movementType || undefined,
      })
      setReport(r)
      if (r.rows.length === 0) toast('Aucun mouvement trouvé sur la période.', 'info')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur lors de la génération du rapport.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function filenameBase() {
    const supPart = report?.supplierName ? `_${report.supplierName.replace(/\s+/g, '-')}` : ''
    return `rapport-inventaire${supPart}_${report?.dateFrom}_${report?.dateTo}`
  }

  function exportCsv() {
    if (!report) return
    downloadBlob('﻿' + buildCsv(report), `${filenameBase()}.csv`, 'text/csv;charset=utf-8')
  }
  function exportExcel() {
    if (!report) return
    downloadBlob(buildExcelXml(report), `${filenameBase()}.xls`, 'application/vnd.ms-excel')
  }
  function exportHtml() {
    if (!report) return
    const printBlock = document.getElementById('inventory-report-print')?.innerHTML ?? ''
    downloadBlob(buildHtml(report, printBlock), `${filenameBase()}.html`, 'text/html;charset=utf-8')
  }
  function exportPdf() {
    if (!report) return
    setPrinting(true)
  }

  const rowsWithMovement = useMemo(
    () => report?.rows.filter(r => r.netMovementUnits !== 0) ?? [],
    [report],
  )

  return (
    <>
      {/* ── Print area (hidden on screen) ── */}
      <div className={printing ? 'hidden print:block' : 'hidden'}>
        <div id="inventory-report-print">
          {report && <AvoirPrintLayout report={report} />}
        </div>
      </div>

      {/* ── Screen layout ── */}
      <div className="flex flex-col gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Rapport d'inventaire</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Produits mouvementés sur la période, avec leur stock actuel. Exportable en Excel, CSV, HTML ou PDF.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Du *</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Au *</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
          </div>
          <div className="min-w-52">
            <label className="block text-xs font-medium text-gray-500 mb-1">Fournisseur</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={`w-full ${inputCls}`}>
              <option value="">Tous</option>
              {suppliers.map(s => (
                <option key={s.id} value={String(s.id)}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">Type de mouvement</label>
            <select value={movementType} onChange={e => setMovementType(e.target.value)} className={`w-full ${inputCls}`}>
              {MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="min-w-64">
            <label className="block text-xs font-medium text-gray-500 mb-1">Format de rapport</label>
            <select value={style} onChange={e => setStyle(e.target.value as ReportStyle)} className={`w-full ${inputCls}`}>
              {REPORT_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <Button onClick={generate} loading={loading} icon={<Search size={14} />}>
            Générer
          </Button>
        </div>

        <p className="text-xs text-gray-500 -mt-1">{REPORT_STYLES.find(s => s.value === style)?.hint}</p>

        {/* Toolbar exports */}
        {report && report.rows.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 mr-2">Exporter :</span>
            <button onClick={exportPdf}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 hover:bg-red-100">
              <Printer size={14}/> PDF
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-sm text-green-700 hover:bg-green-100">
              <FileSpreadsheet size={14}/> Excel
            </button>
            <button onClick={exportCsv}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-700 hover:bg-blue-100">
              <FileText size={14}/> CSV
            </button>
            <button onClick={exportHtml}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-sm text-purple-700 hover:bg-purple-100">
              <Globe size={14}/> HTML
            </button>
            <button onClick={generate}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw size={14}/> Rafraîchir
            </button>
          </div>
        )}

        {/* Screen render */}
        {loading && (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Chargement…</div>
        )}

        {!loading && report && report.rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400 gap-1 bg-white border border-gray-200 rounded-xl">
            <FileText size={22} className="text-gray-300" />
            <span>Aucun produit n'a eu de mouvement sur la période sélectionnée.</span>
          </div>
        )}

        {!loading && report && report.rows.length > 0 && style === 'france-lait' && (
          <FranceLaitScreenView report={report} rowsWithMovement={rowsWithMovement} />
        )}

        {!loading && report && report.rows.length > 0 && style === 'detailed' && (
          <DetailedScreenView report={report} />
        )}
      </div>
    </>
  )
}

// ── Screen views ─────────────────────────────────────────────────────────────

function FranceLaitScreenView({ report, rowsWithMovement }: {
  report: InventoryReportDto
  rowsWithMovement: InventoryReportDto['rows']
}) {
  const title = report.supplierName
    ? `État du stock des produits ${report.supplierName}`
    : `État du stock`
  const movementTitle = report.movementType
    ? `Quantités mouvementées (${MOVEMENT_TYPE_LABEL[report.movementType] ?? report.movementType})`
    : `Quantités mouvementées`
  const periodLabel = report.dateFrom === report.dateTo
    ? `au ${fmtDateFr(report.dateTo)}`
    : `du ${fmtDateFr(report.dateFrom)} au ${fmtDateFr(report.dateTo)}`

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <p className="text-xs text-gray-400">Stock actuel {periodLabel}</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2.5 text-left">Produits</th>
              <th className="px-4 py-2.5 text-right w-32">Qtés (unités)</th>
              <th className="px-4 py-2.5 text-right w-32">Qtés (cartons)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {report.rows.map(r => (
              <tr key={r.productId} className="hover:bg-gray-50/50">
                <td className="px-4 py-2 text-gray-800">{r.productDesignation}
                  <span className="ml-2 text-xs text-gray-400 font-mono">{r.productCode}</span>
                </td>
                <td className="px-4 py-2 text-right font-mono">{fmtInt(r.currentStockUnits)}</td>
                <td className="px-4 py-2 text-right font-mono">{fmtCartons(r.currentStockCartons)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-2 text-right">TOTAL</td>
              <td className="px-4 py-2 text-right font-mono">{fmtInt(report.totals.totalCurrentStockUnits)}</td>
              <td className="px-4 py-2 text-right font-mono">{fmtCartons(report.totals.totalCurrentStockCartons)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">{movementTitle}</h3>
          <p className="text-xs text-gray-400">Sur la période {periodLabel}</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2.5 text-left">Produits</th>
              <th className="px-4 py-2.5 text-right w-32">Qtés (unités)</th>
              <th className="px-4 py-2.5 text-right w-32">Qtés (cartons)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rowsWithMovement.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400 italic">Aucun mouvement sur la période.</td></tr>
            ) : rowsWithMovement.map(r => (
              <tr key={r.productId} className="hover:bg-gray-50/50">
                <td className="px-4 py-2 text-gray-800">{r.productDesignation}
                  <span className="ml-2 text-xs text-gray-400 font-mono">{r.productCode}</span>
                </td>
                <td className="px-4 py-2 text-right font-mono">{fmtInt(Math.abs(r.netMovementUnits))}</td>
                <td className="px-4 py-2 text-right font-mono">{fmtCartons(Math.abs(r.netMovementCartons))}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-2 text-right">TOTAL</td>
              <td className="px-4 py-2 text-right font-mono">{fmtInt(Math.abs(report.totals.totalNetMovementUnits))}</td>
              <td className="px-4 py-2 text-right font-mono">{fmtCartons(Math.abs(report.totals.totalNetMovementCartons))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DetailedScreenView({ report }: { report: InventoryReportDto }) {
  const typeKeys = ['PurchaseEntry', 'SaleExit', 'Return', 'SupplierReturn', 'Loss', 'Adjustment', 'Transfer']
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 text-left">Produit</th>
              <th className="px-3 py-2.5 text-left">Fournisseur</th>
              <th className="px-3 py-2.5 text-right w-20">Stock u.</th>
              <th className="px-3 py-2.5 text-right w-20">Stock c.</th>
              {typeKeys.map(k => (
                <th key={k} className="px-3 py-2.5 text-right w-20">{MOVEMENT_TYPE_LABEL[k]}</th>
              ))}
              <th className="px-3 py-2.5 text-right w-24">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {report.rows.map(r => (
              <tr key={r.productId} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 text-gray-800">
                  {r.productDesignation}
                  <div className="text-xs text-gray-400 font-mono">{r.productCode}</div>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.supplierName ?? '—'}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtInt(r.currentStockUnits)}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-500">{fmtCartons(r.currentStockCartons)}</td>
                {typeKeys.map(k => {
                  const cell = r.movementsByType[k]
                  return (
                    <td key={k} className="px-3 py-2 text-right font-mono text-xs">
                      {cell?.units ? fmtInt(cell.units) : <span className="text-gray-300">—</span>}
                    </td>
                  )
                })}
                <td className={`px-3 py-2 text-right font-mono font-semibold ${r.netMovementUnits > 0 ? 'text-green-700' : r.netMovementUnits < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                  {r.netMovementUnits > 0 ? '+' : ''}{fmtInt(r.netMovementUnits)}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-3 py-2 text-right" colSpan={2}>TOTAL</td>
              <td className="px-3 py-2 text-right font-mono">{fmtInt(report.totals.totalCurrentStockUnits)}</td>
              <td className="px-3 py-2 text-right font-mono text-gray-500">{fmtCartons(report.totals.totalCurrentStockCartons)}</td>
              <td colSpan={typeKeys.length}></td>
              <td className="px-3 py-2 text-right font-mono">{report.totals.totalNetMovementUnits > 0 ? '+' : ''}{fmtInt(report.totals.totalNetMovementUnits)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
