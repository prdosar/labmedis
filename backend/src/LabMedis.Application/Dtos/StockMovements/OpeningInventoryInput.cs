namespace LabMedis.Application.Dtos.StockMovements;

public record OpeningInventoryLineInput(
    long ProductId,
    long WarehouseId,
    int Quantity,
    decimal UnitCostPriceXof,
    decimal SellingPriceHt,
    string? LotNumber,
    DateTime? ExpirationDate);

public record OpeningInventoryInput(
    DateTime Date,
    IReadOnlyList<OpeningInventoryLineInput> Lines);
