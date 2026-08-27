namespace LabMedis.Application.Dtos.Invoices;

public record InvoiceLineCreateDto(
    long ProductId,
    int Quantity,
    decimal UnitPriceHt,
    decimal DiscountPercent,
    decimal TvaRate);
