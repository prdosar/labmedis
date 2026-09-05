using LabMedis.Application.Dtos.Notifications;
using LabMedis.Application.Services;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LabMedis.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;

    // Seuils temporaires — passeront par produit quand le modèle Product
    // exposera DelaiPéremption et QuantitéSeuil.
    private const int ExpirationWindowMonths = 6;
    private const int LowStockCartonsThreshold = 10;  // pour les produits en cartons
    private const int LowStockUnitsThreshold = 50;    // pour les produits sans cartons

    // Limite d'items renvoyés par catégorie pour ne pas saturer la cloche
    private const int MaxItemsPerCategory = 10;

    // Statuts « en cours » côté fournisseur (tout sauf reçu / annulé / obsolète)
    private static readonly SupplierOrderStatus[] SupplierPendingStatuses =
    {
        SupplierOrderStatus.Brouillon,
        SupplierOrderStatus.Envoyée,
        SupplierOrderStatus.ProformaReçue,
        SupplierOrderStatus.ProformaValidée,
        SupplierOrderStatus.FactureReçue,
        SupplierOrderStatus.EnCoursDeRéception,
    };

    public NotificationService(AppDbContext db) => _db = db;

    public async Task<NotificationSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var items = new List<NotificationItemDto>();

        // ── 1. Commandes clients « En attente » ───────────────────────────
        var pendingCustomerOrders = await _db.CustomerOrders
            .Include(o => o.Customer)
            .Where(o => o.Status == CustomerOrderStatus.EnAttente)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync(ct);

        foreach (var order in pendingCustomerOrders.Take(MaxItemsPerCategory))
        {
            items.Add(new NotificationItemDto(
                Type: "PendingCustomerOrder",
                Severity: "info",
                Title: $"Commande client {order.Reference}",
                Message: $"En attente — {order.Customer?.Name ?? "client inconnu"}",
                Link: $"/orders/customers/{order.Id}",
                Date: order.OrderDate));
        }

        // ── 2. Commandes fournisseurs en cours ────────────────────────────
        var pendingSupplierOrders = await _db.SupplierOrders
            .Include(o => o.Supplier)
            .Where(o => SupplierPendingStatuses.Contains(o.Status))
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync(ct);

        foreach (var order in pendingSupplierOrders.Take(MaxItemsPerCategory))
        {
            items.Add(new NotificationItemDto(
                Type: "PendingSupplierOrder",
                Severity: "info",
                Title: $"BC fournisseur {order.Reference}",
                Message: $"{FrenchLabel(order.Status)} — {order.Supplier?.Name ?? "fournisseur inconnu"}",
                Link: $"/orders/suppliers/{order.Id}/edit",
                Date: order.OrderDate));
        }

        // ── 3. Produits proche péremption (< 6 mois) ──────────────────────
        var today = DateTime.UtcNow.Date;
        var expirationLimit = today.AddMonths(ExpirationWindowMonths);
        var soonExpiringLots = await _db.PurchaseLines
            .Include(pl => pl.Product)
            .Where(pl => pl.ExpirationDate != null
                      && pl.ExpirationDate < expirationLimit
                      && pl.QuantityRemaining > 0)
            .OrderBy(pl => pl.ExpirationDate)
            .ToListAsync(ct);

        foreach (var lot in soonExpiringLots.Take(MaxItemsPerCategory))
        {
            var daysToExpire = (int)((lot.ExpirationDate!.Value - today).TotalDays);
            var severity = lot.ExpirationDate <= today ? "danger"
                : daysToExpire <= 90 ? "danger"
                : "warning";
            var when = lot.ExpirationDate <= today
                ? "Périmé"
                : $"Expire dans {daysToExpire} j";
            items.Add(new NotificationItemDto(
                Type: "ExpiringProduct",
                Severity: severity,
                Title: $"{lot.Product?.Designation ?? "Produit"} — lot {lot.LotNumber}",
                Message: $"{when} ({lot.ExpirationDate:dd/MM/yyyy}) · {lot.QuantityRemaining} unité(s) en stock",
                Link: lot.ProductId > 0 ? $"/products/{lot.ProductId}" : null,
                Date: lot.ExpirationDate));
        }

        // ── 4. Produits en stock faible ───────────────────────────────────
        // Sur PurchaseLines actives, on somme le QuantityRemaining et on
        // compare au seuil dérivé du conditionnement produit.
        var stockByProduct = await _db.PurchaseLines
            .GroupBy(pl => pl.ProductId)
            .Select(g => new { ProductId = g.Key, Stock = g.Sum(pl => pl.QuantityRemaining) })
            .ToListAsync(ct);

        var productIds = stockByProduct.Select(s => s.ProductId).ToList();
        var products = await _db.Products
            .Include(p => p.Packaging)
            .Where(p => productIds.Contains(p.Id))
            .ToListAsync(ct);
        var productMap = products.ToDictionary(p => p.Id);

        var lowStockList = new List<(long ProductId, int StockUnits, int UnitsPerCarton, string Designation, bool IsCarton)>();
        foreach (var s in stockByProduct)
        {
            if (!productMap.TryGetValue(s.ProductId, out var product)) continue;
            var upc = product.Packaging?.UnitsPerPackaging ?? 1;
            var isCarton = upc > 1;
            var thresholdUnits = isCarton ? LowStockCartonsThreshold * upc : LowStockUnitsThreshold;
            if (s.Stock < thresholdUnits)
            {
                lowStockList.Add((s.ProductId, s.Stock, upc, product.Designation, isCarton));
            }
        }
        lowStockList = lowStockList.OrderBy(x => x.StockUnits).ToList();

        foreach (var low in lowStockList.Take(MaxItemsPerCategory))
        {
            var severity = low.StockUnits == 0 ? "danger" : "warning";
            string message;
            if (low.IsCarton)
            {
                var stockCartons = Math.Round((decimal)low.StockUnits / low.UnitsPerCarton, 2);
                message = low.StockUnits == 0
                    ? $"Stock épuisé (seuil : {LowStockCartonsThreshold} cartons)"
                    : $"{stockCartons} carton(s) — sous le seuil {LowStockCartonsThreshold} cartons";
            }
            else
            {
                message = low.StockUnits == 0
                    ? $"Stock épuisé (seuil : {LowStockUnitsThreshold} unités)"
                    : $"{low.StockUnits} unité(s) — sous le seuil {LowStockUnitsThreshold} unités";
            }
            items.Add(new NotificationItemDto(
                Type: "LowStock",
                Severity: severity,
                Title: low.Designation,
                Message: message,
                Link: $"/products/{low.ProductId}",
                Date: null));
        }

        // Totaux : on remonte les totaux réels (au-delà de MaxItemsPerCategory)
        var total = pendingCustomerOrders.Count
                  + pendingSupplierOrders.Count
                  + soonExpiringLots.Count
                  + lowStockList.Count;

        return new NotificationSummaryDto(
            TotalCount: total,
            PendingCustomerOrdersCount: pendingCustomerOrders.Count,
            PendingSupplierOrdersCount: pendingSupplierOrders.Count,
            ExpiringProductsCount: soonExpiringLots.Count,
            LowStockCount: lowStockList.Count,
            Items: items);
    }

    private static string FrenchLabel(SupplierOrderStatus s) => s switch
    {
        SupplierOrderStatus.Brouillon         => "Brouillon",
        SupplierOrderStatus.Envoyée           => "Envoyée",
        SupplierOrderStatus.ProformaReçue     => "Proforma reçue",
        SupplierOrderStatus.ProformaValidée   => "Proforma validée",
        SupplierOrderStatus.FactureReçue      => "Facture reçue",
        SupplierOrderStatus.EnCoursDeRéception=> "En cours de réception",
        _                                     => s.ToString(),
    };
}
