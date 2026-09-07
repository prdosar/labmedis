using System.ComponentModel;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

/// <summary>Outils MCP en lecture seule sur le catalogue produit + les lots en stock.</summary>
[McpServerToolType]
public sealed class ProductsTools
{
    private readonly AppDbContext _db;
    public ProductsTools(AppDbContext db) => _db = db;

    [McpServerTool, Description(
        "Recherche des produits par mot-clé sur le code, la désignation, le CIP ou le principe actif. " +
        "Filtres optionnels : fournisseur, catégorie, uniquement produits avec stock. Retourne un aperçu " +
        "(id, code, désignation, fournisseur, stock total) triés par pertinence.")]
    public async Task<object> SearchProducts(
        [Description("Mot-clé (contient, insensible à la casse). Vide = tous.")] string? query = null,
        [Description("Id du fournisseur")] long? supplierId = null,
        [Description("Id de la catégorie")] long? categoryId = null,
        [Description("Si true, seuls les produits avec stock > 0")] bool hasStockOnly = false,
        [Description("Nombre max de résultats (défaut 20, max 100)")] int limit = 20,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var q = _db.Products
            .Include(p => p.Supplier)
            .Include(p => p.Category)
            .Include(p => p.Packaging)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var pattern = $"%{query.Trim()}%";
            q = q.Where(p =>
                EF.Functions.ILike(p.Code, pattern)
             || EF.Functions.ILike(p.Designation, pattern)
             || (p.CipCode != null && EF.Functions.ILike(p.CipCode, pattern))
             || (p.ActiveIngredient != null && EF.Functions.ILike(p.ActiveIngredient, pattern)));
        }
        if (supplierId.HasValue) q = q.Where(p => p.SupplierId == supplierId.Value);
        if (categoryId.HasValue) q = q.Where(p => p.CategoryId == categoryId.Value);

        var products = await q.OrderBy(p => p.Designation).Take(limit * 2).ToListAsync(ct);
        var ids = products.Select(p => p.Id).ToList();
        var stockMap = await _db.PurchaseLines
            .Where(l => ids.Contains(l.ProductId))
            .GroupBy(l => l.ProductId)
            .Select(g => new { g.Key, Stock = g.Sum(x => x.QuantityRemaining) })
            .ToDictionaryAsync(x => x.Key, x => x.Stock, ct);

        var rows = products.Select(p =>
        {
            var stock = stockMap.GetValueOrDefault(p.Id);
            var upc = p.Packaging?.UnitsPerPackaging ?? 1;
            return new
            {
                id = p.Id,
                code = p.Code,
                designation = p.Designation,
                cip = p.CipCode,
                supplier = p.Supplier?.Name,
                category = p.Category?.Name,
                packaging = p.Packaging?.Name,
                unitsPerCarton = upc,
                stockUnits = stock,
                stockCartons = upc > 1 ? Math.Round((decimal)stock / upc, 2) : 0m,
            };
        });
        if (hasStockOnly) rows = rows.Where(r => r.stockUnits > 0);
        var final = rows.Take(limit).ToList();
        return new { totalReturned = final.Count, items = final };
    }

    [McpServerTool, Description(
        "Détail complet d'un produit : identité, catégorisation, fournisseur, stock agrégé + tous les " +
        "lots en stock (numéro de lot, péremption, quantité restante, prix de revient, magasin).")]
    public async Task<object?> GetProduct(
        [Description("Id numérique OU code du produit")] string idOrCode,
        CancellationToken ct = default)
    {
        var product = long.TryParse(idOrCode, out var id)
            ? await LoadProduct(p => p.Id == id, ct)
            : await LoadProduct(p => p.Code == idOrCode, ct);
        if (product is null) return new { error = $"Produit '{idOrCode}' introuvable." };

        var lots = await _db.PurchaseLines
            .Include(l => l.Purchase)
            .Where(l => l.ProductId == product.Id && l.QuantityRemaining > 0)
            .OrderBy(l => l.ExpirationDate)
            .ToListAsync(ct);

        var totalStock = lots.Sum(l => l.QuantityRemaining);
        var upc = product.Packaging?.UnitsPerPackaging ?? 1;

        return new
        {
            id = product.Id,
            code = product.Code,
            designation = product.Designation,
            cip = product.CipCode,
            activeIngredient = product.ActiveIngredient,
            supplier = new { id = product.SupplierId, name = product.Supplier?.Name, code = product.Supplier?.Code },
            category = product.Category?.Name,
            therapeuticClass = product.TherapeuticClass?.Name,
            productForm = product.ProductForm?.Name,
            dosage = product.Dosage?.Name,
            packaging = new { name = product.Packaging?.Name, unitsPerPackaging = upc },
            warehouse = product.Warehouse?.Name,
            originCountry = product.OriginCountry?.Name,
            stock = new
            {
                totalUnits = totalStock,
                totalCartons = upc > 1 ? Math.Round((decimal)totalStock / upc, 2) : 0m,
                lotsCount = lots.Count,
            },
            lots = lots.Select(l => new
            {
                purchaseLineId = l.Id,
                lotNumber = l.LotNumber,
                expirationDate = l.ExpirationDate?.ToString("yyyy-MM-dd"),
                quantityRemaining = l.QuantityRemaining,
                unitsPerCarton = l.UnitsPerCarton,
                unitCostXof = l.UnitCostPriceXof,
                sellingPriceHt = l.TargetSellingPriceHt > 0 ? l.TargetSellingPriceHt : l.CalculatedSellingPriceHt,
                purchaseRef = l.Purchase?.Reference,
                purchaseDate = l.Purchase?.PurchaseDate.ToString("yyyy-MM-dd"),
            }),
        };
    }

    [McpServerTool, Description(
        "Liste les lots proches péremption dans la fenêtre demandée (défaut 6 mois). " +
        "Utile pour identifier les lots à écouler en priorité.")]
    public async Task<object> ListExpiringProducts(
        [Description("Fenêtre en mois (défaut 6, max 24)")] int withinMonths = 6,
        [Description("Filtre fournisseur")] long? supplierId = null,
        [Description("Filtre magasin")] long? warehouseId = null,
        [Description("Nombre max (défaut 50, max 200)")] int limit = 50,
        CancellationToken ct = default)
    {
        withinMonths = Math.Clamp(withinMonths, 1, 24);
        limit = Math.Clamp(limit, 1, 200);
        var today = DateTime.UtcNow.Date;
        var deadline = today.AddMonths(withinMonths);

        var q = _db.PurchaseLines
            .Include(l => l.Product).ThenInclude(p => p!.Supplier)
            .Include(l => l.Product).ThenInclude(p => p!.Warehouse)
            .Where(l => l.ExpirationDate != null
                     && l.ExpirationDate < deadline
                     && l.QuantityRemaining > 0);
        if (supplierId.HasValue) q = q.Where(l => l.Product!.SupplierId == supplierId.Value);
        if (warehouseId.HasValue) q = q.Where(l => l.Product!.WarehouseId == warehouseId.Value);

        var total = await q.CountAsync(ct);
        var lots = await q.OrderBy(l => l.ExpirationDate).Take(limit).ToListAsync(ct);

        return new
        {
            totalMatching = total,
            windowMonths = withinMonths,
            items = lots.Select(l => new
            {
                productId = l.ProductId,
                productCode = l.Product?.Code,
                productDesignation = l.Product?.Designation,
                supplier = l.Product?.Supplier?.Name,
                warehouse = l.Product?.Warehouse?.Name,
                lotNumber = l.LotNumber,
                expirationDate = l.ExpirationDate!.Value.ToString("yyyy-MM-dd"),
                daysRemaining = (int)((l.ExpirationDate!.Value - today).TotalDays),
                quantityRemaining = l.QuantityRemaining,
            }),
        };
    }

    [McpServerTool, Description(
        "Liste les produits en stock faible (sous le seuil 10 cartons ou 50 unités selon le conditionnement).")]
    public async Task<object> ListLowStockProducts(
        [Description("Filtre fournisseur")] long? supplierId = null,
        [Description("Filtre catégorie")] long? categoryId = null,
        [Description("Nombre max (défaut 50, max 200)")] int limit = 50,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 200);
        const int LowCartonsThreshold = 10;
        const int LowUnitsThreshold = 50;

        var stockByProduct = await _db.PurchaseLines
            .GroupBy(l => l.ProductId)
            .Select(g => new { ProductId = g.Key, Stock = g.Sum(x => x.QuantityRemaining) })
            .ToListAsync(ct);
        var productIds = stockByProduct.Select(s => s.ProductId).ToList();

        var productsQ = _db.Products
            .Include(p => p.Packaging).Include(p => p.Supplier).Include(p => p.Category)
            .Where(p => productIds.Contains(p.Id));
        if (supplierId.HasValue) productsQ = productsQ.Where(p => p.SupplierId == supplierId.Value);
        if (categoryId.HasValue) productsQ = productsQ.Where(p => p.CategoryId == categoryId.Value);
        var products = await productsQ.ToListAsync(ct);
        var stockMap = stockByProduct.ToDictionary(s => s.ProductId, s => s.Stock);

        var rows = new List<object>();
        foreach (var p in products)
        {
            var stock = stockMap.GetValueOrDefault(p.Id);
            var upc = p.Packaging?.UnitsPerPackaging ?? 1;
            var isCarton = upc > 1;
            var thresholdUnits = isCarton ? LowCartonsThreshold * upc : LowUnitsThreshold;
            if (stock >= thresholdUnits) continue;
            rows.Add(new
            {
                productId = p.Id,
                code = p.Code,
                designation = p.Designation,
                supplier = p.Supplier?.Name,
                category = p.Category?.Name,
                stockUnits = stock,
                stockCartons = isCarton ? Math.Round((decimal)stock / upc, 2) : 0m,
                thresholdCartons = isCarton ? LowCartonsThreshold : 0,
                thresholdUnits = thresholdUnits,
                isCartonBased = isCarton,
            });
        }
        return new
        {
            totalMatching = rows.Count,
            items = rows.Take(limit),
        };
    }

    private Task<Domain.Entities.Product?> LoadProduct(
        System.Linq.Expressions.Expression<Func<Domain.Entities.Product, bool>> predicate,
        CancellationToken ct)
        => _db.Products
            .Include(p => p.Supplier)
            .Include(p => p.Category)
            .Include(p => p.TherapeuticClass)
            .Include(p => p.ProductForm)
            .Include(p => p.Dosage)
            .Include(p => p.Packaging)
            .Include(p => p.Warehouse)
            .Include(p => p.OriginCountry)
            .FirstOrDefaultAsync(predicate, ct);
}
