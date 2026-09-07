using System.ComponentModel;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

[McpServerToolType]
public sealed class SuppliersTools
{
    private readonly AppDbContext _db;
    public SuppliersTools(AppDbContext db) => _db = db;

    [McpServerTool, Description("Liste ou recherche les fournisseurs par nom/code.")]
    public async Task<object> ListSuppliers(
        [Description("Filtre nom (contient, insensible)")] string? query = null,
        [Description("Nombre max (défaut 50, max 200)")] int limit = 50,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 200);
        var q = _db.Suppliers.Include(s => s.Country).AsQueryable();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var pattern = $"%{query.Trim()}%";
            q = q.Where(s => EF.Functions.ILike(s.Name, pattern) || EF.Functions.ILike(s.Code, pattern));
        }
        var items = await q.OrderBy(s => s.Name).Take(limit).ToListAsync(ct);
        return new
        {
            totalReturned = items.Count,
            items = items.Select(s => new
            {
                id = s.Id,
                code = s.Code,
                name = s.Name,
                country = s.Country?.Name,
                email = s.Email,
                phone = s.Phone,
            }),
        };
    }

    [McpServerTool, Description(
        "Détail complet d'un fournisseur : coordonnées, nombre de produits catalogués, " +
        "commandes en cours, factures reçues avec solde impayé.")]
    public async Task<object?> GetSupplier(
        [Description("Id du fournisseur")] long id,
        CancellationToken ct = default)
    {
        var s = await _db.Suppliers.Include(x => x.Country).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s is null) return new { error = $"Fournisseur Id={id} introuvable." };

        var productsCount = await _db.Products.CountAsync(p => p.SupplierId == id, ct);
        var pendingStatuses = new[]
        {
            SupplierOrderStatus.Brouillon, SupplierOrderStatus.Envoyée,
            SupplierOrderStatus.ProformaReçue, SupplierOrderStatus.ProformaValidée,
            SupplierOrderStatus.FactureReçue, SupplierOrderStatus.EnCoursDeRéception,
        };
        var pendingOrdersCount = await _db.SupplierOrders
            .CountAsync(o => o.SupplierId == id && pendingStatuses.Contains(o.Status), ct);
        var invoices = await _db.SupplierInvoices
            .Where(i => i.SupplierId == id).ToListAsync(ct);
        var totalInvoicedXof = invoices.Sum(i => i.TotalAmountXof);
        var totalPaidXof = invoices.Sum(i => i.AmountPaid);
        var unpaidBalance = invoices.Where(i => i.Status != SupplierInvoiceStatus.Réglée)
                                    .Sum(i => i.BalanceDue);

        return new
        {
            id = s.Id, code = s.Code, name = s.Name,
            address = s.Address, postalBox = s.PostalBox, phone = s.Phone,
            email = s.Email, country = s.Country?.Name, contactPerson = s.ContactPerson,
            stats = new
            {
                productsCatalogued = productsCount,
                pendingOrders = pendingOrdersCount,
                invoicesCount = invoices.Count,
                totalInvoicedXof = totalInvoicedXof,
                totalPaidXof = totalPaidXof,
                unpaidBalanceXof = unpaidBalance,
            },
        };
    }
}
