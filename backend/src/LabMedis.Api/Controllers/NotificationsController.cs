using LabMedis.Application.Dtos.Notifications;
using LabMedis.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications)
    {
        _notifications = notifications;
    }

    /// <summary>
    /// Résumé des alertes actives pour la cloche de l'entête (polling frontend).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<NotificationSummaryDto>> GetSummary(CancellationToken ct = default)
        => Ok(await _notifications.GetSummaryAsync(ct));

    /// <summary>
    /// Liste paginée des lots proches péremption pour la page dédiée.
    /// </summary>
    [HttpGet("expiring-products")]
    public async Task<ActionResult<ExpiringProductsPageDto>> GetExpiringProducts(
        [FromQuery] int? windowMonths,
        [FromQuery] long? supplierId,
        [FromQuery] long? warehouseId,
        [FromQuery] int page = 1,
        [FromQuery] int size = 25,
        CancellationToken ct = default)
        => Ok(await _notifications.GetExpiringProductsAsync(windowMonths, supplierId, warehouseId, page, size, ct));

    /// <summary>
    /// Liste paginée des produits en stock faible pour la page dédiée.
    /// </summary>
    [HttpGet("low-stock")]
    public async Task<ActionResult<LowStockPageDto>> GetLowStock(
        [FromQuery] long? supplierId,
        [FromQuery] long? categoryId,
        [FromQuery] int page = 1,
        [FromQuery] int size = 25,
        CancellationToken ct = default)
        => Ok(await _notifications.GetLowStockProductsAsync(supplierId, categoryId, page, size, ct));
}
