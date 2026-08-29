using LabMedis.Application.Dtos.Packagings;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class PackagingService : BaseRepository<Packaging>, IPackagingService
{
    private readonly ILogger<PackagingService> _logger;

    public PackagingService(AppDbContext dbContext, ILogger<PackagingService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<PackagingDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.OrderBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<PackagingDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<PackagingDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<PackagingDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await base.GetByIdAsync(id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<PackagingDto> CreateAsync(PackagingCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(x => x.Name == name, cancellationToken))
            throw new DomainException($"Un conditionnement '{name}' existe déjà.");

        var entity = new Packaging { Name = name, Description = Trim(dto.Description), UnitsPerPackaging = dto.UnitsPerPackaging > 0 ? dto.UnitsPerPackaging : 1 };
        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Conditionnement créé Id={Id} Name={Name}", entity.Id, entity.Name);
        return ToDto(entity);
    }

    public async Task<PackagingDto?> UpdateAsync(long id, PackagingUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        var name = dto.Name.Trim();
        if (!string.Equals(entity.Name, name, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Name == name, cancellationToken))
            throw new DomainException($"Un autre conditionnement utilise déjà le nom '{name}'.");

        entity.Name = name;
        entity.Description = Trim(dto.Description);
        entity.UnitsPerPackaging = dto.UnitsPerPackaging > 0 ? dto.UnitsPerPackaging : 1;
        await UpdateAsync(entity, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.Products.AnyAsync(p => p.PackagingId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un conditionnement utilisé par des produits.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static PackagingDto ToDto(Packaging x) => new(x.Id, x.Name, x.Description, x.UnitsPerPackaging, x.CreatedAt, x.UpdatedAt);
    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
