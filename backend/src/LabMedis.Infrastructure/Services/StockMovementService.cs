using LabMedis.Application.Dtos.StockMovements;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
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

    public async Task<PagedResult<StockMovementDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet
            .Include(m => m.Product)
            .Include(m => m.Warehouse)
            .Include(m => m.PurchaseLine)
            .OrderByDescending(m => m.MovementDate)
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<StockMovementDto>(items.Select(ToDto).ToList(), total, page, size);
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

        var purchaseLine = await DbContext.PurchaseLines.FirstOrDefaultAsync(l => l.Id == dto.PurchaseLineId, cancellationToken)
            ?? throw new DomainException($"Ligne d'arrivage introuvable (Id={dto.PurchaseLineId}).");

        if (purchaseLine.ProductId != dto.ProductId)
            throw new DomainException("La ligne d'arrivage ne correspond pas au produit sélectionné.");

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
            Notes = Trim(dto.Notes)
        };

        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Mouvement de stock créé Id={Id} Type={Type} Qty={Qty}", entity.Id, entity.MovementType, entity.Quantity);
        return await GetByIdAsync(entity.Id, cancellationToken) ?? ToDto(entity);
    }

    private static StockMovementDto ToDto(StockMovement m) => new(
        m.Id,
        m.ProductId, m.Product?.Code, m.Product?.Designation,
        m.WarehouseId, m.Warehouse?.Name,
        m.PurchaseLineId, m.PurchaseLine?.LotNumber,
        m.MovementType.ToString(),
        m.Quantity, m.MovementDate,
        m.Reference, m.Notes,
        m.CreatedAt, m.UpdatedAt);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
