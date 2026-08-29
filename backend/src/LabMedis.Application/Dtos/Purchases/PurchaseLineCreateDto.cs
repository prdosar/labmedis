namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseLineCreateDto(
    long ProductId,
    string LotNumber,
    int QuantityCartons,
    int QuantityLostCartons,
    int UnitsPerCarton,
    decimal UnitFobPricePerCarton,
    DateTime? ExpirationDate,
    decimal MarginRate = 0.10m,
    decimal? FixedSellingPriceHt = null);
