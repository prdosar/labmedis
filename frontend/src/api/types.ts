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
  mustChangePassword: boolean
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
export interface PackagingDto extends SimpleEntity { unitsPerPackaging: number }
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

export interface CustomerOrderLotLineDto {
  id: number
  customerOrderLineId: number
  productId: number
  productCode: string
  productDesignation: string
  purchaseLineId: number
  lotNumber: string
  expirationDate: string | null   // DateOnly serialized as "YYYY-MM-DD"
  quantityAllocated: number
  warehouseId: number
  warehouseName: string | null
}

export interface SuggestedLotItemDto {
  purchaseLineId: number
  lotNumber: string
  expirationDate: string | null
  availableStock: number
  suggestedQuantity: number
}

export interface CustomerOrderSuggestedLotDto {
  orderLineId: number
  productId: number
  productCode: string
  productDesignation: string
  lineQuantity: number
  lots: SuggestedLotItemDto[]
}

export interface CustomerOrderLineDto {
  id: number
  productId: number
  productCode: string
  productDesignation: string
  quantity: number
  quantityRequested: number
  unitsPerCarton: number
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
  deliveryDelayId: number | null
  deliveryDelayLabel: string | null
  paymentDelayId: number | null
  paymentDelayLabel: string | null
  customerOrderReference: string | null
  lines: CustomerOrderLineDto[]
  lotLines: CustomerOrderLotLineDto[]
  createdAt: string
  updatedAt: string | null
}

export interface DelayDto {
  id: number
  label: string
  sortOrder: number
  isActive: boolean
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
  unitsPerCarton: number
  availableStock: number
  unitPriceHt: number
  unitCostPrice: number
  lineTotalHt: number
  lineTotalTva: number
  lineTotalTtc: number
  lineTotalCost: number
  lineProfit: number
}

export interface ProductStockInfoDto {
  availableStock: number
  unitsPerCarton: number
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

export interface PurchaseLineLotDto {
  id: number
  lotNumber: string
  expirationDate: string | null
  quantityRemaining: number
  warehouseId: number
  warehouseName: string | null
}

export interface ReturnableLotDto {
  purchaseLineId: number
  lotNumber: string
  expirationDate: string | null
  warehouseId: number
  warehouseName: string | null
  quantityDelivered: number
  quantityAlreadyReturned: number
  quantityReturnable: number
}

export interface ReturnableInvoiceLineDto {
  invoiceLineId: number
  productId: number
  productCode: string
  productDesignation: string
  quantityInvoiced: number
  quantityAlreadyReturned: number
  quantityReturnable: number
  unitPriceHt: number
  discountPercent: number
  tvaRate: number
  availableLots: ReturnableLotDto[]
}

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
  packagingUnitsPerPackaging: number | null
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
  marginRate: number
  calculatedSellingPriceHt: number
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
  purchaseId: number
  productId: number
  productCode: string | null
  productDesignation: string | null
  lotNumber: string
  expirationDate: string | null
  quantityCartons: number
  quantityLostCartons: number
  unitsPerCarton: number
  goodUnitsReceived: number
  quantityRemaining: number
  unitPurchasePrice: number
  unitPurchasePriceXof: number
  unitCostPriceXof: number
  targetSellingPriceHt: number
  transports: PurchaseLineTransportDto[]
}

export interface PurchaseLineTransportDto {
  id: number
  transportTypeId: number
  transportTypeCode: string | null
  transportTypeName: string | null
  quantity: number
}

export interface PurchaseChargeDto {
  id: number
  purchaseId: number
  chargeType: string
  description: string
  amountXof: number
  chargeDate: string
  reference: string | null
  debitAccountCode: string
  creditAccountCode: string
  journalEntryId: number | null
  notes: string | null
  createdAt: string
}

export interface PurchaseSummaryDto {
  id: number
  reference: string
  arrivalDate: string
  transportMode: string
  supplierId: number
  supplierName: string
  containerReference: string | null
  totalFobXof: number
  totalChargesXof: number
  totalGoodUnits: number
  totalLostCartons: number
  lineCount: number
  notes: string | null
  createdAt: string
  charges: PurchaseChargeDto[]
}

export interface PurchaseDto {
  id: number
  reference: string
  purchaseDate: string
  arrivalDate: string | null
  supplierOrderId: number | null
  transportMode: string
  supplierId: number
  supplierName: string | null
  purchaseCurrency: number
  exchangeRateToXof: number
  containerReference: string | null
  notes: string | null
  totalFobXof: number
  totalChargesXof: number
  totalGoodUnits: number
  totalLostCartons: number
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

export interface InvoicePaymentDto {
  id: number
  invoiceId: number
  amount: number
  paymentDate: string
  paymentMethod: string | null
  reference: string | null
  notes: string | null
  attachmentFileName: string | null
  attachmentUrl: string | null
  createdAt: string
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
  payments: InvoicePaymentDto[]
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
  reason: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

// ─── SupplierReturn ──────────────────────────────────────────────────────────

export interface SupplierReturnLineDto {
  id: number
  productId: number
  productCode: string | null
  productDesignation: string | null
  purchaseLineId: number | null
  lotNumber: string | null
  warehouseId: number
  warehouseName: string | null
  quantityReturned: number
  unitCostForeign: number
  unitCostXof: number
  lineTotalForeign: number
  lineTotalXof: number
  stockMovementId: number | null
}

export interface SupplierReturnDto {
  id: number
  reference: string
  supplierId: number
  supplierName: string
  purchaseId: number | null
  purchaseReference: string | null
  returnDate: string
  currency: string
  exchangeRateToXof: number
  totalAmountForeign: number
  totalAmountXof: number
  reason: string | null
  notes: string | null
  status: string
  supplierCreditNoteId: number | null
  supplierCreditNoteReference: string | null
  createdAt: string
  lines: SupplierReturnLineDto[]
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
  /** Rattacher cette OD à un arrivage → crée automatiquement une PurchaseCharge */
  purchaseId?: number | null
  /** Type de charge requis si purchaseId est renseigné */
  chargeType?: string | null
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
  packagingUnitsPerPackaging: number | null
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

export interface SupplierProformaRejectionDto {
  id: number
  proformaReference: string
  rejectedAt: string
  reason: string
  createdAt: string
}

export interface SupplierInvoicePaymentDto {
  id: number
  supplierInvoiceId: number
  amount: number
  paymentDate: string
  paymentMethod: string | null
  reference: string | null
  notes: string | null
  attachmentFileName: string | null
  attachmentUrl: string | null
  createdAt: string
}

export interface SupplierInvoiceDto {
  id: number
  supplierOrderId: number
  supplierId: number
  supplierName: string
  invoiceReference: string
  invoiceDate: string
  dueDate: string | null
  totalAmountForeign: number
  currency: string
  exchangeRateToXof: number
  totalAmountXof: number
  discountAmountForeign: number | null
  discountAmountXof: number
  advanceAmountForeign: number | null
  advanceAmountXof: number
  netAmountXof: number
  status: string
  amountPaid: number
  balanceDue: number
  notes: string | null
  payments: SupplierInvoicePaymentDto[]
  createdAt: string
}

export interface CustomerOrderDocumentDto {
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
  supplierCountryId: number | null
  supplierCountryName: string | null
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
  proformaRejections: SupplierProformaRejectionDto[]
  invoice: SupplierInvoiceDto | null
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
  invoiceReference: string | null
  invoiceStatus: string | null
  invoiceTotalXof: number | null
  invoiceAmountPaid: number | null
  invoiceBalanceDue: number | null
  createdAt: string
  updatedAt: string | null
}

// ─── Avoir fournisseur ────────────────────────────────────────────────────────

export interface SupplierCreditNoteDto {
  id: number
  reference: string
  supplierOrderId: number
  orderReference: string
  supplierInvoiceId: number | null
  invoiceReference: string | null
  purchaseId: number
  purchaseReference: string
  supplierId: number
  supplierName: string
  creditNoteDate: string
  amountForeign: number
  currency: string
  exchangeRateToXof: number
  amountXof: number
  lostBoxesCount: number
  status: string
  notes: string | null
  resolvedAt: string | null
  createdAt: string
}

// ─── Avoir client ────────────────────────────────────────────────────────────

export interface CustomerCreditNoteLineDto {
  id: number
  productId: number
  productCode: string | null
  productDesignation: string | null
  warehouseId: number
  warehouseName: string | null
  purchaseLineId: number | null
  lotNumber: string | null
  quantityReturned: number
  unitPriceHt: number
  discountPercent: number
  tvaRate: number
  lineTotalHt: number
  lineTva: number
  lineTotalTtc: number
  stockMovementId: number | null
}

export interface CustomerCreditNoteDto {
  id: number
  reference: string
  customerId: number
  customerName: string
  invoiceId: number | null
  invoiceReference: string | null
  creditNoteDate: string
  totalAmountHt: number
  totalTva: number
  totalAmountTtc: number
  status: string
  notes: string | null
  resolvedAt: string | null
  createdAt: string
  lines: CustomerCreditNoteLineDto[]
}

// ─── Achats généraux ─────────────────────────────────────────────────────────

export interface GeneralPurchaseDto {
  id: number
  dateAchat: string
  reference: string | null
  fournisseurNom: string
  designation: string
  categorie: string
  montantHT: number
  tauxTVA: number
  montantTTC: number
  modePaiement: string
  estPaye: boolean
  datePaiement: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

// ─── Charges d'exploitation ──────────────────────────────────────────────────

export interface OperatingExpenseDto {
  id: number
  date: string
  categorie: string
  description: string
  montant: number
  modePaiement: string
  reference: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

export interface ExpenseBudgetDto {
  id: number
  annee: number
  mois: number
  categorie: string
  montantBudget: number
}

export interface BudgetVsActuelDto {
  categorie: string
  budget: number
  realise: number
  ecart: number
  pctConsomme: number
}

// ─── Immobilisations & Amortissements ────────────────────────────────────────

export interface DepreciationLineDto {
  annee: number
  baseAmortissable: number
  dotationAnnuelle: number
  cumulAmortissements: number
  valeurNette: number
}

export interface FixedAssetDto {
  id: number
  code: string
  designation: string
  categorie: string
  dateAcquisition: string
  coutAcquisition: number
  valeurResiduelle: number
  dureeVieAns: number
  methode: string
  tauxLineaire: number
  coefficientDegressif: number
  status: string
  notes: string | null
  tableau: DepreciationLineDto[]
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
  mustChangePassword: boolean
  roles: string[]
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface NotificationItemDto {
  type: 'PendingCustomerOrder' | 'PendingSupplierOrder' | 'ExpiringProduct' | 'LowStock' | string
  severity: 'info' | 'warning' | 'danger' | string
  title: string
  message: string
  link: string | null
  date: string | null
}

export interface NotificationSummaryDto {
  totalCount: number
  pendingCustomerOrdersCount: number
  pendingSupplierOrdersCount: number
  expiringProductsCount: number
  lowStockCount: number
  items: NotificationItemDto[]
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface InventoryMovementCellDto {
  units: number
  cartons: number
}

export interface InventoryReportRowDto {
  productId: number
  productCode: string
  productDesignation: string
  supplierId: number | null
  supplierName: string | null
  unitsPerCarton: number
  currentStockUnits: number
  currentStockCartons: number
  netMovementUnits: number
  netMovementCartons: number
  movementsByType: Record<string, InventoryMovementCellDto>
}

export interface InventoryReportTotalsDto {
  totalCurrentStockUnits: number
  totalCurrentStockCartons: number
  totalNetMovementUnits: number
  totalNetMovementCartons: number
}

export interface InventoryReportDto {
  dateFrom: string
  dateTo: string
  supplierId: number | null
  supplierName: string | null
  movementType: string | null
  rows: InventoryReportRowDto[]
  totals: InventoryReportTotalsDto
}
