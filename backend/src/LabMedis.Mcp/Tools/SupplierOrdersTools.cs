using System.ComponentModel;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

[McpServerToolType]
public sealed class SupplierOrdersTools
{
    private readonly AppDbContext _db;
    public SupplierOrdersTools(AppDbContext db) => _db = db;

    [McpServerTool, Description(
        "Liste les bons de commande fournisseurs avec filtres statut/fournisseur/période. " +
        "Statuts : Brouillon, Envoyée, ProformaReçue, ProformaValidée, FactureReçue, " +
        "EnCoursDeRéception, Réceptionnée, Convertie, Annulée.")]
    public async Task<object> ListSupplierOrders(
        [Description("Statut")] string? status = null,
        [Description("Id fournisseur")] long? supplierId = null,
        [Description("Date min (YYYY-MM-DD)")] string? dateFrom = null,
        [Description("Date max (YYYY-MM-DD, inclusive)")] string? dateTo = null,
        [Description("Nombre max (défaut 20, max 100)")] int limit = 20,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var q = _db.SupplierOrders.Include(o => o.Supplier).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)
            && Enum.TryParse<SupplierOrderStatus>(status.Trim(), true, out var s))
            q = q.Where(o => o.Status == s);
        if (supplierId.HasValue) q = q.Where(o => o.SupplierId == supplierId.Value);
        if (DateTime.TryParse(dateFrom, out var df)) q = q.Where(o => o.OrderDate >= df.Date);
        if (DateTime.TryParse(dateTo, out var dt)) q = q.Where(o => o.OrderDate < dt.Date.AddDays(1));

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(o => o.OrderDate).Take(limit).ToListAsync(ct);
        return new
        {
            totalMatching = total,
            returned = items.Count,
            items = items.Select(o => new
            {
                id = o.Id, reference = o.Reference,
                date = o.OrderDate.ToString("yyyy-MM-dd"),
                supplier = o.Supplier?.Name,
                status = o.Status.ToString(),
                currency = o.Currency,
                proformaReference = o.ProformaReference,
                containerReference = o.ContainerReference,
            }),
        };
    }

    [McpServerTool, Description(
        "Détail d'un BC fournisseur : lignes commandées avec prix FOB, proforma reçue, facture " +
        "fournisseur associée. Recherche par Id ou référence.")]
    public async Task<object?> GetSupplierOrder(
        [Description("Id numérique OU référence (ex: BC-2026-000042)")] string idOrRef,
        CancellationToken ct = default)
    {
        var order = long.TryParse(idOrRef, out var id)
            ? await LoadOrder(o => o.Id == id, ct)
            : await LoadOrder(o => o.Reference == idOrRef, ct);
        if (order is null) return new { error = $"BC fournisseur '{idOrRef}' introuvable." };

        return new
        {
            id = order.Id, reference = order.Reference,
            date = order.OrderDate.ToString("yyyy-MM-dd"),
            supplier = new { id = order.SupplierId, name = order.Supplier?.Name },
            status = order.Status.ToString(),
            currency = order.Currency,
            notes = order.Notes,
            proforma = new
            {
                reference = order.ProformaReference,
                receivedAt = order.ProformaReceivedAt?.ToString("yyyy-MM-dd"),
                hasFile = !string.IsNullOrEmpty(order.ProformaFilePath),
            },
            containerReference = order.ContainerReference,
            freightAmount = order.FreightAmount,
            paymentTerms = order.PaymentTerms,
            brand = order.Brand, origin = order.Origin,
            expectedShippingDate = order.ExpectedShippingDate?.ToString("yyyy-MM-dd"),
            lines = order.Lines.Select(l => new
            {
                lineId = l.Id, productId = l.ProductId,
                productCode = l.Product?.Code,
                productDesignation = l.Product?.Designation,
                quantity = l.Quantity,
                orderUnit = l.OrderUnit,
                unitsPerCarton = l.UnitsPerCarton,
                unitFobPrice = l.UnitFobPrice,
            }),
            supplierInvoice = order.SupplierInvoice is null ? null : new
            {
                id = order.SupplierInvoice.Id,
                invoiceReference = order.SupplierInvoice.InvoiceReference,
                invoiceDate = order.SupplierInvoice.InvoiceDate.ToString("yyyy-MM-dd"),
                totalAmountXof = order.SupplierInvoice.TotalAmountXof,
                status = order.SupplierInvoice.Status.ToString(),
                balanceDue = order.SupplierInvoice.BalanceDue,
            },
        };
    }

    private Task<Domain.Entities.SupplierOrder?> LoadOrder(
        System.Linq.Expressions.Expression<Func<Domain.Entities.SupplierOrder, bool>> predicate,
        CancellationToken ct)
        => _db.SupplierOrders
            .Include(o => o.Supplier)
            .Include(o => o.Lines).ThenInclude(l => l.Product)
            .Include(o => o.SupplierInvoice)
            .FirstOrDefaultAsync(predicate, ct);
}
