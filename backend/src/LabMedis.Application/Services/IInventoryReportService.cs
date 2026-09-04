using LabMedis.Application.Dtos.Reports;

namespace LabMedis.Application.Services;

public interface IInventoryReportService
{
    /// <summary>
    /// Génère un rapport d'inventaire pour une période donnée.
    /// Retourne tous les produits ayant eu au moins un mouvement (non supprimé)
    /// entre <paramref name="dateFrom"/> et <paramref name="dateTo"/> inclus,
    /// avec leur stock actuel et le détail des mouvements par type.
    /// </summary>
    Task<InventoryReportDto> GetInventoryReportAsync(
        DateOnly dateFrom,
        DateOnly dateTo,
        long? supplierId = null,
        string? movementType = null,
        CancellationToken cancellationToken = default);
}
