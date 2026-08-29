namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierOrderSummaryDto(
    long Id,
    string Reference,
    DateTime OrderDate,
    long SupplierId,
    string SupplierName,
    string Status,
    string Currency,
    int LineCount,
    string? Notes,
    string? InvoiceReference,
    string? InvoiceStatus,
    decimal? InvoiceTotalXof,
    decimal? InvoiceAmountPaid,
    decimal? InvoiceBalanceDue,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
