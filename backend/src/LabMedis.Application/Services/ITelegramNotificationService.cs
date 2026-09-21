namespace LabMedis.Application.Services;

/// <summary>
/// Push notifications Telegram (Bot API sendMessage) déclenchées par les
/// évènements métier : commandes client/fournisseur, avoirs, réceptions, stock.
/// Destinataires = chat_ids de ALLOWED_TELEGRAM_CHAT_IDS.
/// Toutes les méthodes sont fire-and-forget côté impact fonctionnel :
/// une erreur d'envoi ne doit jamais faire échouer l'opération métier.
/// </summary>
public interface ITelegramNotificationService
{
    Task NotifyCustomerOrderCreatedAsync(long orderId, CancellationToken ct = default);
    Task NotifyCustomerOrderCompletedAsync(long orderId, CancellationToken ct = default);

    Task NotifySupplierOrderCreatedAsync(long orderId, CancellationToken ct = default);
    Task NotifyCustomerCreditNoteCreatedAsync(long creditNoteId, CancellationToken ct = default);

    /// <summary>
    /// Notifie la réception physique d'un arrivage fournisseur.
    /// Prend l'ID du Purchase (pas du SupplierOrder) — un SupplierOrder peut
    /// avoir plusieurs arrivages.
    /// </summary>
    Task NotifySupplierGoodsReceivedAsync(long purchaseId, CancellationToken ct = default);

    /// <summary>
    /// Vérifie le stock faible pour chaque produit impacté et envoie une
    /// notification par produit dépassant le seuil. Appelée sur événement
    /// métier (ex : Complete d'une commande client qui affecte le stock).
    /// </summary>
    Task NotifyLowStockAsync(IEnumerable<long> productIds, CancellationToken ct = default);

    /// <summary>
    /// Vérifie les lots proches péremption (&lt; 6 mois) pour chaque produit
    /// et envoie une notification par lot concerné. Appelée par le scan
    /// quotidien du catalogue.
    /// </summary>
    Task NotifyExpiringLotsAsync(IEnumerable<long> productIds, CancellationToken ct = default);

    /// <summary>
    /// Envoie un rapport d'inventaire mensuel listant les produits avec stock
    /// résiduel &gt; 0. Appelée par le scan mensuel de fin de mois.
    /// </summary>
    Task SendMonthlyInventoryReportAsync(CancellationToken ct = default);
}
