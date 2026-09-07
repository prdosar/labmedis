using System.ComponentModel;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

[McpServerToolType]
public sealed class KpisTools
{
    private readonly AppDbContext _db;
    public KpisTools(AppDbContext db) => _db = db;

    [McpServerTool, Description(
        "KPIs synthétiques du business sur une période : achats (factures fournisseurs) et ventes " +
        "(factures clients émises) en nombre + montant XOF, livraisons et mouvements de stock. " +
        "Défaut = mois en cours. Utile pour répondre aux questions type " +
        "« combien on a vendu ce mois-ci ? ».")]
    public async Task<object> GetDashboardSummary(
        [Description("Date de début YYYY-MM-DD (défaut : 1er du mois en cours)")] string? dateFrom = null,
        [Description("Date de fin YYYY-MM-DD (défaut : aujourd'hui)")] string? dateTo = null,
        CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var from = DateOnly.TryParse(dateFrom, out var df) ? df : new DateOnly(today.Year, today.Month, 1);
        var to = DateOnly.TryParse(dateTo, out var dt) ? dt : today;
        if (to < from) (from, to) = (to, from);

        var fromDt = from.ToDateTime(TimeOnly.MinValue);
        var toExclusive = to.AddDays(1).ToDateTime(TimeOnly.MinValue);

        // Achats = factures fournisseurs reçues sur la période
        var supplierInvoicesQ = _db.SupplierInvoices.Where(i => i.InvoiceDate >= from && i.InvoiceDate <= to);
        var supplierInvoicesCount = await supplierInvoicesQ.CountAsync(ct);
        var supplierInvoicesTotalXof = await supplierInvoicesQ.SumAsync(i => (decimal?)i.TotalAmountXof, ct) ?? 0m;

        // Ventes = factures clients émises (hors Draft/Cancelled)
        var salesQ = _db.Invoices.Where(i => i.InvoiceDate >= fromDt && i.InvoiceDate < toExclusive
                                          && i.Status != InvoiceStatus.Draft && i.Status != InvoiceStatus.Cancelled);
        var salesCount = await salesQ.CountAsync(ct);
        var salesTotalXof = await salesQ.SumAsync(i => (decimal?)i.TotalTtc, ct) ?? 0m;

        var deliveriesCount = await _db.Deliveries.CountAsync(
            d => d.DeliveryDate >= fromDt && d.DeliveryDate < toExclusive, ct);
        var movementsCount = await _db.StockMovements.CountAsync(
            m => m.MovementDate >= fromDt && m.MovementDate < toExclusive, ct);

        return new
        {
            period = new { from = from.ToString("yyyy-MM-dd"), to = to.ToString("yyyy-MM-dd") },
            supplierInvoices = new { count = supplierInvoicesCount, totalXof = supplierInvoicesTotalXof },
            sales = new { count = salesCount, totalXof = salesTotalXof },
            deliveriesCount,
            stockMovementsCount = movementsCount,
            allTime = new
            {
                productsCount = await _db.Products.CountAsync(ct),
                suppliersCount = await _db.Suppliers.CountAsync(ct),
                customersCount = await _db.Customers.CountAsync(ct),
            },
        };
    }
}
