namespace LabMedis.Application.Dtos.StockMovements;

public record StockMovementDto(
    long Id,
    long ProductId,
    string? ProductCode,
    string? ProductDesignation,
    long WarehouseId,
    string? WarehouseName,
    long PurchaseLineId,
    string? LotNumber,
    string MovementType,
    int Quantity,
    DateTime MovementDate,
    string? Reference,
    string? Notes,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
