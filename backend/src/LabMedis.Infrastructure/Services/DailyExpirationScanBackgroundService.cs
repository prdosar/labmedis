using LabMedis.Application.Services;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

/// <summary>
/// Scan quotidien du catalogue produits pour pousser les notifs Telegram
/// "péremption" (lots à &lt; 6 mois de leur date d'expiration).
///
/// Le stock faible n'est plus scanné quotidiennement : il est notifié à
/// chaud lorsqu'une vente affecte le stock (voir CustomerOrderService.CompleteAsync).
/// L'inventaire résiduel est envoyé mensuellement par MonthlyInventoryReportBackgroundService.
///
/// Config :
/// - DAILY_EXPIRATION_SCAN_ENABLED (défaut : on) — off/false/0 pour désactiver
/// - DAILY_EXPIRATION_SCAN_HOUR_UTC (défaut : 7) — Lomé étant UTC+0, 7 = 07:00 locale
/// </summary>
public class DailyExpirationScanBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DailyExpirationScanBackgroundService> _logger;
    private readonly bool _enabled;
    private readonly int _scanHourUtc;

    public DailyExpirationScanBackgroundService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<DailyExpirationScanBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        var enabledRaw = configuration["DAILY_EXPIRATION_SCAN_ENABLED"];
        _enabled = !string.Equals(enabledRaw, "false", StringComparison.OrdinalIgnoreCase)
                   && !string.Equals(enabledRaw, "off", StringComparison.OrdinalIgnoreCase)
                   && !string.Equals(enabledRaw, "0", StringComparison.OrdinalIgnoreCase);

        _scanHourUtc = int.TryParse(configuration["DAILY_EXPIRATION_SCAN_HOUR_UTC"], out var h) && h is >= 0 and <= 23
            ? h
            : 7;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("DailyExpirationScan désactivé (DAILY_EXPIRATION_SCAN_ENABLED).");
            return;
        }

        _logger.LogInformation("DailyExpirationScan activé — cible {Hour:00}:00 UTC.", _scanHourUtc);

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var next = new DateTime(now.Year, now.Month, now.Day, _scanHourUtc, 0, 0, DateTimeKind.Utc);
            if (next <= now) next = next.AddDays(1);

            var wait = next - now;
            _logger.LogInformation("DailyExpirationScan prochain run dans {Wait:hh\\:mm\\:ss} (à {Next:u}).", wait, next);

            try
            {
                await Task.Delay(wait, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            try
            {
                await RunScanAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DailyExpirationScan : échec du scan.");
            }
        }
    }

    private async Task RunScanAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var telegram = scope.ServiceProvider.GetRequiredService<ITelegramNotificationService>();

        var productIds = await db.Products
            .Select(p => p.Id)
            .ToListAsync(ct);

        _logger.LogInformation("DailyExpirationScan : {Count} produits à analyser.", productIds.Count);
        await telegram.NotifyExpiringLotsAsync(productIds, ct);
        _logger.LogInformation("DailyExpirationScan : terminé.");
    }
}
