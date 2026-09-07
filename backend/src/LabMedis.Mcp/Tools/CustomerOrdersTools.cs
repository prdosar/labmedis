using System.ComponentModel;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

[McpServerToolType]
public sealed class CustomerOrdersTools
{
    private readonly AppDbContext _db;
    public CustomerOrdersTools(AppDbContext db) => _db = db;

    [McpServerTool, Description(
        "Liste les commandes clients avec filtres statut/client/période. " +
        "Statuts possibles : EnAttente, Validée, EnPréparation, Terminée, Annulée.")]
    public async Task<object> ListCustomerOrders(
        [Description("Statut (ex: EnAttente, Terminée)")] string? status = null,
        [Description("Id client")] long? customerId = null,
        [Description("Date min (YYYY-MM-DD)")] string? dateFrom = null,
        [Description("Date max (YYYY-MM-DD, inclusive)")] string? dateTo = null,
        [Description("Nombre max (défaut 20, max 100)")] int limit = 20,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var q = _db.CustomerOrders.Include(o => o.Customer).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)
            && Enum.TryParse<CustomerOrderStatus>(status.Trim(), true, out var s))
            q = q.Where(o => o.Status == s);
        if (customerId.HasValue) q = q.Where(o => o.CustomerId == customerId.Value);
        if (DateTime.TryParse(dateFrom, out var df)) q = q.Where(o => o.OrderDate >= df.Date);
        if (DateTime.TryParse(dateTo, out var dt)) q = q.Where(o => o.OrderDate < dt.Date.AddDays(1));

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(o => o.OrderDate)
            .Take(limit)
            .Select(o => new
            {
                id = o.Id, reference = o.Reference,
                date = o.OrderDate,
                customerId = o.CustomerId,
                customer = o.Customer!.Name,
                status = o.Status.ToString(),
                totalTtc = o.TotalTtc,
                invoiceId = o.InvoiceId,
                notes = o.Notes,
            })
            .ToListAsync(ct);
        return new
        {
            totalMatching = total,
            returned = items.Count,
            items = items.Select(o => new
            {
                o.id, o.reference,
                date = o.date.ToString("yyyy-MM-dd"),
                o.customerId, o.customer, o.status,
                o.totalTtc, o.invoiceId, o.notes,
            }),
        };
    }

    [McpServerTool, Description(
        "Détail complet d'une commande client : lignes commandées + allocations lots (issues de la " +
        "préparation) + facture liée + BL généré à la clôture. Recherche par Id ou référence.")]
    public async Task<object?> GetCustomerOrder(
        [Description("Id numérique OU référence (ex: CMD-2026-000123)")] string idOrRef,
        CancellationToken ct = default)
    {
        var order = long.TryParse(idOrRef, out var id)
            ? await LoadOrder(o => o.Id == id, ct)
            : await LoadOrder(o => o.Reference == idOrRef, ct);
        if (order is null) return new { error = $"Commande '{idOrRef}' introuvable." };

        var lotLines = await _db.CustomerOrderLotLines
            .Include(l => l.Product)
            .Include(l => l.PurchaseLine)
            .Include(l => l.Warehouse)
            .Where(l => l.CustomerOrderId == order.Id && !l.IsDeleted)
            .ToListAsync(ct);

        var deliveries = order.Invoice is null
            ? new List<Domain.Entities.Delivery>()
            : await _db.Deliveries
                .Include(d => d.Lines).ThenInclude(l => l.PurchaseLine)
                .Include(d => d.Lines).ThenInclude(l => l.InvoiceLine).ThenInclude(il => il!.Product)
                .Where(d => d.InvoiceId == order.Invoice.Id)
                .ToListAsync(ct);

        return new
        {
            id = order.Id, reference = order.Reference,
            date = order.OrderDate.ToString("yyyy-MM-dd"),
            customer = new { id = order.CustomerId, name = order.Customer?.Name },
            status = order.Status.ToString(),
            vatApplied = order.VatApplied,
            currency = order.Currency,
            notes = order.Notes,
            customerOrderReference = order.CustomerOrderReference,
            totals = new
            {
                totalHt = order.TotalHt, totalTva = order.TotalTva,
                totalTtc = order.TotalTtc, totalCost = order.TotalCost,
                profit = order.Profit,
            },
            lines = order.Lines.Select(l => new
            {
                lineId = l.Id, productId = l.ProductId,
                productCode = l.Product?.Code,
                productDesignation = l.Product?.Designation,
                quantity = l.Quantity, quantityRequested = l.QuantityRequested,
                unitPriceHt = l.UnitPriceHt,
                lineTotalHt = l.LineTotalHt, lineTotalTtc = l.LineTotalTtc,
            }),
            lotAllocations = lotLines.Select(l => new
            {
                productId = l.ProductId,
                productCode = l.Product?.Code,
                productDesignation = l.Product?.Designation,
                purchaseLineId = l.PurchaseLineId,
                lotNumber = l.PurchaseLine?.LotNumber,
                expirationDate = l.PurchaseLine?.ExpirationDate?.ToString("yyyy-MM-dd"),
                warehouse = l.Warehouse?.Name,
                quantityAllocated = l.QuantityAllocated,
            }),
            invoice = order.Invoice is null ? null : new
            {
                id = order.Invoice.Id, reference = order.Invoice.Reference,
                date = order.Invoice.InvoiceDate.ToString("yyyy-MM-dd"),
                status = order.Invoice.Status.ToString(),
                totalTtc = order.Invoice.TotalTtc,
                amountPaid = order.Invoice.AmountPaid,
                balanceDue = order.Invoice.TotalTtc - order.Invoice.AmountPaid,
            },
            deliveries = deliveries.Select(d => new
            {
                id = d.Id, reference = d.Reference,
                date = d.DeliveryDate.ToString("yyyy-MM-dd"),
                status = d.Status.ToString(),
                linesCount = d.Lines.Count,
            }),
        };
    }

    private Task<Domain.Entities.CustomerOrder?> LoadOrder(
        System.Linq.Expressions.Expression<Func<Domain.Entities.CustomerOrder, bool>> predicate,
        CancellationToken ct)
        => _db.CustomerOrders
            .Include(o => o.Customer)
            .Include(o => o.Invoice)
            .Include(o => o.Lines).ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(predicate, ct);
}
