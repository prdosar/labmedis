import { api } from './client'
import type {
  AccessDto,
  CategoryDto,
  CountryDto,
  CustomerDto,
  CustomsRegimeDto,
  DeliveryDto,
  DosageDto,
  InvoiceDto,
  PackagingDto,
  PagedResult,
  ProductDto,
  ProductFormDto,
  PurchaseDto,
  SimpleEntity,
  StockMovementDto,
  SupplierDto,
  TherapeuticClassDto,
  TokenResponse,
  TransportTypeDto,
  UserDto,
  WarehouseDto,
} from './types'

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { username, password }),
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
export const packagingsApi = simpleApi<PackagingDto>('/packagings')
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

export const suppliersApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<SupplierDto>>(`/suppliers?page=${page}&size=${size}`),
  getForSelect: () => api.get<SupplierDto[]>('/suppliers/select'),
  getById: (id: number) => api.get<SupplierDto>(`/suppliers/${id}`),
  create: (dto: Omit<SupplierDto, 'id' | 'createdAt' | 'updatedAt' | 'countryName'>) =>
    api.post<SupplierDto>('/suppliers', dto),
  update: (id: number, dto: Omit<SupplierDto, 'id' | 'createdAt' | 'updatedAt' | 'countryName'>) =>
    api.put<SupplierDto>(`/suppliers/${id}`, dto),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
  restore: (id: number) => api.post(`/suppliers/${id}/restore`),
}

// ─── Customer ────────────────────────────────────────────────────────────────

export const customersApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<CustomerDto>>(`/customers?page=${page}&size=${size}`),
  getForSelect: () => api.get<CustomerDto[]>('/customers/select'),
  getById: (id: number) => api.get<CustomerDto>(`/customers/${id}`),
  create: (dto: Omit<CustomerDto, 'id' | 'createdAt' | 'updatedAt' | 'countryName'>) =>
    api.post<CustomerDto>('/customers', dto),
  update: (id: number, dto: Omit<CustomerDto, 'id' | 'createdAt' | 'updatedAt' | 'countryName'>) =>
    api.put<CustomerDto>(`/customers/${id}`, dto),
  delete: (id: number) => api.delete(`/customers/${id}`),
  restore: (id: number) => api.post(`/customers/${id}/restore`),
}

// ─── Product ─────────────────────────────────────────────────────────────────

export const productsApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<ProductDto>>(`/products?page=${page}&size=${size}`),
  getForSelect: () => api.get<ProductDto[]>('/products/select'),
  getById: (id: number) => api.get<ProductDto>(`/products/${id}`),
  create: (dto: object) => api.post<ProductDto>('/products', dto),
  update: (id: number, dto: object) => api.put<ProductDto>(`/products/${id}`, dto),
  delete: (id: number) => api.delete(`/products/${id}`),
  restore: (id: number) => api.post(`/products/${id}/restore`),
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
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export const invoicesApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<InvoiceDto>>(`/invoices?page=${page}&size=${size}`),
  getById: (id: number) => api.get<InvoiceDto>(`/invoices/${id}`),
  create: (dto: object) => api.post<InvoiceDto>('/invoices', dto),
  update: (id: number, dto: object) => api.put<InvoiceDto>(`/invoices/${id}`, dto),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  issue: (id: number) => api.post<InvoiceDto>(`/invoices/${id}/issue`),
  registerPayment: (id: number, dto: object) => api.post<InvoiceDto>(`/invoices/${id}/payment`, dto),
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

// ─── StockMovements ──────────────────────────────────────────────────────────

export const stockMovementsApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<StockMovementDto>>(`/stock-movements?page=${page}&size=${size}`),
  getByProduct: (productId: number, page = 1, size = 10) =>
    api.get<PagedResult<StockMovementDto>>(
      `/stock-movements/by-product/${productId}?page=${page}&size=${size}`,
    ),
  getByWarehouse: (warehouseId: number, page = 1, size = 10) =>
    api.get<PagedResult<StockMovementDto>>(
      `/stock-movements/by-warehouse/${warehouseId}?page=${page}&size=${size}`,
    ),
  getById: (id: number) => api.get<StockMovementDto>(`/stock-movements/${id}`),
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  getAll: (page = 1, size = 10) =>
    api.get<PagedResult<UserDto>>(`/users?page=${page}&size=${size}`),
  getById: (id: number) => api.get<UserDto>(`/users/${id}`),
  create: (dto: { userName: string; email: string; password: string; fullName?: string | null; roles?: string[] }) =>
    api.post<UserDto>('/users', dto),
  update: (id: number, dto: { email: string; fullName?: string | null; isActive: boolean; roles?: string[] }) =>
    api.put<UserDto>(`/users/${id}`, dto),
  changePassword: (id: number, dto: { currentPassword: string; newPassword: string }) =>
    api.post(`/users/${id}/change-password`, dto),
  delete: (id: number) => api.delete(`/users/${id}`),
}
