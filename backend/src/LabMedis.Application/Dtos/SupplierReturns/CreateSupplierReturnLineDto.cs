namespace LabMedis.Application.Dtos.SupplierReturns;

public record CreateSupplierReturnLineDto(
    long ProductId,
    long? PurchaseLineId,
    long WarehouseId,
    int QuantityReturned,
    string? LotNumber,
    decimal UnitCostForeign,
    decimal UnitCostXof
);
