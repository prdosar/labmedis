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
}
