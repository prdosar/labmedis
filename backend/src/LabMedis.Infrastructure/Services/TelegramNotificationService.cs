using System.Net.Http.Json;
using LabMedis.Application.Services;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class TelegramNotificationService : ITelegramNotificationService
{
    // Alignés avec NotificationService (la cloche). À déplacer dans une config
    // partagée le jour où les seuils deviennent par-produit.
    private const int ExpirationWindowMonths = 6;
    private const int LowStockCartonsThreshold = 10;
    private const int LowStockUnitsThreshold = 50;

    private readonly AppDbContext _db;
    private readonly HttpClient _http;
    private readonly ILogger<TelegramNotificationService> _logger;
    private readonly string? _botToken;
    private readonly IReadOnlyList<long> _chatIds;

    public TelegramNotificationService(
        AppDbContext db,
        HttpClient http,
        ILogger<TelegramNotificationService> logger,
        IConfiguration configuration)
    {
        _db = db;
        _http = http;
        _logger = logger;
        _botToken = configuration["TELEGRAM_BOT_TOKEN"];
        _chatIds = ParseChatIds(configuration["ALLOWED_TELEGRAM_CHAT_IDS"]);

        if (!IsConfigured())
        {
            _logger.LogInformation(
                "TelegramNotificationService inactif — TELEGRAM_BOT_TOKEN ou ALLOWED_TELEGRAM_CHAT_IDS non défini(s).");
        }
    }

    public async Task NotifyCustomerOrderCreatedAsync(long orderId, CancellationToken ct = default)
    {
        if (!IsConfigured()) return;
        try
        {
            var order = await _db.CustomerOrders
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct);
            if (order is null) return;

            var msg =
                "🟢 <b>Nouvelle commande client</b>\n" +
                $"Réf : <code>{order.Reference}</code>\n" +
                $"Client : {Escape(order.Customer?.Name ?? "—")}\n" +
                $"Montant : {order.TotalTtc:N0} XOF\n" +
                $"Date : {order.OrderDate:dd/MM/yyyy}";
            await SendToAllAsync(msg, ct);
        }
        catch (Exception e)
        {
            _logger.LogWarning(e, "Notification 'commande créée' KO orderId={OrderId}", orderId);
        }
    }

    public async Task NotifyCustomerOrderCompletedAsync(long orderId, CancellationToken ct = default)
    {
        if (!IsConfigured()) return;
        try
        {
            var order = await _db.CustomerOrders
                .Include(o => o.Customer)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct);
            if (order is null) return;

            var msg =
                "✅ <b>Commande livrée</b>\n" +
                $"Réf : <code>{order.Reference}</code>\n" +
                $"Client : {Escape(order.Customer?.Name ?? "—")}\n" +
                $"Facture : <code>{Escape(order.Invoice?.Reference ?? "—")}</code>\n" +
                $"Montant : {order.TotalTtc:N0} XOF";
            await SendToAllAsync(msg, ct);
        }
        catch (Exception e)
        {
            _logger.LogWarning(e, "Notification 'commande livrée' KO orderId={OrderId}", orderId);
        }
    }

    public async Task NotifySupplierOrderCreatedAsync(long orderId, CancellationToken ct = default)
    {
        if (!IsConfigured()) return;
        try
        {
            var order = await _db.SupplierOrders
                .Include(o => o.Supplier)
                .Include(o => o.Lines)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct);
            if (order is null) return;

            var totalUnits = order.Lines.Sum(l => l.Quantity);
            var msg =
                "📥 <b>Nouvelle commande fournisseur</b>\n" +
                $"Réf : <code>{order.Reference}</code>\n" +
                $"Fournisseur : {Escape(order.Supplier?.Name ?? "—")}\n" +
                $"Lignes : {order.Lines.Count} ({totalUnits} unité(s))\n" +
                $"Devise : {order.Currency}\n" +
                $"Date : {order.OrderDate:dd/MM/yyyy}";
            await SendToAllAsync(msg, ct);
        }
        catch (Exception e)
        {
            _logger.LogWarning(e, "Notification 'commande fournisseur créée' KO orderId={OrderId}", orderId);
        }
    }

    public async Task NotifyCustomerCreditNoteCreatedAsync(long creditNoteId, CancellationToken ct = default)
    {
        if (!IsConfigured()) return;
        try
        {
            var creditNote = await _db.CustomerCreditNotes
                .Include(c => c.Customer)
                .Include(c => c.Invoice)
                .Include(c => c.Lines)
                .FirstOrDefaultAsync(c => c.Id == creditNoteId, ct);
            if (creditNote is null) return;

            var totalReturned = creditNote.Lines.Sum(l => l.QuantityReturned);
            var invoiceLine = creditNote.Invoice is null
                ? "Sans facture liée (remboursement direct)"
                : $"Facture : <code>{Escape(creditNote.Invoice.Reference)}</code>";

            var msg =
                "🔄 <b>Retour client (avoir)</b>\n" +
                $"Réf : <code>{creditNote.Reference}</code>\n" +
                $"Client : {Escape(creditNote.Customer?.Name ?? "—")}\n" +
                $"{invoiceLine}\n" +
                $"Lignes : {creditNote.Lines.Count} ({totalReturned} unité(s) retournées)\n" +
                $"Montant : {creditNote.TotalAmountTtc:N0} XOF TTC\n" +
                $"Date : {creditNote.CreditNoteDate:dd/MM/yyyy}";
            await SendToAllAsync(msg, ct);
        }
        catch (Exception e)
        {
            _logger.LogWarning(e, "Notification 'avoir client créé' KO creditNoteId={CreditNoteId}", creditNoteId);
        }
    }

    public async Task NotifySupplierGoodsReceivedAsync(long purchaseId, CancellationToken ct = default)
    {
        if (!IsConfigured()) return;
        try
        {
            var purchase = await _db.Purchases
                .Include(p => p.Supplier)
                .Include(p => p.Lines)
                .FirstOrDefaultAsync(p => p.Id == purchaseId, ct);
            if (purchase is null) return;

            string? orderRef = null;
            if (purchase.SupplierOrderId.HasValue)
            {
                orderRef = await _db.SupplierOrders
                    .Where(o => o.Id == purchase.SupplierOrderId.Value)
                    .Select(o => o.Reference)
                    .FirstOrDefaultAsync(ct);
            }

            var arrivalDate = purchase.ArrivalDate ?? purchase.PurchaseDate;
            var lostLine = purchase.TotalLostCartons > 0
                ? $"\n⚠️ Pertes : {purchase.TotalLostCartons} carton(s) → avoir fournisseur auto-généré"
                : string.Empty;

            var msg =
                "📦 <b>Réception marchandises fournisseur</b>\n" +
                $"Arrivage : <code>{Escape(purchase.Reference)}</code>\n" +
                $"BC : <code>{Escape(orderRef ?? "—")}</code>\n" +
                $"Fournisseur : {Escape(purchase.Supplier?.Name ?? "—")}\n" +
                $"Lignes : {purchase.Lines.Count} ({purchase.TotalGoodUnits} unité(s) bonnes)\n" +
                $"Total FOB : {purchase.TotalFobXof:N0} XOF" +
                lostLine + "\n" +
                $"Date : {arrivalDate:dd/MM/yyyy}";
            await SendToAllAsync(msg, ct);
        }
        catch (Exception e)
        {
            _logger.LogWarning(e, "Notification 'réception fournisseur' KO purchaseId={PurchaseId}", purchaseId);
        }
    }

    public async Task NotifyStockChangesAsync(IEnumerable<long> productIds, CancellationToken ct = default)
    {
        if (!IsConfigured()) return;
        try
        {
            foreach (var productId in productIds.Distinct())
            {
                await CheckAndNotifyLowStockAsync(productId, ct);
                await CheckAndNotifyExpiringAsync(productId, ct);
            }
        }
        catch (Exception e)
        {
            _logger.LogWarning(e, "Notification stock/péremption KO");
        }
    }

    private async Task CheckAndNotifyLowStockAsync(long productId, CancellationToken ct)
    {
        var product = await _db.Products
            .Include(p => p.Packaging)
            .FirstOrDefaultAsync(p => p.Id == productId, ct);
        if (product is null) return;

        var stock = await _db.PurchaseLines
            .Where(pl => pl.ProductId == productId && !pl.IsDeleted)
            .SumAsync(pl => (int?)pl.QuantityRemaining, ct) ?? 0;

        var upc = product.Packaging?.UnitsPerPackaging ?? 1;
        var isCarton = upc > 1;
        var thresholdUnits = isCarton ? LowStockCartonsThreshold * upc : LowStockUnitsThreshold;
        if (stock >= thresholdUnits) return;

        string detail;
        if (isCarton)
        {
            var stockCartons = Math.Round((decimal)stock / upc, 2);
            detail = stock == 0
                ? $"Stock épuisé (seuil : {LowStockCartonsThreshold} cartons)"
                : $"{stockCartons} carton(s) — sous le seuil {LowStockCartonsThreshold} cartons";
        }
        else
        {
            detail = stock == 0
                ? $"Stock épuisé (seuil : {LowStockUnitsThreshold} unités)"
                : $"{stock} unité(s) — sous le seuil {LowStockUnitsThreshold} unités";
        }

        var msg =
            "⚠️ <b>Stock faible</b>\n" +
            $"{Escape(product.Designation)}\n" +
            detail;
        await SendToAllAsync(msg, ct);
    }

    private async Task CheckAndNotifyExpiringAsync(long productId, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;
        var limit = today.AddMonths(ExpirationWindowMonths);

        var lots = await _db.PurchaseLines
            .Include(pl => pl.Product)
            .Where(pl => pl.ProductId == productId
                      && !pl.IsDeleted
                      && pl.ExpirationDate != null
                      && pl.ExpirationDate < limit
                      && pl.QuantityRemaining > 0)
            .OrderBy(pl => pl.ExpirationDate)
            .ToListAsync(ct);

        foreach (var lot in lots)
        {
            var daysToExpire = (int)((lot.ExpirationDate!.Value - today).TotalDays);
            var header = lot.ExpirationDate <= today ? "🔴 <b>Produit périmé</b>"
                : daysToExpire <= 90 ? "🟠 <b>Péremption imminente</b>"
                : "🟡 <b>Péremption à surveiller</b>";
            var when = lot.ExpirationDate <= today
                ? $"Périmé depuis le {lot.ExpirationDate:dd/MM/yyyy}"
                : $"Expire le {lot.ExpirationDate:dd/MM/yyyy} (dans {daysToExpire} j)";

            var msg =
                $"{header}\n" +
                $"{Escape(lot.Product?.Designation ?? "Produit")}\n" +
                $"Lot : <code>{Escape(lot.LotNumber)}</code>\n" +
                $"{when}\n" +
                $"Stock restant : {lot.QuantityRemaining}";
            await SendToAllAsync(msg, ct);
        }
    }

    private async Task SendToAllAsync(string html, CancellationToken ct)
    {
        var url = $"https://api.telegram.org/bot{_botToken}/sendMessage";
        foreach (var chatId in _chatIds)
        {
            try
            {
                var payload = new { chat_id = chatId, text = html, parse_mode = "HTML" };
                var response = await _http.PostAsJsonAsync(url, payload, ct);
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(ct);
                    _logger.LogWarning(
                        "Telegram sendMessage KO chat={ChatId} status={Status} body={Body}",
                        chatId, (int)response.StatusCode, body);
                }
            }
            catch (Exception e)
            {
                _logger.LogWarning(e, "Telegram sendMessage exception chat={ChatId}", chatId);
            }
        }
    }

    private bool IsConfigured() => !string.IsNullOrWhiteSpace(_botToken) && _chatIds.Count > 0;

    private static IReadOnlyList<long> ParseChatIds(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv)) return Array.Empty<long>();
        var result = new List<long>();
        foreach (var raw in csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (long.TryParse(raw, out var id)) result.Add(id);
        }
        return result;
    }

    private static string Escape(string? s) =>
        string.IsNullOrEmpty(s) ? string.Empty
        : s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
}
