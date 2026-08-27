import { useEffect, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  rows?: number
}

const baseClass = `w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
  placeholder:text-gray-400 shadow-sm transition
  focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20
  disabled:bg-gray-50 disabled:text-gray-500`

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input className={`${baseClass} ${error ? 'border-red-400' : ''} ${className}`} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, rows = 3, className = '', ...props }: TextAreaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        rows={rows}
        className={`${baseClass} resize-y ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SelectProps {
  label?: string
  error?: string
  options: { value: string | number; label: string }[]
  value?: string | number
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export function Select({ label, error, options, value, onChange, placeholder, disabled, required }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}{required && ' *'}</label>}
      <select
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        required={required}
        className={`${baseClass} ${error ? 'border-red-400' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── ComboSelect ─────────────────────────────────────────────────────────────

interface ComboSelectProps {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ComboSelect({ label, error, options, value, onChange, placeholder = 'Rechercher…', disabled }: ComboSelectProps) {
  const selectedLabel = options.find(o => o.value === value)?.label ?? ''
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => { setHighlighted(0) }, [query])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function select(opt: { value: string; label: string }) {
    onChange?.(opt.value)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); return }
    if (e.key === 'ArrowDown') { setHighlighted(h => Math.min(h + 1, filtered.length - 1)); e.preventDefault() }
    if (e.key === 'ArrowUp') { setHighlighted(h => Math.max(h - 1, 0)); e.preventDefault() }
    if (e.key === 'Enter' && open && filtered[highlighted]) { select(filtered[highlighted]); e.preventDefault() }
  }

  const displayValue = open ? query : selectedLabel

  return (
    <div ref={containerRef} className="flex flex-col gap-1 relative">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={displayValue}
        placeholder={open || !selectedLabel ? placeholder : undefined}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={`${baseClass} ${error ? 'border-red-400' : ''} cursor-pointer`}
        autoComplete="off"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Aucun résultat</div>
          ) : filtered.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onPointerDown={e => { e.preventDefault(); select(opt) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === highlighted ? 'bg-brand-50 text-brand-700' : 'text-gray-800 hover:bg-gray-50'
              } ${opt.value === value ? 'font-medium' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
