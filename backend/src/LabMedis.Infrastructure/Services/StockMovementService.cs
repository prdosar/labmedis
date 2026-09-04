using LabMedis.Application.Dtos.StockMovements;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class StockMovementService : BaseRepository<StockMovement>, IStockMovementService
{
    private readonly ILogger<StockMovementService> _logger;

    public StockMovementService(AppDbContext dbContext, ILogger<StockMovementService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<StockMovementDto>> GetAllAsync(
        int page = 1, int size = 10,
        long? productId = null, long? warehouseId = null,
        string? movementType = null,
        DateTime? dateFrom = null, DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var q = DbSet.AsQueryable();
        if (productId.HasValue) q = q.Where(m => m.ProductId == productId.Value);
        if (warehouseId.HasValue) q = q.Where(m => m.WarehouseId == warehouseId.Value);
        if (!string.IsNullOrWhiteSpace(movementType) &&
            Enum.TryParse<StockMovementType>(movementType, ignoreCase: true, out var mt))
            q = q.Where(m => m.MovementType == mt);
        if (dateFrom.HasValue) q = q.Where(m => m.MovementDate >= dateFrom.Value.Date);
        if (dateTo.HasValue) q = q.Where(m => m.MovementDate < dateTo.Value.Date.AddDays(1));

        var skip = (page - 1) * size;
        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .Include(m => m.Product)
            .Include(m => m.Warehouse)
            .Include(m => m.PurchaseLine)
            .OrderByDescending(m => m.MovementDate)
            .ThenByDescending(m => m.Id)
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<StockMovementDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task CancelAsync(long id, CancellationToken cancellationToken = default)
    {
        var movement = await DbSet
            .Include(m => m.PurchaseLine)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken)
            ?? throw new DomainException($"Mouvement introuvable (Id={id}).");

        var isManualExit = movement.MovementType == StockMovementType.Loss
                        || movement.MovementType == StockMovementType.Adjustment;
        if (!isManualExit)
            throw new DomainException(
                "Seuls les mouvements manuels (Perte, Ajustement) peuvent être annulés depuis cette page. " +
                "Pour les autres, annulez le document parent (facture, commande, retour).");

        if (movement.PurchaseLine is not null)
        {
            movement.PurchaseLine.ReleaseStock(movement.Quantity);
            DbContext.PurchaseLines.Update(movement.PurchaseLine);
        }

        DbSet.Remove(movement);
        await DbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Mouvement de stock annulé Id={Id} Type={Type} Qty={Qty}",
            movement.Id, movement.MovementType, movement.Quantity);
    }

    public async Task<PagedResult<StockMovementDto>> GetByProductAsync(long productId, int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(m => m.ProductId == productId, cancellationToken);
        var items = await DbSet
            .Include(m => m.Product)
            .Include(m => m.Warehouse)
            .Include(m => m.PurchaseLine)
            .Where(m => m.ProductId == productId)
            .OrderByDescending(m => m.MovementDate)
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<StockMovementDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<PagedResult<StockMovementDto>> GetByWarehouseAsync(long warehouseId, int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(m => m.WarehouseId == warehouseId, cancellationToken);
        var items = await DbSet
            .Include(m => m.Product)
            .Include(m => m.Warehouse)
            .Include(m => m.PurchaseLine)
            .Where(m => m.WarehouseId == warehouseId)
            .OrderByDescending(m => m.MovementDate)
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<StockMovementDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<StockMovementDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await DbSet
            .Include(m => m.Product)
            .Include(m => m.Warehouse)
            .Include(m => m.PurchaseLine)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<StockMovementDto> CreateAsync(StockMovementCreateDto dto, CancellationToken cancellationToken = default)
    {
        if (!await DbContext.Products.AnyAsync(p => p.Id == dto.ProductId, cancellationToken))
            throw new DomainException($"Produit introuvable (Id={dto.ProductId}).");

        if (!await DbContext.Warehouses.AnyAsync(w => w.Id == dto.WarehouseId, cancellationToken))
            throw new DomainException($"Magasin introuvable (Id={dto.WarehouseId}).");

        if (dto.PurchaseLineId.HasValue)
        {
            var purchaseLine = await DbContext.PurchaseLines.FirstOrDefaultAsync(l => l.Id == dto.PurchaseLineId, cancellationToken)
                ?? throw new DomainException($"Ligne d'arrivage introuvable (Id={dto.PurchaseLineId}).");
            if (purchaseLine.ProductId != dto.ProductId)
                throw new DomainException("La ligne d'arrivage ne correspond pas au produit sélectionné.");
        }

        if (dto.Quantity <= 0)
            throw new DomainException("La quantité du mouvement doit être strictement positive.");

        var entity = new StockMovement
        {
            ProductId = dto.ProductId,
            WarehouseId = dto.WarehouseId,
            PurchaseLineId = dto.PurchaseLineId,
            MovementType = dto.MovementType,
            Quantity = dto.Quantity,
            MovementDate = dto.MovementDate,
            Reference = Trim(dto.Reference),
            Reason = Trim(dto.Reason),
            Notes = Trim(dto.Notes)
        };

        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Mouvement de stock créé Id={Id} Type={Type} Qty={Qty}", entity.Id, entity.MovementType, entity.Quantity);
        return await GetByIdAsync(entity.Id, cancellationToken) ?? ToDto(entity);
    }

    public async Task<StockMovementDto> CreateDiverseExitAsync(DiverseExitCreateDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            throw new DomainException("Le motif de la sortie est obligatoire.");

        if (!await DbContext.Products.AnyAsync(p => p.Id == dto.ProductId, cancellationToken))
            throw new DomainException($"Produit introuvable (Id={dto.ProductId}).");

        if (!await DbContext.Warehouses.AnyAsync(w => w.Id == dto.WarehouseId, cancellationToken))
            throw new DomainException($"Magasin introuvable (Id={dto.WarehouseId}).");

        if (!dto.PurchaseLineId.HasValue)
            throw new DomainException("Le lot est obligatoire pour une sortie de stock.");

        var purchaseLine = await DbContext.PurchaseLines
            .FirstOrDefaultAsync(l => l.Id == dto.PurchaseLineId, cancellationToken)
            ?? throw new DomainException($"Ligne d'arrivage introuvable (Id={dto.PurchaseLineId}).");

        if (purchaseLine.ProductId != dto.ProductId)
            throw new DomainException("La ligne d'arrivage ne correspond pas au produit sélectionné.");

        if (dto.Quantity <= 0)
            throw new DomainException("La quantité doit être strictement positive.");

        if (purchaseLine.QuantityRemaining < dto.Quantity)
            throw new DomainException(
                $"Stock insuffisant sur le lot '{purchaseLine.LotNumber}' : disponible={purchaseLine.QuantityRemaining}, demandé={dto.Quantity}.");

        purchaseLine.ConsumeStock(dto.Quantity);
        DbContext.PurchaseLines.Update(purchaseLine);

        var reasonLower = dto.Reason.ToLowerInvariant();
        var movementType = reasonLower.Contains("ajustement") || reasonLower.Contains("inventaire")
            ? StockMovementType.Adjustment
            : StockMovementType.Loss;

        var entity = new StockMovement
        {
            ProductId = dto.ProductId,
            WarehouseId = dto.WarehouseId,
            PurchaseLineId = dto.PurchaseLineId,
            MovementType = movementType,
            Quantity = dto.Quantity,
            MovementDate = dto.ExitDate ?? DateTime.UtcNow,
            Reason = dto.Reason.Trim(),
            Notes = Trim(dto.Notes),
        };

        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Sortie diverse créée Id={Id} Motif={Reason} Qty={Qty}", entity.Id, entity.Reason, entity.Quantity);
        return await GetByIdAsync(entity.Id, cancellationToken) ?? ToDto(entity);
    }

    private static StockMovementDto ToDto(StockMovement m) => new(
        m.Id,
        m.ProductId, m.Product?.Code, m.Product?.Designation,
        m.WarehouseId, m.Warehouse?.Name,
        m.PurchaseLineId ?? 0, m.PurchaseLine?.LotNumber,
        m.MovementType.ToString(),
        m.Quantity, m.MovementDate,
        m.Reference, m.Reason, m.Notes,
        m.CreatedAt, m.UpdatedAt);

    public async Task PostOpeningInventoryAsync(OpeningInventoryInput input, CancellationToken ct = default)
    {
        if (input.Lines.Count == 0)
            throw new DomainException("L'inventaire doit contenir au moins une ligne.");

        var productIds = input.Lines.Select(l => l.ProductId).Distinct().ToList();
        var products = await DbContext.Products
            .Where(p => productIds.Contains(p.Id) && !p.IsDeleted)
            .ToDictionaryAsync(p => p.Id, ct);

        var warehouseIds = input.Lines.Select(l => l.WarehouseId).Distinct().ToList();
        var warehouses = await DbContext.Warehouses
            .Where(w => warehouseIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, ct);

        foreach (var line in input.Lines)
        {
            if (!products.ContainsKey(line.ProductId))
                throw new DomainException($"Produit introuvable (Id={line.ProductId}).");
            if (!warehouses.ContainsKey(line.WarehouseId))
                throw new DomainException($"Magasin introuvable (Id={line.WarehouseId}).");
            if (line.Quantity <= 0)
                throw new DomainException($"Quantité invalide pour le produit Id={line.ProductId}.");
        }

        var date = input.Date.Date;
        var bySupplier = input.Lines.GroupBy(l => products[l.ProductId].SupplierId).ToList();

        var refPrefix = $"INV-OUV-{date:yyyyMMdd}";
        var existingRefs = await DbContext.Purchases
            .Where(p => p.Reference.StartsWith(refPrefix))
            .Select(p => p.Reference)
            .ToListAsync(ct);
        var nextSeq = 1;
        foreach (var r in existingRefs)
        {
            var suffix = r.Length > refPrefix.Length && r[refPrefix.Length] == '-'
                ? r[(refPrefix.Length + 1)..]
                : "0";
            if (int.TryParse(suffix, out var n) && n >= nextSeq)
                nextSeq = n + 1;
            else if (r == refPrefix && nextSeq < 2)
                nextSeq = 2;
        }

        for (var i = 0; i < bySupplier.Count; i++)
        {
            var group = bySupplier[i];
            var supplierId = group.Key;
            var supplier = await DbContext.Suppliers
                .FirstOrDefaultAsync(s => s.Id == supplierId && !s.IsDeleted, ct)
                ?? throw new DomainException($"Fournisseur introuvable (Id={supplierId}).");

            var purchaseRef = $"{refPrefix}-{nextSeq + i}";

            var purchase = new Purchase
            {
                Reference = purchaseRef,
                PurchaseDate = date,
                ArrivalDate = date,
                SupplierId = supplierId,
                PurchaseCurrency = Currency.XOF,
                TransportMode = "Inventaire d'ouverture",
                Notes = "Inventaire d'ouverture initial"
            };
            purchase.SetExchangeRate(1m);
            DbContext.Purchases.Add(purchase);

            var autoLotCounter = new Dictionary<long, int>();
            foreach (var lineInput in group)
            {
                var product = products[lineInput.ProductId];
                string lotNumber;
                if (!string.IsNullOrWhiteSpace(lineInput.LotNumber))
                {
                    lotNumber = lineInput.LotNumber.Trim();
                }
                else
                {
                    var count = autoLotCounter.GetValueOrDefault(product.Id) + 1;
                    autoLotCounter[product.Id] = count;
                    var multipleLotsForProduct = group.Count(l => l.ProductId == product.Id) > 1;
                    lotNumber = multipleLotsForProduct
                        ? $"OUV-{product.Code}-{count}"
                        : $"OUV-{product.Code}";
                }

                // 1 carton = toute la quantité, PA/carton = PA/unité × quantité → PA/unité recalculé = PA saisi
                var priceLine = purchase.AddLine(
                    product,
                    lotNumber,
                    quantityCartons: 1,
                    quantityLostCartons: 0,
                    unitsPerCarton: lineInput.Quantity,
                    unitFobPricePerCarton: lineInput.UnitCostPriceXof * lineInput.Quantity,
                    expirationDate: lineInput.ExpirationDate,
                    marginRate: 0m);

                priceLine.SetFinalSellingPrice(lineInput.SellingPriceHt > 0 ? lineInput.SellingPriceHt : null);

                DbContext.StockMovements.Add(new StockMovement
                {
                    ProductId = lineInput.ProductId,
                    WarehouseId = lineInput.WarehouseId,
                    PurchaseLine = priceLine,
                    MovementType = StockMovementType.Adjustment,
                    Quantity = lineInput.Quantity,
                    MovementDate = date,
                    Reference = purchaseRef,
                    Notes = "Inventaire d'ouverture"
                });
            }
        }

        await DbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Inventaire d'ouverture créé : {Count} lignes sur {Date:yyyy-MM-dd}", input.Lines.Count, date);
    }

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
