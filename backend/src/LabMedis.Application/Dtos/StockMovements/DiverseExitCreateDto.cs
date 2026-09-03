namespace LabMedis.Application.Dtos.StockMovements;

public record DiverseExitCreateDto(
    long ProductId,
    long WarehouseId,
    long? PurchaseLineId,
    int Quantity,
    string Reason,
    string? Notes,
    DateTime? ExitDate
);
