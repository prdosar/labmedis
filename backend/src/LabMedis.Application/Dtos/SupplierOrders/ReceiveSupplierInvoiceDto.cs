namespace LabMedis.Application.Dtos.SupplierOrders;

public record ReceiveSupplierInvoiceDto(
    string InvoiceReference,
    DateOnly InvoiceDate,
    DateOnly? DueDate,
    decimal TotalAmountForeign,
    decimal TotalAmountXof,
    string Currency,
    decimal? DiscountAmountForeign,
    decimal? DiscountAmountXof,
    decimal? AdvanceAmountForeign,
    decimal? AdvanceAmountXof,
    string? Notes
);
