namespace LabMedis.Application.Dtos.Invoices;

public record InvoiceLineUpdateDto(
    int Quantity,
    decimal UnitPriceHt,
    decimal DiscountPercent,
    decimal TvaRate);
