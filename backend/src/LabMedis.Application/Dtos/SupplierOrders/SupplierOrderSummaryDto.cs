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
    DateTime CreatedAt,
    DateTime? UpdatedAt);
