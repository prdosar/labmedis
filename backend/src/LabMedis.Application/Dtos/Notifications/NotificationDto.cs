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
