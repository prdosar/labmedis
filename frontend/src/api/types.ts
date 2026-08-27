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
export interface CountryDto extends SimpleEntity { isoCode: string | null }
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
  code: string
  name: string
  address: string | null
  postalBox: string | null
  phone: string | null
  email: string | null
  countryId: number | null
  countryName: string | null
  contactPerson: string | null
  isDeleted: boolean
  createdAt: string
  updatedAt: string | null
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface CustomerDto {
  id: number
  code: string
  name: string
  address: string | null
  postalBox: string | null
  phone: string | null
  email: string | null
  city: string | null
  countryId: number | null
  countryName: string | null
  contactPerson: string | null
  balance: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string | null
}

// ─── CustomerOrder ───────────────────────────────────────────────────────────

export interface CustomerOrderLineDto {
  id: number
  productId: number
  productCode: string
  productDesignation: string
  quantity: number
  availableStock: number
  unitPriceHt: number
  unitCostPrice: number
  lineTotalHt: number
  lineTotalTva: number
  lineTotalTtc: number
  lineTotalCost: number
  lineProfit: number
}

export interface CustomerOrderDto {
  id: number
  reference: string
  orderDate: string
  customerId: number
  customerName: string
  customerBalance: number
  status: string
  vatApplied: boolean
  currency: string
  notes: string | null
  totalHt: number
  totalTva: number
  totalTtc: number
  totalCost: number
  profit: number
  invoiceId: number | null
  invoiceReference: string | null
  lines: CustomerOrderLineDto[]
  createdAt: string
  updatedAt: string | null
}

export interface CustomerOrderSummaryDto {
  id: number
  reference: string
  orderDate: string
  customerId: number
  customerName: string
  customerBalance: number
  status: string
  vatApplied: boolean
  currency: string
  totalHt: number
  totalTva: number
  totalTtc: number
  totalCost: number
  profit: number
  invoiceId: number | null
  invoiceReference: string | null
  createdAt: string
  updatedAt: string | null
}

export interface CustomerOrderPreviewLineDto {
  productId: number
  productCode: string
  productDesignation: string
  quantity: number
  availableStock: number
  unitPriceHt: number
  unitCostPrice: number
  lineTotalHt: number
  lineTotalTva: number
  lineTotalTtc: number
  lineTotalCost: number
  lineProfit: number
}

export interface CustomerOrderPreviewDto {
  lines: CustomerOrderPreviewLineDto[]
  totalHt: number
  totalTva: number
  totalTtc: number
  totalCost: number
  profit: number
}

export interface CustomerStatsDto {
  customerId: number
  balance: number
  totalOrderCount: number
  monthlyRevenueHt: number
  monthlyRevenueTtc: number
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
  stockQuantity: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string | null
}

export interface ProductLotDto {
  purchaseLineId: number
  purchaseReference: string
  purchaseDate: string
  supplierName: string | null
  lotNumber: string
  expirationDate: string | null
  quantityOrdered: number
  quantityRemaining: number
  unitPurchasePriceXof: number
  unitCostPriceXof: number
  targetSellingPriceHt: number
}

export interface ProductInvoiceLineDto {
  invoiceId: number
  invoiceReference: string
  invoiceDate: string
  customerName: string | null
  invoiceStatus: string
  quantity: number
  unitPriceHt: number
  discountPercent: number
  totalHt: number
  totalTtc: number
}

export interface ProductStockMovementDto {
  id: number
  movementDate: string
  movementType: string
  quantity: number
  lotNumber: string | null
  warehouseName: string | null
  reference: string | null
  notes: string | null
}

export interface ProductHistoryDto {
  product: ProductDto
  pendingDeliveryToClients: number
  pendingFromSuppliers: number
  purchaseLines: ProductLotDto[]
  invoiceLines: ProductInvoiceLineDto[]
  stockMovements: ProductStockMovementDto[]
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

// ─── Accounting ──────────────────────────────────────────────────────────────

export interface ChartAccountDto {
  id: number
  code: string
  name: string
  accountClass: string
  normalBalance: string
  isThirdParty: boolean
  isSystem: boolean
  parentCode: string | null
  createdAt: string
}

export interface JournalLineDto {
  id: number
  accountId: number
  accountCode: string
  accountName: string
  label: string | null
  debitAmount: number
  creditAmount: number
  customerId: number | null
  customerName: string | null
  supplierId: number | null
  supplierName: string | null
}

export interface JournalEntryDto {
  id: number
  journalCode: string
  entryDate: string
  reference: string
  description: string
  sourceType: string
  sourceId: number | null
  isPosted: boolean
  attachmentFileName: string | null
  attachmentPath: string | null
  lines: JournalLineDto[]
  createdAt: string
}

export interface TrialBalanceLineDto {
  accountId: number
  accountCode: string
  accountName: string
  accountClass: string
  totalDebit: number
  totalCredit: number
  balance: number
}

export interface ThirdPartyLedgerEntryDto {
  journalEntryId: number
  entryDate: string
  journalCode: string
  reference: string
  description: string
  debitAmount: number
  creditAmount: number
  runningBalance: number
}

export interface ThirdPartyLedgerDto {
  thirdPartyType: string
  thirdPartyId: number
  thirdPartyName: string
  totalDebit: number
  totalCredit: number
  balance: number
  entries: ThirdPartyLedgerEntryDto[]
}

export interface PnLLineDto {
  accountId: number
  accountCode: string
  accountName: string
  amount: number
}

export interface PnLDto {
  income: PnLLineDto[]
  expenses: PnLLineDto[]
  totalIncome: number
  totalExpenses: number
  netResult: number
}

export interface ManualJournalLineInput {
  accountId: number
  label: string | null
  debitAmount: number
  creditAmount: number
  customerId: number | null
  supplierId: number | null
}

export interface ManualJournalEntryInput {
  journalCode: string
  entryDate: string
  reference: string
  description: string
  attachmentFileName: string | null
  attachmentPath: string | null
  lines: ManualJournalLineInput[]
}

// ─── SupplierOrder ───────────────────────────────────────────────────────────

export interface SupplierOrderLineDto {
  id: number
  productId: number
  productCode: string
  productDesignation: string
  packagingName: string | null
  dosageName: string | null
  quantity: number
  orderUnit: string
  unitsPerCarton: number | null
  unitFobPrice: number | null
}

export interface SupplierOrderDocumentDto {
  id: number
  documentType: string
  fileName: string
  fileUrl: string
  fileSize: number
  uploadedAt: string
}

export interface SupplierOrderDto {
  id: number
  reference: string
  orderDate: string
  supplierId: number
  supplierName: string
  status: string
  currency: string
  notes: string | null
  proformaReference: string | null
  proformaFilePath: string | null
  proformaReceivedAt: string | null
  containerReference: string | null
  freightAmount: number | null
  paymentTerms: string | null
  brand: string | null
  origin: string | null
  expectedShippingDate: string | null
  lines: SupplierOrderLineDto[]
  documents: SupplierOrderDocumentDto[]
  createdAt: string
  updatedAt: string | null
}

export interface SupplierOrderSummaryDto {
  id: number
  reference: string
  orderDate: string
  supplierId: number
  supplierName: string
  status: string
  currency: string
  lineCount: number
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
