namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseLineDto(
    long Id,
    long PurchaseId,
    long ProductId,
    string? ProductCode,
    string? ProductDesignation,
    string LotNumber,
    DateTime? ExpirationDate,
    int Quantity,
    int QuantityRemaining,
    decimal UnitPurchasePrice,
    decimal UnitPurchasePriceXof,
    decimal UnitCostPriceXof,
    decimal TargetSellingPriceHt,
    IReadOnlyList<PurchaseLineTransportDto> Transports);
