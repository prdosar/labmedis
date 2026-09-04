namespace LabMedis.Application.Dtos.Invoices;

public record ReturnableLotDto(
    long PurchaseLineId,
    string LotNumber,
    DateTime? ExpirationDate,
    long WarehouseId,
    string? WarehouseName,
    int QuantityDelivered,
    int QuantityAlreadyReturned,
    int QuantityReturnable);

public record ReturnableInvoiceLineDto(
    long InvoiceLineId,
    long ProductId,
    string ProductCode,
    string ProductDesignation,
    int QuantityInvoiced,
    int QuantityAlreadyReturned,
    int QuantityReturnable,
    decimal UnitPriceHt,
    decimal DiscountPercent,
    decimal TvaRate,
    IReadOnlyList<ReturnableLotDto> AvailableLots);
