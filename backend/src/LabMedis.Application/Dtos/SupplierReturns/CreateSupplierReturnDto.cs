namespace LabMedis.Application.Dtos.SupplierReturns;

public record CreateSupplierReturnDto(
    long SupplierId,
    long? PurchaseId,
    DateOnly ReturnDate,
    string Currency,
    decimal ExchangeRateToXof,
    string? Reason,
    string? Notes,
    bool CreateCreditNote,
    List<CreateSupplierReturnLineDto> Lines
);
