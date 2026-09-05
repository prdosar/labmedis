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
}
