using LabMedis.Application.Dtos.Dashboard;
using LabMedis.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboard;

    public DashboardController(IDashboardService dashboard)
    {
        _dashboard = dashboard;
    }

    /// <summary>
    /// KPIs du tableau de bord agrégés sur une période.
    /// Défaut : mois en cours si les dates ne sont pas fournies.
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var from = dateFrom ?? new DateOnly(today.Year, today.Month, 1);
        var to = dateTo ?? today;
        if (to < from) (from, to) = (to, from);
        return Ok(await _dashboard.GetSummaryAsync(from, to, ct));
    }
}
