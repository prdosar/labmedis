namespace LabMedis.Application.Dtos.Notifications;

/// <summary>
/// Résumé des alertes actives : compteurs par catégorie + items détaillés
/// (limités à un nombre raisonnable pour l'affichage dans la cloche).
/// </summary>
public record NotificationSummaryDto(
    int TotalCount,
    int PendingCustomerOrdersCount,
    int PendingSupplierOrdersCount,
    int ExpiringProductsCount,
    int LowStockCount,
    IReadOnlyList<NotificationItemDto> Items);

public record NotificationItemDto(
    /// <summary>PendingCustomerOrder | PendingSupplierOrder | ExpiringProduct | LowStock</summary>
    string Type,
    /// <summary>info | warning | danger</summary>
    string Severity,
    string Title,
    string Message,
    string? Link,
    DateTime? Date);

/// <summary>Ligne détaillée d'un lot proche péremption pour la page dédiée.</summary>
public record ExpiringProductRowDto(
    long PurchaseLineId,
    long ProductId,
    string ProductCode,
    string ProductDesignation,
    string LotNumber,
    DateTime ExpirationDate,
    int DaysRemaining,
    int QuantityRemaining,
    int UnitsPerCarton,
    long? SupplierId,
    string? SupplierName,
    long? WarehouseId,
    string? WarehouseName);

public record ExpiringProductsPageDto(
    IReadOnlyList<ExpiringProductRowDto> Items,
    int TotalCount,
    int WindowMonths);

/// <summary>Ligne détaillée d'un produit en stock faible pour la page dédiée.</summary>
public record LowStockRowDto(
    long ProductId,
    string ProductCode,
    string ProductDesignation,
    int StockUnits,
    decimal StockCartons,
    int UnitsPerCarton,
    int ThresholdUnits,
    int ThresholdCartons,
    bool IsCartonBased,
    long? SupplierId,
    string? SupplierName,
    long? CategoryId,
    string? CategoryName);

public record LowStockPageDto(
    IReadOnlyList<LowStockRowDto> Items,
    int TotalCount,
    int LowStockCartonsThreshold,
    int LowStockUnitsThreshold);
