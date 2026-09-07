using System.ComponentModel;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;

namespace LabMedis.Mcp.Tools;

[McpServerToolType]
public sealed class StockMovementsTools
{
    private readonly AppDbContext _db;
    public StockMovementsTools(AppDbContext db) => _db = db;

    [McpServerTool, Description(
        "Liste des mouvements de stock avec filtres. Types : PurchaseEntry (entrée arrivage), " +
        "SaleExit (sortie vente), Loss (perte), Adjustment (ajustement), Return (retour client), " +
        "SupplierReturn (retour fournisseur), Transfer (transfert).")]
    public async Task<object> ListStockMovements(
        [Description("Id produit")] long? productId = null,
        [Description("Id magasin")] long? warehouseId = null,
        [Description("Type de mouvement")] string? movementType = null,
        [Description("Date min (YYYY-MM-DD)")] string? dateFrom = null,
        [Description("Date max (YYYY-MM-DD, inclusive)")] string? dateTo = null,
        [Description("Nombre max (défaut 50, max 200)")] int limit = 50,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 200);
        var q = _db.StockMovements
            .Include(m => m.Product)
            .Include(m => m.Warehouse)
            .Include(m => m.PurchaseLine)
            .AsQueryable();
        if (productId.HasValue) q = q.Where(m => m.ProductId == productId.Value);
        if (warehouseId.HasValue) q = q.Where(m => m.WarehouseId == warehouseId.Value);
        if (!string.IsNullOrWhiteSpace(movementType)
            && Enum.TryParse<StockMovementType>(movementType.Trim(), true, out var t))
            q = q.Where(m => m.MovementType == t);
        if (DateTime.TryParse(dateFrom, out var df)) q = q.Where(m => m.MovementDate >= df.Date);
        if (DateTime.TryParse(dateTo, out var dt)) q = q.Where(m => m.MovementDate < dt.Date.AddDays(1));

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(m => m.MovementDate).ThenByDescending(m => m.Id)
            .Take(limit).ToListAsync(ct);
        return new
        {
            totalMatching = total,
            returned = items.Count,
            items = items.Select(m => new
            {
                id = m.Id,
                date = m.MovementDate.ToString("yyyy-MM-dd"),
                type = m.MovementType.ToString(),
                productCode = m.Product?.Code,
                productDesignation = m.Product?.Designation,
                warehouse = m.Warehouse?.Name,
                lotNumber = m.PurchaseLine?.LotNumber,
                quantity = m.Quantity,
                reference = m.Reference,
                reason = m.Reason,
                notes = m.Notes,
            }),
        };
    }

    [McpServerTool, Description(
        "Historique des mouvements d'un produit (utile pour tracer entrées et sorties, " +
        "identifier les ventes récentes, les pertes, etc.).")]
    public async Task<object> GetProductStockHistory(
        [Description("Id du produit")] long productId,
        [Description("Nombre max de mouvements (défaut 50, max 500)")] int limit = 50,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 500);
        var movements = await _db.StockMovements
            .Include(m => m.Warehouse)
            .Include(m => m.PurchaseLine)
            .Where(m => m.ProductId == productId)
            .OrderByDescending(m => m.MovementDate).ThenByDescending(m => m.Id)
            .Take(limit)
            .ToListAsync(ct);

        return new
        {
            productId,
            returned = movements.Count,
            items = movements.Select(m => new
            {
                id = m.Id,
                date = m.MovementDate.ToString("yyyy-MM-dd"),
                type = m.MovementType.ToString(),
                warehouse = m.Warehouse?.Name,
                lotNumber = m.PurchaseLine?.LotNumber,
                quantity = m.Quantity,
                reference = m.Reference,
                reason = m.Reason,
            }),
        };
    }
}
