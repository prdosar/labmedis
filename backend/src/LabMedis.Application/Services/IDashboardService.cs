using LabMedis.Application.Dtos.Dashboard;

namespace LabMedis.Application.Services;

public interface IDashboardService
{
    /// <summary>
    /// KPIs du tableau de bord : achats + ventes + livraisons + mouvements sur la période donnée,
    /// avec les totaux référentiels (produits, fournisseurs, clients) non filtrés.
    /// </summary>
    Task<DashboardSummaryDto> GetSummaryAsync(
        DateOnly dateFrom,
        DateOnly dateTo,
        CancellationToken cancellationToken = default);
}
