import type { ReactNode } from 'react'

export type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange'

const variants: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
  orange: 'bg-orange-100 text-orange-700',
}

export function Badge({ children, variant = 'gray' }: { children: ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

export function invoiceStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    Draft: { label: 'Brouillon', variant: 'gray' },
    Issued: { label: 'Émise', variant: 'blue' },
    PartiallyPaid: { label: 'Part. payée', variant: 'orange' },
    Paid: { label: 'Payée', variant: 'green' },
    Cancelled: { label: 'Annulée', variant: 'red' },
  }
  const s = map[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function supplierOrderStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    Brouillon:     { label: 'Brouillon',      variant: 'gray'   },
    Envoyée:       { label: 'Envoyée',         variant: 'blue'   },
    ProformaReçue: { label: 'Proforma reçue',  variant: 'yellow' },
    Convertie:     { label: 'Convertie',       variant: 'green'  },
    Annulée:       { label: 'Annulée',         variant: 'red'    },
  }
  const s = map[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function deliveryStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    Draft: { label: 'Brouillon', variant: 'gray' },
    Shipped: { label: 'Expédiée', variant: 'blue' },
    Delivered: { label: 'Livrée', variant: 'green' },
    Cancelled: { label: 'Annulée', variant: 'red' },
  }
  const s = map[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
