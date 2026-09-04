using LabMedis.Application.Dtos.Reports;
using LabMedis.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IInventoryReportService _inventoryReport;

    public ReportsController(IInventoryReportService inventoryReport)
    {
        _inventoryReport = inventoryReport;
    }

    /// <summary>
    /// Rapport d'inventaire : produits mouvementés sur la période + stock actuel.
    /// Filtres optionnels : fournisseur, type de mouvement.
    /// </summary>
    [HttpGet("inventory")]
    public async Task<ActionResult<InventoryReportDto>> GetInventory(
        [FromQuery] DateOnly dateFrom,
        [FromQuery] DateOnly dateTo,
        [FromQuery] long? supplierId = null,
        [FromQuery] string? movementType = null,
        CancellationToken ct = default)
    {
        var report = await _inventoryReport.GetInventoryReportAsync(dateFrom, dateTo, supplierId, movementType, ct);
        return Ok(report);
    }
}
