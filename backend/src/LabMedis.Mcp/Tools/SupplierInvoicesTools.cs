using System.ComponentModel;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

[McpServerToolType]
public sealed class SupplierInvoicesTools
{
    private readonly AppDbContext _db;
    public SupplierInvoicesTools(AppDbContext db) => _db = db;

    [McpServerTool, Description(
        "Liste les factures fournisseurs avec filtres statut/fournisseur/période. " +
        "Statuts : NonReglée, PartReglée, Réglée.")]
    public async Task<object> ListSupplierInvoices(
        [Description("Statut")] string? status = null,
        [Description("Id fournisseur")] long? supplierId = null,
        [Description("Date min (YYYY-MM-DD)")] string? dateFrom = null,
        [Description("Date max (YYYY-MM-DD, inclusive)")] string? dateTo = null,
        [Description("Nombre max (défaut 20, max 100)")] int limit = 20,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var q = _db.SupplierInvoices.Include(i => i.Supplier).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)
            && Enum.TryParse<SupplierInvoiceStatus>(status.Trim(), true, out var s))
            q = q.Where(i => i.Status == s);
        if (supplierId.HasValue) q = q.Where(i => i.SupplierId == supplierId.Value);
        if (DateOnly.TryParse(dateFrom, out var df)) q = q.Where(i => i.InvoiceDate >= df);
        if (DateOnly.TryParse(dateTo, out var dt)) q = q.Where(i => i.InvoiceDate <= dt);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(i => i.InvoiceDate).Take(limit).ToListAsync(ct);
        return new
        {
            totalMatching = total,
            returned = items.Count,
            items = items.Select(i => new
            {
                id = i.Id,
                invoiceReference = i.InvoiceReference,
                date = i.InvoiceDate.ToString("yyyy-MM-dd"),
                dueDate = i.DueDate?.ToString("yyyy-MM-dd"),
                supplier = i.Supplier?.Name,
                status = i.Status.ToString(),
                currency = i.Currency,
                totalForeign = i.TotalAmountForeign,
                totalXof = i.TotalAmountXof,
                amountPaid = i.AmountPaid,
                balanceDue = i.BalanceDue,
                supplierOrderId = i.SupplierOrderId,
            }),
        };
    }

    [McpServerTool, Description(
        "Détail d'une facture fournisseur : montants XOF/devise, remise, avance, paiements, BC lié.")]
    public async Task<object?> GetSupplierInvoice(
        [Description("Id numérique OU référence facture")] string idOrRef,
        CancellationToken ct = default)
    {
        var i = long.TryParse(idOrRef, out var id)
            ? await Load(x => x.Id == id, ct)
            : await Load(x => x.InvoiceReference == idOrRef, ct);
        if (i is null) return new { error = $"Facture fournisseur '{idOrRef}' introuvable." };

        var payments = await _db.SupplierInvoicePayments
            .Where(p => p.SupplierInvoiceId == i.Id)
            .OrderBy(p => p.PaymentDate)
            .ToListAsync(ct);

        return new
        {
            id = i.Id,
            invoiceReference = i.InvoiceReference,
            date = i.InvoiceDate.ToString("yyyy-MM-dd"),
            dueDate = i.DueDate?.ToString("yyyy-MM-dd"),
            supplier = new { id = i.SupplierId, name = i.Supplier?.Name },
            supplierOrder = i.SupplierOrder is null ? null : new
            {
                id = i.SupplierOrder.Id, reference = i.SupplierOrder.Reference,
            },
            status = i.Status.ToString(),
            currency = i.Currency,
            exchangeRate = i.ExchangeRateToXof,
            amounts = new
            {
                totalForeign = i.TotalAmountForeign,
                totalXof = i.TotalAmountXof,
                discountForeign = i.DiscountAmountForeign,
                discountXof = i.DiscountAmountXof,
                advanceForeign = i.AdvanceAmountForeign,
                advanceXof = i.AdvanceAmountXof,
                netXof = i.NetAmountXof,
                amountPaid = i.AmountPaid,
                balanceDue = i.BalanceDue,
            },
            notes = i.Notes,
            payments = payments.Select(p => new
            {
                id = p.Id,
                date = p.PaymentDate.ToString("yyyy-MM-dd"),
                amount = p.Amount,
                method = p.PaymentMethod,
                reference = p.Reference,
                notes = p.Notes,
            }),
        };
    }

    private Task<Domain.Entities.SupplierInvoice?> Load(
        System.Linq.Expressions.Expression<Func<Domain.Entities.SupplierInvoice, bool>> predicate,
        CancellationToken ct)
        => _db.SupplierInvoices
            .Include(i => i.Supplier)
            .Include(i => i.SupplierOrder)
            .FirstOrDefaultAsync(predicate, ct);
}
