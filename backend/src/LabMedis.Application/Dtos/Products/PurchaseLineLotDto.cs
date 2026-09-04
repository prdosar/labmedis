namespace LabMedis.Application.Dtos.Products;

public record PurchaseLineLotDto(
    long Id,
    string LotNumber,
    DateTime? ExpirationDate,
    int QuantityRemaining,
    long WarehouseId,
    string? WarehouseName);
