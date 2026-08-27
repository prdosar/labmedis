import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

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
