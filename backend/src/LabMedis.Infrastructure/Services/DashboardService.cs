using LabMedis.Application.Dtos.Dashboard;
using LabMedis.Application.Services;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LabMedis.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db) => _db = db;

    public async Task<DashboardSummaryDto> GetSummaryAsync(
        DateOnly dateFrom,
        DateOnly dateTo,
        CancellationToken ct = default)
    {
        var from = dateFrom.ToDateTime(TimeOnly.MinValue);
        // fin inclusive : jusqu'à minuit du lendemain
        var toExclusive = dateTo.AddDays(1).ToDateTime(TimeOnly.MinValue);

        // ── Achats (factures fournisseurs reçues, sens comptable) ──────────
        // SupplierInvoice.InvoiceDate est un DateOnly.
        var supplierInvoicesQ = _db.SupplierInvoices
            .Where(si => si.InvoiceDate >= dateFrom && si.InvoiceDate <= dateTo);
        var supplierInvoicesCount = await supplierInvoicesQ.CountAsync(ct);
        var supplierInvoicesTotalXof = await supplierInvoicesQ.SumAsync(si => (decimal?)si.TotalAmountXof, ct) ?? 0m;

        // ── Ventes (factures clients, statut != Draft ni Cancelled) ────────
        var salesQ = _db.Invoices
            .Where(i => i.InvoiceDate >= from && i.InvoiceDate < toExclusive
                     && i.Status != InvoiceStatus.Draft
                     && i.Status != InvoiceStatus.Cancelled);
        var salesCount = await salesQ.CountAsync(ct);
        var salesTotalXof = await salesQ.SumAsync(i => (decimal?)i.TotalTtc, ct) ?? 0m;

        // ── Livraisons ─────────────────────────────────────────────────────
        var deliveriesCount = await _db.Deliveries
            .CountAsync(d => d.DeliveryDate >= from && d.DeliveryDate < toExclusive, ct);

        // ── Mouvements de stock ────────────────────────────────────────────
        var movementsCount = await _db.StockMovements
            .CountAsync(m => m.MovementDate >= from && m.MovementDate < toExclusive, ct);

        // ── All-time (référentiel actif) ───────────────────────────────────
        var productsCount = await _db.Products.CountAsync(ct);
        var suppliersCount = await _db.Suppliers.CountAsync(ct);
        var customersCount = await _db.Customers.CountAsync(ct);

        return new DashboardSummaryDto(
            DateFrom: dateFrom,
            DateTo: dateTo,
            SupplierInvoicesCount: supplierInvoicesCount,
            SupplierInvoicesTotalXof: supplierInvoicesTotalXof,
            SalesCount: salesCount,
            SalesTotalXof: salesTotalXof,
            DeliveriesCount: deliveriesCount,
            StockMovementsCount: movementsCount,
            ProductsCount: productsCount,
            SuppliersCount: suppliersCount,
            CustomersCount: customersCount);
    }
}
