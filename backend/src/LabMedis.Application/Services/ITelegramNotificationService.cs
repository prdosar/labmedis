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
    /// Vérifie stock faible + péremption &lt; 6 mois pour chaque produit impacté
    /// et envoie une notification par produit/lot dépassant un seuil.
    /// </summary>
    Task NotifyStockChangesAsync(IEnumerable<long> productIds, CancellationToken ct = default);
}
