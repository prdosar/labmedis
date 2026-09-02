namespace LabMedis.Application.Dtos.CustomerCreditNotes;

public record CustomerCreditNoteDto(
    long Id,
    string Reference,
    long CustomerId,
    string CustomerName,
    long? InvoiceId,
    string? InvoiceReference,
    DateOnly CreditNoteDate,
    decimal TotalAmountHt,
    decimal TotalTva,
    decimal TotalAmountTtc,
    string Status,
    string? Notes,
    DateTime? ResolvedAt,
    DateTime CreatedAt,
    IReadOnlyList<CustomerCreditNoteLineDto> Lines
);

public record CustomerCreditNoteLineDto(
    long Id,
    long ProductId,
    string? ProductCode,
    string? ProductDesignation,
    long WarehouseId,
    string? WarehouseName,
    long? PurchaseLineId,
    string? LotNumber,
    int QuantityReturned,
    decimal UnitPriceHt,
    decimal DiscountPercent,
    decimal TvaRate,
    decimal LineTotalHt,
    decimal LineTva,
    decimal LineTotalTtc,
    long? StockMovementId
);
