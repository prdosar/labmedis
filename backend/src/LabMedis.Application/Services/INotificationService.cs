using LabMedis.Application.Dtos.Notifications;

namespace LabMedis.Application.Services;

public interface INotificationService
{
    /// <summary>
    /// Compte + détails des alertes actives : commandes clients en attente,
    /// commandes fournisseurs en cours, produits proches péremption (< 6 mois),
    /// produits en stock faible (&lt; 10 cartons ou &lt; 50 unités selon conditionnement).
    /// </summary>
    Task<NotificationSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Liste paginée des lots proches péremption (fenêtre par défaut : 6 mois).
    /// Filtres optionnels : fournisseur, magasin. Triée par date de péremption ASC.
    /// </summary>
    Task<ExpiringProductsPageDto> GetExpiringProductsAsync(
        int? windowMonths,
        long? supplierId,
        long? warehouseId,
        int page,
        int size,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Liste paginée des produits en stock faible (sous le seuil dérivé du conditionnement).
    /// Filtres optionnels : fournisseur, catégorie. Triée par stock restant ASC.
    /// </summary>
    Task<LowStockPageDto> GetLowStockProductsAsync(
        long? supplierId,
        long? categoryId,
        int page,
        int size,
        CancellationToken cancellationToken = default);
}
