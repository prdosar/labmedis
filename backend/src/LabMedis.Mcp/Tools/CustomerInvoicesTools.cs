using System.ComponentModel;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

[McpServerToolType]
public sealed class CustomerInvoicesTools
{
    private readonly AppDbContext _db;
    public CustomerInvoicesTools(AppDbContext db) => _db = db;

    [McpServerTool, Description(
        "Liste les factures clients avec filtres statut/client/période. " +
        "Statuts : Draft, Issued, PartiallyPaid, Paid, Cancelled.")]
    public async Task<object> ListCustomerInvoices(
        [Description("Statut")] string? status = null,
        [Description("Id client")] long? customerId = null,
        [Description("Date min (YYYY-MM-DD)")] string? dateFrom = null,
        [Description("Date max (YYYY-MM-DD, inclusive)")] string? dateTo = null,
        [Description("Nombre max (défaut 20, max 100)")] int limit = 20,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var q = _db.Invoices.Include(i => i.Customer).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)
            && Enum.TryParse<InvoiceStatus>(status.Trim(), true, out var s))
            q = q.Where(i => i.Status == s);
        if (customerId.HasValue) q = q.Where(i => i.CustomerId == customerId.Value);
        if (DateTime.TryParse(dateFrom, out var df)) q = q.Where(i => i.InvoiceDate >= df.Date);
        if (DateTime.TryParse(dateTo, out var dt)) q = q.Where(i => i.InvoiceDate < dt.Date.AddDays(1));

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(i => i.InvoiceDate).Take(limit).ToListAsync(ct);
        return new
        {
            totalMatching = total,
            returned = items.Count,
            items = items.Select(i => new
            {
                id = i.Id, reference = i.Reference,
                date = i.InvoiceDate.ToString("yyyy-MM-dd"),
                dueDate = i.DueDate?.ToString("yyyy-MM-dd"),
                customer = i.Customer?.Name,
                status = i.Status.ToString(),
                totalHt = i.SubtotalHt, totalTva = i.TotalTva,
                totalTtc = i.TotalTtc, amountPaid = i.AmountPaid,
                balanceDue = i.TotalTtc - i.AmountPaid,
            }),
        };
    }

    [McpServerTool, Description(
        "Détail d'une facture client : lignes, paiements enregistrés, livraisons associées. " +
        "Recherche par Id ou référence.")]
    public async Task<object?> GetCustomerInvoice(
        [Description("Id numérique OU référence")] string idOrRef,
        CancellationToken ct = default)
    {
        var invoice = long.TryParse(idOrRef, out var id)
            ? await LoadInvoice(i => i.Id == id, ct)
            : await LoadInvoice(i => i.Reference == idOrRef, ct);
        if (invoice is null) return new { error = $"Facture '{idOrRef}' introuvable." };

        var payments = await _db.InvoicePayments
            .Where(p => p.InvoiceId == invoice.Id)
            .OrderBy(p => p.PaymentDate)
            .ToListAsync(ct);

        return new
        {
            id = invoice.Id, reference = invoice.Reference,
            date = invoice.InvoiceDate.ToString("yyyy-MM-dd"),
            dueDate = invoice.DueDate?.ToString("yyyy-MM-dd"),
            customer = new { id = invoice.CustomerId, name = invoice.Customer?.Name },
            status = invoice.Status.ToString(),
            notes = invoice.Notes,
            totals = new
            {
                subtotalHt = invoice.SubtotalHt,
                totalTva = invoice.TotalTva,
                totalTtc = invoice.TotalTtc,
                amountPaid = invoice.AmountPaid,
                balanceDue = invoice.TotalTtc - invoice.AmountPaid,
            },
            lines = invoice.Lines.Select(l => new
            {
                lineId = l.Id, productId = l.ProductId,
                productDesignation = l.Product?.Designation,
                quantity = l.Quantity, unitPriceHt = l.UnitPriceHt,
                discountPercent = l.DiscountPercent, tvaRate = l.TvaRate,
                lineTotalHt = l.LineTotalHt, lineTotalTtc = l.LineTotalTtc,
                quantityDelivered = l.QuantityDelivered,
                quantityRemainingToDeliver = l.QuantityRemainingToDeliver,
            }),
            payments = payments.Select(p => new
            {
                id = p.Id, date = p.PaymentDate.ToString("yyyy-MM-dd"),
                amount = p.Amount, method = p.PaymentMethod,
                reference = p.Reference, notes = p.Notes,
            }),
            deliveries = invoice.Deliveries.Select(d => new
            {
                id = d.Id, reference = d.Reference,
                date = d.DeliveryDate.ToString("yyyy-MM-dd"),
                status = d.Status.ToString(),
            }),
        };
    }

    private Task<Domain.Entities.Invoice?> LoadInvoice(
        System.Linq.Expressions.Expression<Func<Domain.Entities.Invoice, bool>> predicate,
        CancellationToken ct)
        => _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Lines).ThenInclude(l => l.Product)
            .Include(i => i.Deliveries)
            .FirstOrDefaultAsync(predicate, ct);
}
