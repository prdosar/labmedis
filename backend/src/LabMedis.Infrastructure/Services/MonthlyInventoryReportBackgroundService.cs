using LabMedis.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

/// <summary>
/// Envoie un rapport d'inventaire (produits avec stock résiduel &gt; 0) le
/// dernier jour du mois à l'heure configurée.
///
/// Config :
/// - MONTHLY_INVENTORY_REPORT_ENABLED (défaut : on) — off/false/0 pour désactiver
/// - MONTHLY_INVENTORY_REPORT_HOUR_UTC (défaut : 18) — Lomé étant UTC+0, 18 = 18:00 locale
/// </summary>
public class MonthlyInventoryReportBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MonthlyInventoryReportBackgroundService> _logger;
    private readonly bool _enabled;
    private readonly int _runHourUtc;

    public MonthlyInventoryReportBackgroundService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<MonthlyInventoryReportBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        var enabledRaw = configuration["MONTHLY_INVENTORY_REPORT_ENABLED"];
        _enabled = !string.Equals(enabledRaw, "false", StringComparison.OrdinalIgnoreCase)
                   && !string.Equals(enabledRaw, "off", StringComparison.OrdinalIgnoreCase)
                   && !string.Equals(enabledRaw, "0", StringComparison.OrdinalIgnoreCase);

        _runHourUtc = int.TryParse(configuration["MONTHLY_INVENTORY_REPORT_HOUR_UTC"], out var h) && h is >= 0 and <= 23
            ? h
            : 18;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("MonthlyInventoryReport désactivé (MONTHLY_INVENTORY_REPORT_ENABLED).");
            return;
        }

        _logger.LogInformation("MonthlyInventoryReport activé — cible dernier jour du mois à {Hour:00}:00 UTC.", _runHourUtc);

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var next = ComputeNextRun(now, _runHourUtc);
            var wait = next - now;
            _logger.LogInformation("MonthlyInventoryReport prochain run dans {Wait:d\\.hh\\:mm\\:ss} (à {Next:u}).", wait, next);

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
                await RunAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MonthlyInventoryReport : échec de l'envoi.");
            }
        }
    }

    internal static DateTime ComputeNextRun(DateTime now, int hourUtc)
    {
        var lastDayThisMonth = DateTime.DaysInMonth(now.Year, now.Month);
        var candidate = new DateTime(now.Year, now.Month, lastDayThisMonth, hourUtc, 0, 0, DateTimeKind.Utc);
        if (candidate > now) return candidate;

        var nextMonth = now.AddMonths(1);
        var lastDayNextMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
        return new DateTime(nextMonth.Year, nextMonth.Month, lastDayNextMonth, hourUtc, 0, 0, DateTimeKind.Utc);
    }

    private async Task RunAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var telegram = scope.ServiceProvider.GetRequiredService<ITelegramNotificationService>();
        _logger.LogInformation("MonthlyInventoryReport : envoi du rapport en cours.");
        await telegram.SendMonthlyInventoryReportAsync(ct);
        _logger.LogInformation("MonthlyInventoryReport : terminé.");
    }
}
