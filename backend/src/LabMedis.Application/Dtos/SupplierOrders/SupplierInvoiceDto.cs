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
    decimal? DiscountAmountForeign,
    decimal DiscountAmountXof,
    decimal? AdvanceAmountForeign,
    decimal AdvanceAmountXof,
    decimal NetAmountXof,
    string Status,
    decimal AmountPaid,
    decimal BalanceDue,
    string? Notes,
    IReadOnlyList<SupplierInvoicePaymentDto> Payments,
    DateTime CreatedAt
);
