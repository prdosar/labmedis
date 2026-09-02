namespace LabMedis.Application.Dtos.CustomerCreditNotes;

public record CreateCustomerCreditNoteDto(
    long CustomerId,
    long? InvoiceId,
    DateOnly CreditNoteDate,
    string? Notes,
    IReadOnlyList<CreateCustomerCreditNoteLineDto> Lines
);

public record CreateCustomerCreditNoteLineDto(
    long ProductId,
    long WarehouseId,
    long? PurchaseLineId,
    int QuantityReturned,
    decimal UnitPriceHt,
    decimal DiscountPercent,
    decimal TvaRate,
    string? LotNumber
);
