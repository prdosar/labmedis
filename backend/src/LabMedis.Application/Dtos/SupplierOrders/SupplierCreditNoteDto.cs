namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierCreditNoteDto(
    long Id,
    string Reference,
    long SupplierOrderId,
    string OrderReference,
    long? SupplierInvoiceId,
    string? InvoiceReference,
    long PurchaseId,
    string PurchaseReference,
    long SupplierId,
    string SupplierName,
    DateOnly CreditNoteDate,
    decimal AmountForeign,
    string Currency,
    decimal ExchangeRateToXof,
    decimal AmountXof,
    int LostBoxesCount,
    string Status,
    string? Notes,
    DateTime? ResolvedAt,
    DateTime CreatedAt
);
