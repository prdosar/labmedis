import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  width?: string
  className?: string
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  keyExtractor: (row: T) => string | number
  emptyMessage?: string
  actions?: (row: T) => ReactNode
  rowClassName?: (row: T) => string
}

export function DataTable<T>({ columns, rows, loading, keyExtractor, emptyMessage = 'Aucune donnée', actions, rowClassName }: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.width ?? ''}`}
              >
                {col.header}
              </th>
            ))}
            {actions && (
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="py-16 text-center text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin text-brand-500" />
                  <span>Chargement…</span>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="py-16 text-center text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl">📋</span>
                  <span className="text-sm">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={keyExtractor(row)}
                className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'} ${rowClassName ? rowClassName(row) : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.className ?? ''}`}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
