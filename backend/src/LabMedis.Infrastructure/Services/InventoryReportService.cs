using LabMedis.Application.Dtos.Reports;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LabMedis.Infrastructure.Services;

public class InventoryReportService : IInventoryReportService
{
    private readonly AppDbContext _db;

    public InventoryReportService(AppDbContext db) => _db = db;

    public async Task<InventoryReportDto> GetInventoryReportAsync(
        DateOnly dateFrom,
        DateOnly dateTo,
        long? supplierId = null,
        string? movementType = null,
        CancellationToken ct = default)
    {
        if (dateTo < dateFrom)
            throw new DomainException("La date de fin doit être postérieure ou égale à la date de début.");

        StockMovementType? typeFilter = null;
        if (!string.IsNullOrWhiteSpace(movementType))
        {
            if (!Enum.TryParse<StockMovementType>(movementType, ignoreCase: true, out var parsed))
                throw new DomainException($"Type de mouvement inconnu : '{movementType}'.");
            typeFilter = parsed;
        }

        var fromUtc = dateFrom.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toUtcExclusive = dateTo.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        // Mouvements sur la période, joints à produit + fournisseur pour filtrer
        var movementsQuery = _db.StockMovements
            .Include(sm => sm.Product).ThenInclude(p => p!.Supplier)
            .Include(sm => sm.Product).ThenInclude(p => p!.Packaging)
            .Where(sm => sm.MovementDate >= fromUtc && sm.MovementDate < toUtcExclusive);

        if (supplierId.HasValue)
            movementsQuery = movementsQuery.Where(sm => sm.Product!.SupplierId == supplierId.Value);

        if (typeFilter.HasValue)
            movementsQuery = movementsQuery.Where(sm => sm.MovementType == typeFilter.Value);

        var movements = await movementsQuery.ToListAsync(ct);

        if (movements.Count == 0)
        {
            string? supplierNameEmpty = supplierId.HasValue
                ? await _db.Suppliers.Where(s => s.Id == supplierId.Value).Select(s => s.Name).FirstOrDefaultAsync(ct)
                : null;
            return new InventoryReportDto(
                dateFrom, dateTo, supplierId, supplierNameEmpty, movementType,
                Array.Empty<InventoryReportRowDto>(),
                new InventoryReportTotalsDto(0, 0m, 0, 0m));
        }

        var productIds = movements.Select(m => m.ProductId).Distinct().ToList();

        // Stock actuel : somme des QuantityRemaining des purchase_lines actives
        var stockByProduct = await _db.PurchaseLines
            .Where(pl => productIds.Contains(pl.ProductId))
            .GroupBy(pl => pl.ProductId)
            .Select(g => new { ProductId = g.Key, Stock = g.Sum(pl => pl.QuantityRemaining) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Stock, ct);

        var productLookup = movements
            .Where(m => m.Product is not null)
            .Select(m => m.Product!)
            .GroupBy(p => p.Id)
            .ToDictionary(g => g.Key, g => g.First());

        var rows = productLookup.Values
            .OrderBy(p => p.Designation)
            .Select(p =>
            {
                var productMovements = movements.Where(m => m.ProductId == p.Id).ToList();
                var upc = p.Packaging?.UnitsPerPackaging is int u && u > 0 ? u : 1;

                var byType = productMovements
                    .GroupBy(m => m.MovementType.ToString())
                    .ToDictionary(
                        g => g.Key,
                        g =>
                        {
                            var units = g.Sum(m => m.Quantity);
                            return new InventoryMovementCellDto(units, ToCartons(units, upc));
                        });

                var netUnits = productMovements.Sum(m => SignedQuantity(m.MovementType, m.Quantity));
                var currentStock = stockByProduct.GetValueOrDefault(p.Id, 0);

                return new InventoryReportRowDto(
                    p.Id,
                    p.Code,
                    p.Designation,
                    p.SupplierId,
                    p.Supplier?.Name,
                    upc,
                    currentStock,
                    ToCartons(currentStock, upc),
                    netUnits,
                    ToCartons(netUnits, upc),
                    byType);
            })
            .ToList();

        var totals = new InventoryReportTotalsDto(
            rows.Sum(r => r.CurrentStockUnits),
            rows.Sum(r => r.CurrentStockCartons),
            rows.Sum(r => r.NetMovementUnits),
            rows.Sum(r => r.NetMovementCartons));

        string? supplierName = null;
        if (supplierId.HasValue)
        {
            supplierName = rows.FirstOrDefault()?.SupplierName
                ?? await _db.Suppliers.Where(s => s.Id == supplierId.Value).Select(s => s.Name).FirstOrDefaultAsync(ct);
        }

        return new InventoryReportDto(dateFrom, dateTo, supplierId, supplierName, movementType, rows, totals);
    }

    private static decimal ToCartons(int units, int unitsPerCarton)
    {
        if (unitsPerCarton <= 0) return units;
        return Math.Round((decimal)units / unitsPerCarton, 2);
    }

    /// <summary>Signe : entrées (achat, retour client) positives ; sorties (vente, perte, retour fourn.) négatives ; ajustement/transfert signés selon Quantity.</summary>
    private static int SignedQuantity(StockMovementType type, int quantity) => type switch
    {
        StockMovementType.PurchaseEntry => +quantity,
        StockMovementType.Return        => +quantity,
        StockMovementType.SaleExit      => -quantity,
        StockMovementType.Loss          => -quantity,
        StockMovementType.SupplierReturn=> -quantity,
        // Adjustment / Transfer : la quantité stockée peut être positive ou négative
        _                               =>  quantity,
    };
}
