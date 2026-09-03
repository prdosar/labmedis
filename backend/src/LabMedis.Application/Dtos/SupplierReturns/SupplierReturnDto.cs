namespace LabMedis.Application.Dtos.SupplierReturns;

public record SupplierReturnDto(
    long Id,
    string Reference,
    long SupplierId,
    string SupplierName,
    long? PurchaseId,
    string? PurchaseReference,
    DateOnly ReturnDate,
    string Currency,
    decimal ExchangeRateToXof,
    decimal TotalAmountForeign,
    decimal TotalAmountXof,
    string? Reason,
    string? Notes,
    string Status,
    long? SupplierCreditNoteId,
    string? SupplierCreditNoteReference,
    DateTime CreatedAt,
    IReadOnlyList<SupplierReturnLineDto> Lines
);
