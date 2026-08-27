namespace LabMedis.Application.Dtos.Invoices;

public record InvoiceDto(
    long Id,
    string Reference,
    DateTime InvoiceDate,
    DateTime? DueDate,
    long CustomerId,
    string? CustomerName,
    string Status,
    decimal SubtotalHt,
    decimal TotalTva,
    decimal TotalTtc,
    decimal AmountPaid,
    decimal BalanceDue,
    string? Notes,
    IReadOnlyList<InvoiceLineDto> Lines,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
