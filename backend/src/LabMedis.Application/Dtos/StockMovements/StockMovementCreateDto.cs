using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.StockMovements;

public record StockMovementCreateDto(
    long ProductId,
    long WarehouseId,
    long? PurchaseLineId,
    StockMovementType MovementType,
    int Quantity,
    DateTime MovementDate,
    string? Reference,
    string? Reason,
    string? Notes);
