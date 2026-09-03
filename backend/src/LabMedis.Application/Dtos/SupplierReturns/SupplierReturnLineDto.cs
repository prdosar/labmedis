namespace LabMedis.Application.Dtos.SupplierReturns;

public record SupplierReturnLineDto(
    long Id,
    long ProductId,
    string? ProductCode,
    string? ProductDesignation,
    long? PurchaseLineId,
    string? LotNumber,
    long WarehouseId,
    string? WarehouseName,
    int QuantityReturned,
    decimal UnitCostForeign,
    decimal UnitCostXof,
    decimal LineTotalForeign,
    decimal LineTotalXof,
    long? StockMovementId
);
