namespace LabMedis.Application.Dtos.Invoices;

public record InvoiceLineDto(
    long Id,
    long InvoiceId,
    long ProductId,
    string? ProductCode,
    string? ProductDesignation,
    int Quantity,
    decimal UnitPriceHt,
    decimal DiscountPercent,
    decimal TvaRate,
    decimal LineTotalHt,
    decimal LineTva,
    decimal LineTotalTtc,
    int QuantityDelivered,
    int QuantityRemainingToDeliver);
