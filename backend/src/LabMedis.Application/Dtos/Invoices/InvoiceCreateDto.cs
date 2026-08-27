namespace LabMedis.Application.Dtos.Invoices;

public record InvoiceCreateDto(
    string Reference,
    DateTime InvoiceDate,
    DateTime? DueDate,
    long CustomerId,
    string? Notes);
