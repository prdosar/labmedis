namespace LabMedis.Application.Dtos.SupplierOrders;

public record ReceiveSupplierInvoiceDto(
    string InvoiceReference,
    DateOnly InvoiceDate,
    DateOnly? DueDate,
    decimal TotalAmountForeign,
    string Currency,
    decimal ExchangeRateToXof,
    string? Notes
);
