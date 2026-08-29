namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierInvoiceDto(
    long Id,
    long SupplierOrderId,
    long SupplierId,
    string SupplierName,
    string InvoiceReference,
    DateOnly InvoiceDate,
    DateOnly? DueDate,
    decimal TotalAmountForeign,
    string Currency,
    decimal ExchangeRateToXof,
    decimal TotalAmountXof,
    string Status,
    decimal AmountPaid,
    decimal BalanceDue,
    string? Notes,
    DateTime CreatedAt
);
