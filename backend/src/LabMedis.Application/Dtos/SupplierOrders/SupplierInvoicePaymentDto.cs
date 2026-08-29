namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierInvoicePaymentDto(
    long Id,
    long SupplierInvoiceId,
    decimal Amount,
    DateOnly PaymentDate,
    string? PaymentMethod,
    string? Reference,
    string? Notes,
    string? AttachmentFileName,
    string? AttachmentUrl,
    DateTime CreatedAt);
