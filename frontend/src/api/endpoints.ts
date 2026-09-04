import { api } from './client'
import type {
  AccessDto,
  BudgetVsActuelDto,
  CategoryDto,
  ChartAccountDto,
  CountryDto,
  CustomerDto,
  CustomerOrderDocumentDto,
  CustomerOrderDto,

  CustomerOrderPreviewDto,
  CustomerOrderSuggestedLotDto,
  CustomerOrderSummaryDto,
  CustomerStatsDto,
  CustomsRegimeDto,
  DeliveryDto,
  DepreciationLineDto,
  DosageDto,
  ExpenseBudgetDto,
  FixedAssetDto,
  GeneralPurchaseDto,
  InvoiceDto,
  JournalEntryDto,
  OperatingExpenseDto,
  ManualJournalEntryInput,
  PackagingDto,
  PagedResult,
  PnLDto,
  ProductDto,
  ProductFormDto,
  ProductHistoryDto,
  PurchaseChargeDto,
  PurchaseDto,
  PurchaseLineDto,
  PurchaseLineLotDto,
  PurchaseSummaryDto,
  DelayDto,
  SimpleEntity,
  StockMovementDto,
  SupplierDto,
  CustomerCreditNoteDto,
  CustomerCreditNoteLineDto,
  SupplierCreditNoteDto,
  SupplierInvoiceDto,
  SupplierOrderDocumentDto,
  SupplierOrderDto,
  SupplierOrderSummaryDto,
  SupplierReturnDto,
  TherapeuticClassDto,
  ThirdPartyLedgerDto,
  TokenResponse,
  TransportTypeDto,
  TrialBalanceLineDto,
  UserDto,
  WarehouseDto,
  ProductStockInfoDto,
} from './types'

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { username, password }),
  forgotPassword: (email: string) =>
    api.post<void>('/auth/forgot-password', { email }),
  resetPassword: (email: string, token: string, newPassword: string) =>
    api.post<void>('/auth/reset-password', { email, token, newPassword }),
}

// ─── Simple entity factory ────────────────────────────────────────────────────

function simpleApi<T extends SimpleEntity>(path: string) {
  return {
    getAll: (page = 1, size = 10) =>
      api.get<PagedResult<T>>(`${path}?page=${page}&size=${size}`),
    getForSelect: () => api.get<T[]>(`${path}/select`),
    getById: (id: number) => api.get<T>(`${path}/${id}`),
    create: (dto: { name: string; description?: string | null }) =>
      api.post<T>(path, dto),
    update: (id: number, dto: { name: string; description?: string | null }) =>
      api.put<T>(`${path}/${id}`, dto),
    delete: (id: number) => api.delete(`${path}/${id}`),
    restore: (id: number) => api.post<void>(`${path}/${id}/restore`),
  }
}

export const categoriesApi = simpleApi<CategoryDto>('/categories')
export const productFormsApi = simpleApi<ProductFormDto>('/product-forms')
export const dosagesApi = simpleApi<DosageDto>('/dosages')
export const packagingsApi = {
  ...simpleApi<PackagingDto>('/packagings'),
  create: (dto: { name: string; description?: string | null; unitsPerPackaging?: number }) =>
    api.post<PackagingDto>('/packagings', dto),
  update: (id: number, dto: { name: string; description?: string | null; unitsPerPackaging?: number }) =>
    api.put<PackagingDto>(`/packagings/${id}`, dto),
}
export const countriesApi = simpleApi<CountryDto>('/countries')
export const customsRegimesApi = simpleApi<CustomsRegimeDto>('/customs-regimes')
export const transportTypesApi = simpleApi<TransportTypeDto>('/transport-types')
export const accessesApi = simpleApi<AccessDto>('/accesses')

// ─── TherapeuticClass ────────────────────────────────────────────────────────

export const therapeuticClassesApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<TherapeuticClassDto>>(`/therapeutic-classes?page=${page}&size=${size}`),
  getForSelect: () => api.get<TherapeuticClassDto[]>('/therapeutic-classes/select'),
  getByCategory: (categoryId: number, page = 1, size = 10) =>
    api.get<PagedResult<TherapeuticClassDto>>(
      `/therapeutic-classes/by-category/${categoryId}?page=${page}&size=${size}`,
    ),
  getById: (id: number) => api.get<TherapeuticClassDto>(`/therapeutic-classes/${id}`),
  create: (dto: { categoryId: number; name: string; description?: string | null }) =>
    api.post<TherapeuticClassDto>('/therapeutic-classes', dto),
  update: (id: number, dto: { categoryId: number; name: string; description?: string | null }) =>
    api.put<TherapeuticClassDto>(`/therapeutic-classes/${id}`, dto),
  delete: (id: number) => api.delete(`/therapeutic-classes/${id}`),
  restore: (id: number) => api.post(`/therapeutic-classes/${id}/restore`),
}

// ─── Warehouse ───────────────────────────────────────────────────────────────

export const warehousesApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<WarehouseDto>>(`/warehouses?page=${page}&size=${size}`),
  getForSelect: () => api.get<WarehouseDto[]>('/warehouses/select'),
  getById: (id: number) => api.get<WarehouseDto>(`/warehouses/${id}`),
  create: (dto: { code: string; name: string; address?: string | null; city?: string | null; notes?: string | null }) =>
    api.post<WarehouseDto>('/warehouses', dto),
  update: (id: number, dto: { code: string; name: string; address?: string | null; city?: string | null; notes?: string | null }) =>
    api.put<WarehouseDto>(`/warehouses/${id}`, dto),
  delete: (id: number) => api.delete(`/warehouses/${id}`),
  restore: (id: number) => api.post(`/warehouses/${id}/restore`),
}

// ─── Supplier ────────────────────────────────────────────────────────────────

interface SupplierWriteDto {
  name: string
  address: string | null
  postalBox: string | null
  phone: string | null
  email: string | null
  countryId: number | null
  contactPerson: string | null
}

export const suppliersApi = {
  getAll: (page = 1, size = 10, includeDeleted = false) =>
    api.get<PagedResult<SupplierDto>>(`/suppliers?page=${page}&size=${size}&includeDeleted=${includeDeleted}`),
  getForSelect: () => api.get<SupplierDto[]>('/suppliers/select'),
  getById: (id: number) => api.get<SupplierDto>(`/suppliers/${id}`),
  create: (dto: SupplierWriteDto) => api.post<SupplierDto>('/suppliers', dto),
  update: (id: number, dto: SupplierWriteDto) => api.put<SupplierDto>(`/suppliers/${id}`, dto),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
  restore: (id: number) => api.post(`/suppliers/${id}/restore`),
}

// ─── Customer ────────────────────────────────────────────────────────────────

interface CustomerWriteDto {
  name: string
  address: string | null
  postalBox: string | null
  phone: string | null
  email: string | null
  city: string | null
  countryId: number | null
  contactPerson: string | null
}

export const customersApi = {
  getAll: (page = 1, size = 10, includeDeleted = false) =>
    api.get<PagedResult<CustomerDto>>(`/customers?page=${page}&size=${size}&includeDeleted=${includeDeleted}`),
  getForSelect: () => api.get<CustomerDto[]>('/customers/select'),
  getById: (id: number) => api.get<CustomerDto>(`/customers/${id}`),
  create: (dto: CustomerWriteDto) => api.post<CustomerDto>('/customers', dto),
  update: (id: number, dto: CustomerWriteDto) => api.put<CustomerDto>(`/customers/${id}`, dto),
  delete: (id: number) => api.delete(`/customers/${id}`),
  restore: (id: number) => api.post(`/customers/${id}/restore`),
}

// ─── Product ─────────────────────────────────────────────────────────────────

export const productsApi = {
  getAll: (page = 1, size = 10, filters?: { search?: string; categoryId?: number; therapeuticClassId?: number; supplierId?: number; includeDeleted?: boolean }) => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) })
    if (filters?.search) qs.set('search', filters.search)
    if (filters?.categoryId) qs.set('categoryId', String(filters.categoryId))
    if (filters?.therapeuticClassId) qs.set('therapeuticClassId', String(filters.therapeuticClassId))
    if (filters?.supplierId) qs.set('supplierId', String(filters.supplierId))
    if (filters?.includeDeleted) qs.set('includeDeleted', 'true')
    return api.get<PagedResult<ProductDto>>(`/products?${qs}`)
  },
  getForSelect: () => api.get<ProductDto[]>('/products/select'),
  getById: (id: number) => api.get<ProductDto>(`/products/${id}`),
  create: (dto: object) => api.post<ProductDto>('/products', dto),
  update: (id: number, dto: object) => api.put<ProductDto>(`/products/${id}`, dto),
  delete: (id: number) => api.delete(`/products/${id}`),
  restore: (id: number) => api.post(`/products/${id}/restore`),
  getHistory: (id: number) => api.get<ProductHistoryDto>(`/products/${id}/history`),
  getLots: (id: number, warehouseId?: number) => {
    const qs = warehouseId ? `?warehouseId=${warehouseId}` : ''
    return api.get<PurchaseLineLotDto[]>(`/products/${id}/lots${qs}`)
  },
}

// ─── Purchase ────────────────────────────────────────────────────────────────

export const purchasesApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<PurchaseDto>>(`/purchases?page=${page}&size=${size}`),
  getById: (id: number) => api.get<PurchaseDto>(`/purchases/${id}`),
  create: (dto: object) => api.post<PurchaseDto>('/purchases', dto),
  update: (id: number, dto: object) => api.put<PurchaseDto>(`/purchases/${id}`, dto),
  delete: (id: number) => api.delete(`/purchases/${id}`),
  addLine: (id: number, dto: object) => api.post(`/purchases/${id}/lines`, dto),
  removeLine: (id: number, lineId: number) => api.delete(`/purchases/${id}/lines/${lineId}`),
  updateLotPrice: (lineId: number, dto: { marginRate: number; fixedSellingPriceHt?: number | null }) =>
    api.patch<PurchaseLineDto>(`/purchases/lines/${lineId}/price`, dto),
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface PaymentFormData {
  amount: number
  paymentDate: string
  paymentMethod?: string | null
  reference?: string | null
  notes?: string | null
  attachmentFile?: File | null
}

function buildPaymentForm(data: PaymentFormData): FormData {
  const fd = new FormData()
  fd.append('amount', String(data.amount))
  fd.append('paymentDate', data.paymentDate)
  if (data.paymentMethod) fd.append('paymentMethod', data.paymentMethod)
  if (data.reference) fd.append('reference', data.reference)
  if (data.notes) fd.append('notes', data.notes)
  if (data.attachmentFile) fd.append('attachmentFile', data.attachmentFile)
  return fd
}

export const invoicesApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<InvoiceDto>>(`/invoices?page=${page}&size=${size}`),
  getById: (id: number) => api.get<InvoiceDto>(`/invoices/${id}`),
  create: (dto: object) => api.post<InvoiceDto>('/invoices', dto),
  update: (id: number, dto: object) => api.put<InvoiceDto>(`/invoices/${id}`, dto),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  issue: (id: number) => api.post<InvoiceDto>(`/invoices/${id}/issue`),
  registerPayment: (id: number, data: PaymentFormData) =>
    api.postForm<InvoiceDto>(`/invoices/${id}/payment`, buildPaymentForm(data)),
  cancel: (id: number) => api.post<InvoiceDto>(`/invoices/${id}/cancel`),
}

// ─── Delivery ────────────────────────────────────────────────────────────────

export const deliveriesApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<DeliveryDto>>(`/deliveries?page=${page}&size=${size}`),
  getById: (id: number) => api.get<DeliveryDto>(`/deliveries/${id}`),
  create: (dto: object) => api.post<DeliveryDto>('/deliveries', dto),
  update: (id: number, dto: object) => api.put<DeliveryDto>(`/deliveries/${id}`, dto),
  delete: (id: number) => api.delete(`/deliveries/${id}`),
  ship: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/ship`),
  markDelivered: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/deliver`),
  cancel: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/cancel`),
}

// ─── DeliveryDelays / PaymentDelays ──────────────────────────────────────────

export const deliveryDelaysApi = {
  getAll: () => api.get<DelayDto[]>('/delivery-delays'),
  create: (dto: { label: string; sortOrder?: number; isActive?: boolean }) =>
    api.post<DelayDto>('/delivery-delays', dto),
  update: (id: number, dto: { label: string; sortOrder: number; isActive: boolean }) =>
    api.put<DelayDto>(`/delivery-delays/${id}`, dto),
  delete: (id: number) => api.delete(`/delivery-delays/${id}`),
}

export const paymentDelaysApi = {
  getAll: () => api.get<DelayDto[]>('/payment-delays'),
  create: (dto: { label: string; sortOrder?: number; isActive?: boolean }) =>
    api.post<DelayDto>('/payment-delays', dto),
  update: (id: number, dto: { label: string; sortOrder: number; isActive: boolean }) =>
    api.put<DelayDto>(`/payment-delays/${id}`, dto),
  delete: (id: number) => api.delete(`/payment-delays/${id}`),
}

// ─── StockMovements ──────────────────────────────────────────────────────────

export const stockMovementsApi = {
  getAll: (page = 1, size = 10, filters?: {
    productId?: number
    warehouseId?: number
    movementType?: string
    dateFrom?: string
    dateTo?: string
  }) => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) })
    if (filters?.productId) qs.set('productId', String(filters.productId))
    if (filters?.warehouseId) qs.set('warehouseId', String(filters.warehouseId))
    if (filters?.movementType) qs.set('movementType', filters.movementType)
    if (filters?.dateFrom) qs.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) qs.set('dateTo', filters.dateTo)
    return api.get<PagedResult<StockMovementDto>>(`/stock-movements?${qs}`)
  },
  cancel: (id: number) => api.post<void>(`/stock-movements/${id}/cancel`),
  getByProduct: (productId: number, page = 1, size = 10) =>
    api.get<PagedResult<StockMovementDto>>(
      `/stock-movements/by-product/${productId}?page=${page}&size=${size}`,
    ),
  getByWarehouse: (warehouseId: number, page = 1, size = 10) =>
    api.get<PagedResult<StockMovementDto>>(
      `/stock-movements/by-warehouse/${warehouseId}?page=${page}&size=${size}`,
    ),
  getById: (id: number) => api.get<StockMovementDto>(`/stock-movements/${id}`),
  postOpeningInventory: (dto: {
    date: string
    lines: {
      productId: number
      warehouseId: number
      quantity: number
      unitCostPriceXof: number
      sellingPriceHt: number
      lotNumber: string | null
      expirationDate: string | null
    }[]
  }) => api.post<void>('/stock-movements/opening-inventory', dto),
  createDiverseExit: (dto: {
    productId: number
    warehouseId: number
    purchaseLineId: number | null
    quantity: number
    reason: string
    notes: string | null
    exitDate: string | null
  }) => api.post<StockMovementDto>('/stock-movements/diverse-exit', dto),
}

// ─── SupplierReturns ─────────────────────────────────────────────────────────

export const supplierReturnsApi = {
  getAll: (params: { page?: number; size?: number; supplierId?: number }) => {
    const qs = new URLSearchParams({
      page: String(params.page ?? 1),
      size: String(params.size ?? 20),
    })
    if (params.supplierId) qs.set('supplierId', String(params.supplierId))
    return api.get<PagedResult<SupplierReturnDto>>(`/supplier-returns?${qs}`)
  },
  getById: (id: number) => api.get<SupplierReturnDto>(`/supplier-returns/${id}`),
  create: (dto: {
    supplierId: number
    purchaseId: number | null
    returnDate: string
    currency: string
    exchangeRateToXof: number
    reason: string | null
    notes: string | null
    createCreditNote: boolean
    lines: {
      productId: number
      purchaseLineId: number | null
      warehouseId: number
      quantityReturned: number
      lotNumber: string | null
      unitCostForeign: number
      unitCostXof: number
    }[]
  }) => api.post<SupplierReturnDto>('/supplier-returns', dto),
  updateStatus: (id: number, status: string, notes?: string) =>
    api.patch<SupplierReturnDto>(`/supplier-returns/${id}/status`, { status, notes }),
}

// ─── Accounting ──────────────────────────────────────────────────────────────

export const accountingApi = {
  getChartOfAccounts: () =>
    api.get<ChartAccountDto[]>('/accounting/chart-of-accounts'),

  createChartAccount: (dto: { code: string; name: string; accountClass: string; normalBalance: string; isThirdParty: boolean; parentCode: string | null }) =>
    api.post<ChartAccountDto>('/accounting/chart-of-accounts', dto),

  updateChartAccount: (id: number, dto: { name: string; isThirdParty: boolean; parentCode: string | null }) =>
    api.put<ChartAccountDto>(`/accounting/chart-of-accounts/${id}`, dto),

  deleteChartAccount: (id: number) =>
    api.delete<void>(`/accounting/chart-of-accounts/${id}`),

  getJournal: (params: { page?: number; size?: number; journalCode?: string; from?: string; to?: string; search?: string }) => {
    const qs = new URLSearchParams({ page: String(params.page ?? 1), size: String(params.size ?? 20) })
    if (params.journalCode) qs.set('journalCode', params.journalCode)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    if (params.search) qs.set('search', params.search)
    return api.get<PagedResult<JournalEntryDto>>(`/accounting/journal?${qs}`)
  },

  getJournalEntry: (id: number) =>
    api.get<JournalEntryDto>(`/accounting/journal/${id}`),

  postManualEntry: (dto: ManualJournalEntryInput) =>
    api.post<JournalEntryDto>('/accounting/journal', dto),

  getTrialBalance: (from?: string, to?: string) => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    return api.get<TrialBalanceLineDto[]>(`/accounting/trial-balance?${qs}`)
  },

  getPnL: (from?: string, to?: string) => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    return api.get<PnLDto>(`/accounting/pnl?${qs}`)
  },

  getCustomerLedger: (customerId: number, from?: string, to?: string) => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    return api.get<ThirdPartyLedgerDto>(`/accounting/customer-ledger/${customerId}?${qs}`)
  },

  getSupplierLedger: (supplierId: number, from?: string, to?: string) => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    return api.get<ThirdPartyLedgerDto>(`/accounting/supplier-ledger/${supplierId}?${qs}`)
  },
}

// ─── CustomerOrders ──────────────────────────────────────────────────────────

export const customerOrdersApi = {
  getAll: (params: { page?: number; size?: number; status?: string; customerId?: number }) => {
    const qs = new URLSearchParams({ page: String(params.page ?? 1), size: String(params.size ?? 20) })
    if (params.status) qs.set('status', params.status)
    if (params.customerId) qs.set('customerId', String(params.customerId))
    return api.get<PagedResult<CustomerOrderSummaryDto>>(`/customer-orders?${qs}`)
  },
  getById: (id: number) => api.get<CustomerOrderDto>(`/customer-orders/${id}`),
  create: (dto: { customerId: number; orderDate: string; vatApplied: boolean; currency: string; notes?: string | null; lines: { productId: number; quantity: number; quantityRequested?: number; unitsPerCarton?: number }[]; deliveryDelayId?: number | null; paymentDelayId?: number | null; customerOrderReference?: string | null }) =>
    api.post<CustomerOrderDto>('/customer-orders', dto),
  update: (id: number, dto: { orderDate: string; vatApplied: boolean; currency: string; notes?: string | null; lines: { productId: number; quantity: number; quantityRequested?: number; unitsPerCarton?: number }[]; deliveryDelayId?: number | null; paymentDelayId?: number | null; customerOrderReference?: string | null }) =>
    api.put<CustomerOrderDto>(`/customer-orders/${id}`, dto),
  validate: (id: number) => api.post<CustomerOrderDto>(`/customer-orders/${id}/validate`),
  getSuggestedLots: (id: number) =>
    api.get<CustomerOrderSuggestedLotDto[]>(`/customer-orders/${id}/suggested-lots`),
  prepare: (id: number, lots: { orderLineId: number; purchaseLineId: number; quantityAllocated: number }[], preparationDate?: string | null) =>
    api.post<CustomerOrderDto>(`/customer-orders/${id}/prepare`, { lots, preparationDate: preparationDate ?? null }),
  complete: (id: number, deliveryDate?: string | null) =>
    api.post<CustomerOrderDto>(`/customer-orders/${id}/complete`, { deliveryDate: deliveryDate ?? null }),
  cancel: (id: number) => api.post<CustomerOrderDto>(`/customer-orders/${id}/cancel`),
  preview: (dto: { vatApplied: boolean; lines: { productId: number; quantity: number }[] }) =>
    api.post<CustomerOrderPreviewDto>('/customer-orders/preview', dto),
  getStock: (productId: number, excludeOrderId?: number) => {
    const qs = excludeOrderId ? `?excludeOrderId=${excludeOrderId}` : ''
    return api.get<ProductStockInfoDto>(`/customer-orders/stock/${productId}${qs}`)
  },
  getCustomerStats: (customerId: number) =>
    api.get<CustomerStatsDto>(`/customer-orders/customer-stats/${customerId}`),
  // Documents
  getDocuments: (id: number) =>
    api.get<CustomerOrderDocumentDto[]>(`/customer-orders/${id}/documents`),
  uploadDocument: (id: number, file: File, documentType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('documentType', documentType)
    return api.postForm<CustomerOrderDocumentDto>(`/customer-orders/${id}/documents`, form)
  },
  deleteDocument: (documentId: number) =>
    api.delete<void>(`/customer-orders/documents/${documentId}`),
  // Email
  sendEmail: (id: number, type: 'proforma' | 'facture') =>
    api.post<void>(`/customer-orders/${id}/send-email?type=${type}`),
}

// ─── SupplierOrders ──────────────────────────────────────────────────────────

export const supplierOrdersApi = {
  getAll: (params: { page?: number; size?: number; status?: string; supplierId?: number }) => {
    const qs = new URLSearchParams({ page: String(params.page ?? 1), size: String(params.size ?? 20) })
    if (params.status) qs.set('status', params.status)
    if (params.supplierId) qs.set('supplierId', String(params.supplierId))
    return api.get<PagedResult<SupplierOrderSummaryDto>>(`/supplier-orders?${qs}`)
  },
  /** Récupère les commandes en réception ou réceptionnées pour le formulaire OD */
  getReceptionOrders: () =>
    Promise.all([
      api.get<PagedResult<SupplierOrderSummaryDto>>('/supplier-orders?page=1&size=200&status=EnCoursDeRéception'),
      api.get<PagedResult<SupplierOrderSummaryDto>>('/supplier-orders?page=1&size=200&status=Réceptionnée'),
    ]).then(([a, b]) => [...a.items, ...b.items]),
  getById: (id: number) => api.get<SupplierOrderDto>(`/supplier-orders/${id}`),
  create: (dto: {
    supplierId: number
    orderDate: string
    currency: string
    notes?: string | null
    lines: { productId: number; quantity: number; orderUnit: string; unitsPerCarton?: number | null }[]
  }) => api.post<SupplierOrderDto>('/supplier-orders', dto),
  update: (id: number, dto: {
    orderDate: string
    currency: string
    notes?: string | null
    lines: { productId: number; quantity: number; orderUnit: string; unitsPerCarton?: number | null }[]
  }) => api.put<SupplierOrderDto>(`/supplier-orders/${id}`, dto),
  send: (id: number) => api.post<SupplierOrderDto>(`/supplier-orders/${id}/send`),
  cancel: (id: number) => api.post<SupplierOrderDto>(`/supplier-orders/${id}/cancel`),
  receiveProforma: (id: number, dto: {
    proformaReference?: string | null
    containerReference?: string | null
    freightAmount?: number | null
    paymentTerms?: string | null
    brand?: string | null
    origin?: string | null
    expectedShippingDate?: string | null
    lines: { lineId: number; unitFobPrice?: number | null }[]
  }) => api.post<SupplierOrderDto>(`/supplier-orders/${id}/receive-proforma`, dto),
  validateProforma: (id: number) =>
    api.post<SupplierOrderDto>(`/supplier-orders/${id}/validate-proforma`),
  rejectProforma: (id: number, dto: { reason: string }) =>
    api.post<SupplierOrderDto>(`/supplier-orders/${id}/reject-proforma`, dto),
  receiveInvoice: (id: number, dto: {
    invoiceReference: string
    invoiceDate: string
    dueDate?: string | null
    totalAmountForeign: number
    totalAmountXof: number
    currency: string
    discountAmountForeign?: number | null
    discountAmountXof?: number | null
    advanceAmountForeign?: number | null
    advanceAmountXof?: number | null
    notes?: string | null
  }) => api.post<SupplierOrderDto>(`/supplier-orders/${id}/receive-invoice`, dto),
  receiveGoods: (id: number, dto: {
    arrivalDate: string
    transportMode: string
    exchangeRateToXof: number
    notes?: string | null
    commissionRate: number
    freightRate: number
    transitRate: number
    transferRate: number
    lines: {
      orderLineId: number
      lotNumber: string
      quantityCartons: number
      quantityLostCartons: number
      unitsPerCarton: number
      unitFobPricePerCarton: number
      expirationDate?: string | null
      marginRate: number
      fixedSellingPriceHt?: number | null
    }[]
  }) => api.post<SupplierOrderDto>(`/supplier-orders/${id}/receive-goods`, dto),
  closeReception: (id: number) =>
    api.post<SupplierOrderDto>(`/supplier-orders/${id}/close-reception`),
  getReceptions: (id: number) =>
    api.get<PurchaseSummaryDto[]>(`/supplier-orders/${id}/receptions`),
  addCharge: (purchaseId: number, dto: {
    chargeType: string
    description: string
    amountXof: number
    chargeDate: string
    reference?: string | null
    debitAccountCode: string
    creditAccountCode: string
    notes?: string | null
  }) => api.post<PurchaseChargeDto>(`/supplier-orders/purchases/${purchaseId}/charges`, dto),
  getCharges: (purchaseId: number) =>
    api.get<PurchaseChargeDto[]>(`/supplier-orders/purchases/${purchaseId}/charges`),
  getAllInvoices: (params: { page?: number; size?: number; status?: string; supplierId?: number }) => {
    const qs = new URLSearchParams({ page: String(params.page ?? 1), size: String(params.size ?? 500) })
    if (params.status) qs.set('status', params.status)
    if (params.supplierId) qs.set('supplierId', String(params.supplierId))
    return api.get<PagedResult<SupplierInvoiceDto>>(`/supplier-orders/invoices?${qs}`)
  },
  getInvoiceById: (invoiceId: number) =>
    api.get<SupplierInvoiceDto>(`/supplier-orders/invoices/${invoiceId}`),
  registerPayment: (invoiceId: number, data: PaymentFormData) =>
    api.postForm<SupplierInvoiceDto>(`/supplier-orders/invoices/${invoiceId}/payment`, buildPaymentForm(data)),
  getDocuments: (id: number) => api.get<SupplierOrderDocumentDto[]>(`/supplier-orders/${id}/documents`),
  uploadDocument: async (id: number, file: File, documentType: string): Promise<SupplierOrderDocumentDto> => {
    const token = localStorage.getItem('labmedis_token')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)
    const res = await fetch(`/api/supplier-orders/${id}/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.title ?? err?.message ?? 'Erreur upload')
    }
    return res.json()
  },
  deleteDocument: (documentId: number) => api.delete<void>(`/supplier-orders/documents/${documentId}`),
  sendEmail: (id: number, recipientEmail?: string | null) =>
    api.post<{ message: string }>(`/supplier-orders/${id}/send-email`, { recipientEmail: recipientEmail ?? null }),
  getAllCreditNotes: (params: { page?: number; size?: number; status?: string; supplierId?: number }) => {
    const qs = new URLSearchParams({ page: String(params.page ?? 1), size: String(params.size ?? 500) })
    if (params.status) qs.set('status', params.status)
    if (params.supplierId) qs.set('supplierId', String(params.supplierId))
    return api.get<PagedResult<SupplierCreditNoteDto>>(`/supplier-orders/credit-notes?${qs}`)
  },
  getCreditNotesByOrder: (orderId: number) =>
    api.get<SupplierCreditNoteDto[]>(`/supplier-orders/${orderId}/credit-notes`),
  updateCreditNoteStatus: (creditNoteId: number, status: string, notes?: string) =>
    api.patch<SupplierCreditNoteDto>(`/supplier-orders/credit-notes/${creditNoteId}/status`, { status, notes }),
}

// ─── Avoirs clients ───────────────────────────────────────────────────────────

export type { CustomerCreditNoteLineDto }

export interface CreateCreditNoteLineInput {
  productId: number
  warehouseId: number
  purchaseLineId: number | null
  quantityReturned: number
  unitPriceHt: number
  discountPercent: number
  tvaRate: number
  lotNumber: string | null
}

export const customerCreditNotesApi = {
  getAll: (params: { page?: number; size?: number; status?: string; customerId?: number }) => {
    const qs = new URLSearchParams({ page: String(params.page ?? 1), size: String(params.size ?? 500) })
    if (params.status) qs.set('status', params.status)
    if (params.customerId) qs.set('customerId', String(params.customerId))
    return api.get<PagedResult<CustomerCreditNoteDto>>(`/customer-credit-notes?${qs}`)
  },
  getById: (id: number) => api.get<CustomerCreditNoteDto>(`/customer-credit-notes/${id}`),
  getByInvoice: (invoiceId: number) => api.get<CustomerCreditNoteDto[]>(`/customer-credit-notes/by-invoice/${invoiceId}`),
  create: (dto: {
    customerId: number
    invoiceId: number | null
    creditNoteDate: string
    notes: string | null
    lines: CreateCreditNoteLineInput[]
  }) => api.post<CustomerCreditNoteDto>('/customer-credit-notes', dto),
  updateStatus: (id: number, status: string, notes?: string) =>
    api.patch<CustomerCreditNoteDto>(`/customer-credit-notes/${id}/status`, { status, notes }),
  applyToInvoice: (id: number) =>
    api.post<CustomerCreditNoteDto>(`/customer-credit-notes/${id}/apply-to-invoice`, {}),
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<UserDto>>(`/users?page=${page}&size=${size}`),
  getById: (id: number) => api.get<UserDto>(`/users/${id}`),
  getRoles: () => api.get<string[]>('/users/roles'),
  create: (dto: { userName: string; email: string; fullName?: string | null; roles?: string[] }) =>
    api.post<UserDto>('/users', dto),
  update: (id: number, dto: { email: string; fullName?: string | null; isActive: boolean; roles?: string[] }) =>
    api.put<UserDto>(`/users/${id}`, dto),
  changePassword: (id: number, dto: { currentPassword: string; newPassword: string }) =>
    api.post(`/users/${id}/change-password`, dto),
  delete: (id: number) => api.delete(`/users/${id}`),
}

// ─── Achats généraux ─────────────────────────────────────────────────────────

export const generalPurchasesApi = {
  getAll: (page = 1, size = 20) =>
    api.get<PagedResult<GeneralPurchaseDto>>(`/general-purchases?page=${page}&size=${size}`),
  getById: (id: number) => api.get<GeneralPurchaseDto>(`/general-purchases/${id}`),
  create: (dto: object) => api.post<GeneralPurchaseDto>('/general-purchases', dto),
  update: (id: number, dto: object) => api.put<GeneralPurchaseDto>(`/general-purchases/${id}`, dto),
  delete: (id: number) => api.delete(`/general-purchases/${id}`),
  markPaid: (id: number, datePaiement: string) =>
    api.post<GeneralPurchaseDto>(`/general-purchases/${id}/mark-paid`, { datePaiement }),
}

// ─── Charges d'exploitation ──────────────────────────────────────────────────

export const operatingExpensesApi = {
  getAll: (page = 1, size = 20, annee?: number, mois?: number) => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) })
    if (annee) qs.set('annee', String(annee))
    if (mois) qs.set('mois', String(mois))
    return api.get<PagedResult<OperatingExpenseDto>>(`/operating-expenses?${qs}`)
  },
  getById: (id: number) => api.get<OperatingExpenseDto>(`/operating-expenses/${id}`),
  create: (dto: object) => api.post<OperatingExpenseDto>('/operating-expenses', dto),
  update: (id: number, dto: object) => api.put<OperatingExpenseDto>(`/operating-expenses/${id}`, dto),
  delete: (id: number) => api.delete(`/operating-expenses/${id}`),
  getBudgets: (annee: number, mois: number) =>
    api.get<ExpenseBudgetDto[]>(`/operating-expenses/budgets?annee=${annee}&mois=${mois}`),
  upsertBudget: (dto: object) => api.put<ExpenseBudgetDto>('/operating-expenses/budgets', dto),
  getBudgetVsActuel: (annee: number, mois: number) =>
    api.get<BudgetVsActuelDto[]>(`/operating-expenses/budget-vs-actuel?annee=${annee}&mois=${mois}`),
}

// ─── Immobilisations & Amortissements ────────────────────────────────────────

export const fixedAssetsApi = {
  getAll: (page = 1, size = 20) =>
    api.get<PagedResult<FixedAssetDto>>(`/fixed-assets?page=${page}&size=${size}`),
  getById: (id: number) => api.get<FixedAssetDto>(`/fixed-assets/${id}`),
  create: (dto: object) => api.post<FixedAssetDto>('/fixed-assets', dto),
  update: (id: number, dto: object) => api.put<FixedAssetDto>(`/fixed-assets/${id}`, dto),
  delete: (id: number) => api.delete(`/fixed-assets/${id}`),
  getTableau: (id: number) => api.get<DepreciationLineDto[]>(`/fixed-assets/${id}/tableau`),
}
