namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderSummaryDto(
    long Id,
    string Reference,
    DateTime OrderDate,
    long CustomerId,
    string CustomerName,
    decimal CustomerBalance,
    string Status,
    bool VatApplied,
    string Currency,
    decimal TotalHt,
    decimal TotalTva,
    decimal TotalTtc,
    decimal TotalCost,
    decimal Profit,
    long? InvoiceId,
    string? InvoiceReference,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
