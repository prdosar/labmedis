namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseLineCreateDto(
    long ProductId,
    string LotNumber,
    int Quantity,
    decimal UnitPurchasePrice,
    DateTime? ExpirationDate,
    decimal TargetSellingPriceHt);
