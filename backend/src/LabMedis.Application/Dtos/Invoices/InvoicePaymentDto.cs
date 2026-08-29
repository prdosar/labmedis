namespace LabMedis.Application.Dtos.Invoices;

public record InvoicePaymentDto(
    long Id,
    long InvoiceId,
    decimal Amount,
    DateOnly PaymentDate,
    string? PaymentMethod,
    string? Reference,
    string? Notes,
    string? AttachmentFileName,
    string? AttachmentUrl,
    DateTime CreatedAt);
