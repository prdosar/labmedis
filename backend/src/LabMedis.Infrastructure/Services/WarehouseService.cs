using LabMedis.Application.Dtos.Warehouses;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class WarehouseService : BaseRepository<Warehouse>, IWarehouseService
{
    private readonly ILogger<WarehouseService> _logger;

    public WarehouseService(AppDbContext dbContext, ILogger<WarehouseService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<WarehouseDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.OrderBy(w => w.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<WarehouseDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<WarehouseDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.OrderBy(w => w.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<WarehouseDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var warehouse = await base.GetByIdAsync(id, cancellationToken);
        if (warehouse is null) return null;
        return ToDto(warehouse);
    }

    public async Task<WarehouseDto> CreateAsync(WarehouseCreateDto dto, CancellationToken cancellationToken = default)
    {
        var code = dto.Code.Trim().ToUpperInvariant();
        if (await DbSet.AnyAsync(w => w.Code == code, cancellationToken))
            throw new DomainException($"Un magasin avec le code '{code}' existe déjà.");

        var warehouse = new Warehouse
        {
            Code = code,
            Name = dto.Name.Trim(),
            Address = Trim(dto.Address),
            City = Trim(dto.City),
            Notes = Trim(dto.Notes)
        };

        await CreateAsync(warehouse, cancellationToken);
        _logger.LogInformation("Magasin créé Id={Id} Code={Code}", warehouse.Id, warehouse.Code);
        return ToDto(warehouse);
    }

    public async Task<WarehouseDto?> UpdateAsync(long id, WarehouseUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var warehouse = await base.GetByIdAsync(id, cancellationToken);
        if (warehouse is null) return null;

        var code = dto.Code.Trim().ToUpperInvariant();
        if (!string.Equals(warehouse.Code, code, StringComparison.Ordinal)
            && await DbSet.AnyAsync(w => w.Id != id && w.Code == code, cancellationToken))
            throw new DomainException($"Un autre magasin utilise déjà le code '{code}'.");

        warehouse.Code = code;
        warehouse.Name = dto.Name.Trim();
        warehouse.Address = Trim(dto.Address);
        warehouse.City = Trim(dto.City);
        warehouse.Notes = Trim(dto.Notes);

        await UpdateAsync(warehouse, cancellationToken);
        return ToDto(warehouse);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var warehouse = await base.GetByIdAsync(id, cancellationToken);
        if (warehouse is null) return false;

        if (await DbContext.Products.AnyAsync(p => p.WarehouseId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un magasin qui contient encore des produits.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static WarehouseDto ToDto(Warehouse w) =>
        new(w.Id, w.Code, w.Name, w.Address, w.City, w.Notes, w.CreatedAt, w.UpdatedAt);

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
