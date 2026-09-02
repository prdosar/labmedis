namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderDto(
    long Id,
    string Reference,
    DateTime OrderDate,
    long CustomerId,
    string CustomerName,
    decimal CustomerBalance,
    string Status,
    bool VatApplied,
    string Currency,
    string? Notes,
    decimal TotalHt,
    decimal TotalTva,
    decimal TotalTtc,
    decimal TotalCost,
    decimal Profit,
    long? InvoiceId,
    string? InvoiceReference,
    IReadOnlyList<CustomerOrderLineDto> Lines,
    IReadOnlyList<CustomerOrderLotLineDto> LotLines,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
