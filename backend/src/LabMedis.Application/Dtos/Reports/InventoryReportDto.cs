namespace LabMedis.Application.Dtos.Reports;

/// <summary>
/// Rapport d'inventaire : liste des produits qui ont eu des mouvements sur la période
/// (filtrée éventuellement par fournisseur et/ou type de mouvement), avec leur stock
/// actuel et le détail des quantités mouvementées par type.
/// </summary>
public record InventoryReportDto(
    DateOnly DateFrom,
    DateOnly DateTo,
    long? SupplierId,
    string? SupplierName,
    string? MovementType,
    IReadOnlyList<InventoryReportRowDto> Rows,
    InventoryReportTotalsDto Totals);

public record InventoryReportRowDto(
    long ProductId,
    string ProductCode,
    string ProductDesignation,
    long? SupplierId,
    string? SupplierName,
    int UnitsPerCarton,
    // Stock actuel (au moment de la génération)
    int CurrentStockUnits,
    decimal CurrentStockCartons,
    // Somme signée des quantités mouvementées sur la période (entrées positives, sorties négatives)
    int NetMovementUnits,
    decimal NetMovementCartons,
    // Par type de mouvement, quantité brute (toujours positive)
    IReadOnlyDictionary<string, InventoryMovementCellDto> MovementsByType);

public record InventoryMovementCellDto(int Units, decimal Cartons);

public record InventoryReportTotalsDto(
    int TotalCurrentStockUnits,
    decimal TotalCurrentStockCartons,
    int TotalNetMovementUnits,
    decimal TotalNetMovementCartons);
