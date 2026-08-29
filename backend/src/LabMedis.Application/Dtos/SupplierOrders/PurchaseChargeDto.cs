namespace LabMedis.Application.Dtos.SupplierOrders;

public record PurchaseChargeDto(
    long Id,
    long PurchaseId,
    string ChargeType,
    string Description,
    decimal AmountXof,
    DateOnly ChargeDate,
    string? Reference,
    string DebitAccountCode,
    string CreditAccountCode,
    long? JournalEntryId,
    string? Notes,
    DateTime CreatedAt
);
