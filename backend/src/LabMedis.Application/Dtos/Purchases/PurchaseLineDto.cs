namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseLineDto(
    long Id,
    long PurchaseId,
    long ProductId,
    string? ProductCode,
    string? ProductDesignation,
    string LotNumber,
    DateTime? ExpirationDate,
    int QuantityCartons,
    int QuantityLostCartons,
    int UnitsPerCarton,
    int GoodUnitsReceived,
    int QuantityRemaining,
    decimal UnitPurchasePrice,
    decimal UnitPurchasePriceXof,
    decimal UnitCostPriceXof,
    decimal TargetSellingPriceHt,
    decimal MarginRate,
    decimal CalculatedSellingPriceHt,
    IReadOnlyList<PurchaseLineTransportDto> Transports);
