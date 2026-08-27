namespace LabMedis.Application.Dtos.Invoices;

public record InvoiceUpdateDto(
    string Reference,
    DateTime InvoiceDate,
    DateTime? DueDate,
    string? Notes);
