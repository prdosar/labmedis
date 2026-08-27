// ─── Generic ────────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  token: string
  userId: number
  userName: string
  email: string
  fullName: string | null
  roles: string[]
  expiresAt: string
}

// ─── Simple reference entities ───────────────────────────────────────────────

export interface SimpleEntity {
  id: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string | null
}

export type CategoryDto = SimpleEntity
export type ProductFormDto = SimpleEntity
export type DosageDto = SimpleEntity
export type PackagingDto = SimpleEntity
export type CountryDto = SimpleEntity
export type CustomsRegimeDto = SimpleEntity
export type TransportTypeDto = SimpleEntity
export type AccessDto = SimpleEntity

// ─── TherapeuticClass ────────────────────────────────────────────────────────

export interface TherapeuticClassDto {
  id: number
  categoryId: number
  categoryName: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string | null
}

// ─── Warehouse ───────────────────────────────────────────────────────────────

export interface WarehouseDto {
  id: number
  code: string
  name: string
  address: string | null
  city: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface SupplierDto {
  id: number
  name: string
  address: string | null
  postalBox: string | null
  phone: string | null
  email: string | null
  countryId: number | null
  countryName: string | null
  contactPerson: string | null
  createdAt: string
  updatedAt: string | null
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface CustomerDto {
  id: number
  code: string | null
  name: string
  address: string | null
  postalBox: string | null
  phone: string | null
  email: string | null
  city: string | null
  countryId: number | null
  countryName: string | null
  contactPerson: string | null
  createdAt: string
  updatedAt: string | null
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface ProductDto {
  id: number
  code: string
  designation: string
  cipCode: string | null
  activeIngredient: string | null
  warehouseId: number
  warehouseName: string | null
  categoryId: number
  categoryName: string | null
  therapeuticClassId: number
  therapeuticClassName: string | null
  productFormId: number | null
  productFormName: string | null
  dosageId: number | null
  dosageName: string | null
  packagingId: number | null
  packagingName: string | null
  originCountryId: number | null
  originCountryName: string | null
  customsRegimeId: number | null
  customsRegimeName: string | null
  supplierId: number
  supplierName: string | null
  createdAt: string
  updatedAt: string | null
}

// ─── Purchase ────────────────────────────────────────────────────────────────

export interface PurchaseLineDto {
  id: number
  productId: number
  productCode: string | null
  productDesignation: string | null
  lotNumber: string | null
  expiryDate: string | null
  quantity: number
  unitPurchasePriceXof: number
  costPrice: number
  sellingPrice: number
}

export interface PurchaseDto {
  id: number
  reference: string
  purchaseDate: string
  arrivalDate: string | null
  supplierId: number
  supplierName: string | null
  purchaseCurrency: number
  exchangeRateToXof: number
  commissionCoefficient: number
  freightCoefficient: number
  transitCoefficient: number
  transferFeesCoefficient: number
  defaultMarginCoefficient: number
  containerReference: string | null
  notes: string | null
  lines: PurchaseLineDto[]
  createdAt: string
  updatedAt: string | null
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface InvoiceLineDto {
  id: number
  productId: number
  productCode: string | null
  productDesignation: string | null
  quantity: number
  unitPriceHt: number
  discountPercent: number
  tvaPercent: number
  totalHt: number
  totalTtc: number
}

export interface InvoiceDto {
  id: number
  reference: string
  invoiceDate: string
  dueDate: string | null
  customerId: number
  customerName: string | null
  status: string
  subtotalHt: number
  totalTva: number
  totalTtc: number
  amountPaid: number
  balanceDue: number
  notes: string | null
  lines: InvoiceLineDto[]
  createdAt: string
  updatedAt: string | null
}

// ─── Delivery ────────────────────────────────────────────────────────────────

export interface DeliveryLineDto {
  id: number
  productId: number
  productCode: string | null
  productDesignation: string | null
  quantity: number
}

export interface DeliveryDto {
  id: number
  reference: string
  deliveryDate: string
  invoiceId: number
  invoiceReference: string | null
  status: string
  deliveryAddress: string | null
  recipientName: string | null
  carrierName: string | null
  trackingNumber: string | null
  notes: string | null
  lines: DeliveryLineDto[]
  createdAt: string
  updatedAt: string | null
}

// ─── StockMovement ───────────────────────────────────────────────────────────

export interface StockMovementDto {
  id: number
  productId: number
  productCode: string | null
  productDesignation: string | null
  warehouseId: number
  warehouseName: string | null
  purchaseLineId: number
  lotNumber: string | null
  movementType: string
  quantity: number
  movementDate: string
  reference: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: number
  userName: string
  email: string
  fullName: string | null
  isActive: boolean
  roles: string[]
}
