using System.ComponentModel;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

[McpServerToolType]
public sealed class DeliveriesTools
{
    private readonly AppDbContext _db;
    public DeliveriesTools(AppDbContext db) => _db = db;

    [McpServerTool, Description(
        "Liste les bons de livraison (BL) avec filtres statut/client/période. " +
        "Statuts : Pending, InTransit, Delivered, Cancelled.")]
    public async Task<object> ListDeliveries(
        [Description("Statut")] string? status = null,
        [Description("Id client (filtre via la facture liée)")] long? customerId = null,
        [Description("Date min (YYYY-MM-DD)")] string? dateFrom = null,
        [Description("Date max (YYYY-MM-DD, inclusive)")] string? dateTo = null,
        [Description("Nombre max (défaut 20, max 100)")] int limit = 20,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var q = _db.Deliveries
            .Include(d => d.Invoice).ThenInclude(i => i!.Customer)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)
            && Enum.TryParse<DeliveryStatus>(status.Trim(), true, out var s))
            q = q.Where(d => d.Status == s);
        if (customerId.HasValue) q = q.Where(d => d.Invoice != null && d.Invoice.CustomerId == customerId.Value);
        if (DateTime.TryParse(dateFrom, out var df)) q = q.Where(d => d.DeliveryDate >= df.Date);
        if (DateTime.TryParse(dateTo, out var dt)) q = q.Where(d => d.DeliveryDate < dt.Date.AddDays(1));

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(d => d.DeliveryDate).Take(limit).ToListAsync(ct);
        return new
        {
            totalMatching = total,
            returned = items.Count,
            items = items.Select(d => new
            {
                id = d.Id, reference = d.Reference,
                date = d.DeliveryDate.ToString("yyyy-MM-dd"),
                status = d.Status.ToString(),
                invoiceReference = d.Invoice?.Reference,
                customer = d.Invoice?.Customer?.Name,
                recipientName = d.RecipientName,
                carrierName = d.CarrierName,
                trackingNumber = d.TrackingNumber,
            }),
        };
    }

    [McpServerTool, Description(
        "Détail d'un BL : lignes avec produit, lot d'origine, date péremption, quantité livrée. " +
        "Recherche par Id ou référence (ex: BL-CMD-2026-000123).")]
    public async Task<object?> GetDelivery(
        [Description("Id numérique OU référence")] string idOrRef,
        CancellationToken ct = default)
    {
        var d = long.TryParse(idOrRef, out var id)
            ? await Load(x => x.Id == id, ct)
            : await Load(x => x.Reference == idOrRef, ct);
        if (d is null) return new { error = $"BL '{idOrRef}' introuvable." };

        return new
        {
            id = d.Id, reference = d.Reference,
            date = d.DeliveryDate.ToString("yyyy-MM-dd"),
            status = d.Status.ToString(),
            invoice = d.Invoice is null ? null : new
            {
                id = d.Invoice.Id, reference = d.Invoice.Reference,
                customer = d.Invoice.Customer?.Name,
            },
            deliveryAddress = d.DeliveryAddress,
            recipientName = d.RecipientName,
            carrierName = d.CarrierName,
            trackingNumber = d.TrackingNumber,
            notes = d.Notes,
            lines = d.Lines.Select(l => new
            {
                lineId = l.Id,
                productId = l.PurchaseLine?.ProductId,
                productDesignation = l.InvoiceLine?.Product?.Designation,
                lotNumber = l.PurchaseLine?.LotNumber,
                expirationDate = l.PurchaseLine?.ExpirationDate?.ToString("yyyy-MM-dd"),
                quantityDelivered = l.QuantityDelivered,
                unitsPerCarton = l.PurchaseLine?.UnitsPerCarton,
            }),
        };
    }

    [McpServerTool, Description(
        "Requête composée : retourne la liste des produits + lots (avec dates de péremption) livrés " +
        "à un client suite à une commande. Utile pour retracer ce qu'un client a physiquement reçu " +
        "pour une commande donnée, à partir de la référence de la commande.")]
    public async Task<object> GetLotsDeliveredForOrder(
        [Description("Id numérique OU référence de la commande client (ex: CMD-2026-000123)")] string orderIdOrRef,
        CancellationToken ct = default)
    {
        var order = long.TryParse(orderIdOrRef, out var oid)
            ? await _db.CustomerOrders.Include(o => o.Customer).Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.Id == oid, ct)
            : await _db.CustomerOrders.Include(o => o.Customer).Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.Reference == orderIdOrRef, ct);
        if (order is null) return new { error = $"Commande '{orderIdOrRef}' introuvable." };
        if (order.Invoice is null) return new
        {
            error = "Commande sans facture associée — aucun BL possible.",
            order = new { id = order.Id, reference = order.Reference, status = order.Status.ToString() },
        };

        var deliveries = await _db.Deliveries
            .Include(d => d.Lines).ThenInclude(l => l.PurchaseLine).ThenInclude(pl => pl!.Product)
            .Include(d => d.Lines).ThenInclude(l => l.InvoiceLine).ThenInclude(il => il!.Product)
            .Where(d => d.InvoiceId == order.Invoice.Id)
            .OrderBy(d => d.DeliveryDate)
            .ToListAsync(ct);

        return new
        {
            order = new
            {
                id = order.Id, reference = order.Reference,
                date = order.OrderDate.ToString("yyyy-MM-dd"),
                status = order.Status.ToString(),
                customer = order.Customer?.Name,
            },
            invoice = new
            {
                id = order.Invoice.Id,
                reference = order.Invoice.Reference,
                totalTtc = order.Invoice.TotalTtc,
            },
            deliveriesCount = deliveries.Count,
            deliveries = deliveries.Select(d => new
            {
                id = d.Id, reference = d.Reference,
                date = d.DeliveryDate.ToString("yyyy-MM-dd"),
                status = d.Status.ToString(),
                lines = d.Lines.Select(l => new
                {
                    productId = l.PurchaseLine?.ProductId,
                    productCode = l.PurchaseLine?.Product?.Code,
                    productDesignation = l.InvoiceLine?.Product?.Designation ?? l.PurchaseLine?.Product?.Designation,
                    lotNumber = l.PurchaseLine?.LotNumber,
                    expirationDate = l.PurchaseLine?.ExpirationDate?.ToString("yyyy-MM-dd"),
                    quantityDelivered = l.QuantityDelivered,
                }),
            }),
        };
    }

    private Task<Domain.Entities.Delivery?> Load(
        System.Linq.Expressions.Expression<Func<Domain.Entities.Delivery, bool>> predicate,
        CancellationToken ct)
        => _db.Deliveries
            .Include(d => d.Invoice).ThenInclude(i => i!.Customer)
            .Include(d => d.Lines).ThenInclude(l => l.PurchaseLine).ThenInclude(pl => pl!.Product)
            .Include(d => d.Lines).ThenInclude(l => l.InvoiceLine).ThenInclude(il => il!.Product)
            .FirstOrDefaultAsync(predicate, ct);
}
