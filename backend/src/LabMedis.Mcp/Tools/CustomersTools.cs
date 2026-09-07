using System.ComponentModel;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

[McpServerToolType]
public sealed class CustomersTools
{
    private readonly AppDbContext _db;
    public CustomersTools(AppDbContext db) => _db = db;

    [McpServerTool, Description("Liste ou recherche les clients par nom/ville.")]
    public async Task<object> ListCustomers(
        [Description("Filtre nom ou ville (contient, insensible)")] string? query = null,
        [Description("Nombre max (défaut 50, max 200)")] int limit = 50,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 200);
        var q = _db.Customers.Include(c => c.Country).AsQueryable();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var pattern = $"%{query.Trim()}%";
            q = q.Where(c => EF.Functions.ILike(c.Name, pattern)
                          || (c.City != null && EF.Functions.ILike(c.City, pattern)));
        }
        var items = await q.OrderBy(c => c.Name).Take(limit).ToListAsync(ct);
        return new
        {
            totalReturned = items.Count,
            items = items.Select(c => new
            {
                id = c.Id, name = c.Name, city = c.City,
                country = c.Country?.Name, phone = c.Phone, email = c.Email,
            }),
        };
    }

    [McpServerTool, Description(
        "Détail d'un client : coordonnées, commandes récentes, factures avec solde impayé.")]
    public async Task<object?> GetCustomer(
        [Description("Id du client")] long id,
        [Description("Nombre de commandes récentes à retourner (défaut 5)")] int recentOrders = 5,
        CancellationToken ct = default)
    {
        var c = await _db.Customers.Include(x => x.Country).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return new { error = $"Client Id={id} introuvable." };

        recentOrders = Math.Clamp(recentOrders, 0, 50);
        var orders = await _db.CustomerOrders
            .Where(o => o.CustomerId == id)
            .OrderByDescending(o => o.OrderDate)
            .Take(recentOrders)
            .Select(o => new { o.Id, o.Reference, o.OrderDate, o.Status, o.TotalTtc })
            .ToListAsync(ct);

        var invoices = await _db.Invoices.Where(i => i.CustomerId == id).ToListAsync(ct);
        var totalInvoicedXof = invoices.Sum(i => i.TotalTtc);
        var totalPaidXof = invoices.Sum(i => i.AmountPaid);
        var unpaidBalance = invoices.Where(i => i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                                    .Sum(i => i.TotalTtc - i.AmountPaid);

        return new
        {
            id = c.Id, name = c.Name, address = c.Address, postalBox = c.PostalBox,
            phone = c.Phone, email = c.Email, city = c.City, country = c.Country?.Name,
            contactPerson = c.ContactPerson,
            stats = new
            {
                totalOrders = await _db.CustomerOrders.CountAsync(o => o.CustomerId == id, ct),
                totalInvoices = invoices.Count,
                totalInvoicedXof = totalInvoicedXof,
                totalPaidXof = totalPaidXof,
                unpaidBalanceXof = unpaidBalance,
            },
            recentOrders = orders.Select(o => new
            {
                id = o.Id, reference = o.Reference,
                date = o.OrderDate.ToString("yyyy-MM-dd"),
                status = o.Status.ToString(),
                totalTtc = o.TotalTtc,
            }),
        };
    }
}
