import { useState, useRef } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import type { ChartAccountDto } from '../../api/types'

interface AccountComboboxProps {
  accounts: ChartAccountDto[]
  /** Current value — account code (e.g. "6142") or account id as string, depending on valueField */
  value: string
  onChange: (value: string) => void
  /** Which field of ChartAccountDto to use as the option value. Default: 'code' */
  valueField?: 'code' | 'id'
  placeholder?: string
  /** Optional pre-filter on the accounts list (e.g. only class 6) */
  filter?: (a: ChartAccountDto) => boolean
}

export function AccountCombobox({
  accounts,
  value,
  onChange,
  valueField = 'code',
  placeholder = 'Code ou libellé…',
  filter,
}: AccountComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const pool = filter ? accounts.filter(filter) : accounts

  const selected = pool.find(a =>
    valueField === 'id' ? String(a.id) === value : a.code === value
  )

  const displayValue = open
    ? query
    : selected ? `${selected.code} — ${selected.name}` : ''

  const filtered = (query.length > 0
    ? pool.filter(a =>
        a.code.toLowerCase().includes(query.toLowerCase()) ||
        a.name.toLowerCase().includes(query.toLowerCase())
      )
    : pool
  ).slice(0, 40)

  function handleFocus() { setQuery(''); setOpen(true) }

  function handleBlur(e: React.FocusEvent) {
    if (ref.current?.contains(e.relatedTarget as Node)) return
    setOpen(false)
    setQuery('')
  }

  function handleSelect(acc: ChartAccountDto) {
    onChange(valueField === 'id' ? String(acc.id) : acc.code)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-3 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {value
          ? <button tabIndex={-1} onMouseDown={handleClear} className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5"><X size={13} /></button>
          : <ChevronDown size={13} className="absolute right-2 text-gray-400 pointer-events-none" />
        }
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {filtered.length === 0
            ? <p className="px-4 py-3 text-sm text-gray-400 italic">Aucun compte trouvé.</p>
            : filtered.map(a => {
                const val = valueField === 'id' ? String(a.id) : a.code
                return (
                  <button
                    key={a.id}
                    tabIndex={0}
                    onMouseDown={() => handleSelect(a)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 flex items-center gap-3 ${val === value ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-800'}`}
                  >
                    <span className="font-mono text-xs text-brand-600 shrink-0 w-14">{a.code}</span>
                    <span className="truncate">{a.name}</span>
                  </button>
                )
              })
          }
          {filtered.length === 40 && (
            <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 italic">
              Affichage limité — affinez votre recherche
            </p>
          )}
        </div>
      )}
    </div>
  )
}
