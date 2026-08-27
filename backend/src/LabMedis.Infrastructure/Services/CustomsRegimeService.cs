using LabMedis.Application.Dtos.CustomsRegimes;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class CustomsRegimeService : BaseRepository<CustomsRegime>, ICustomsRegimeService
{
    private readonly ILogger<CustomsRegimeService> _logger;

    public CustomsRegimeService(AppDbContext dbContext, ILogger<CustomsRegimeService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<CustomsRegimeDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.OrderBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<CustomsRegimeDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<CustomsRegimeDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<CustomsRegimeDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await base.GetByIdAsync(id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<CustomsRegimeDto> CreateAsync(CustomsRegimeCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(x => x.Name == name, cancellationToken))
            throw new DomainException($"Un régime douanier '{name}' existe déjà.");

        var code = Trim(dto.Code)?.ToUpperInvariant();
        if (code is not null && await DbSet.AnyAsync(x => x.Code == code, cancellationToken))
            throw new DomainException($"Le code douanier '{code}' est déjà utilisé.");

        var entity = new CustomsRegime { Name = name, Code = code, Description = Trim(dto.Description) };
        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Régime douanier créé Id={Id} Name={Name}", entity.Id, entity.Name);
        return ToDto(entity);
    }

    public async Task<CustomsRegimeDto?> UpdateAsync(long id, CustomsRegimeUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        var name = dto.Name.Trim();
        if (!string.Equals(entity.Name, name, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Name == name, cancellationToken))
            throw new DomainException($"Un autre régime douanier utilise déjà le nom '{name}'.");

        var code = Trim(dto.Code)?.ToUpperInvariant();
        if (code is not null && !string.Equals(entity.Code, code, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Code == code, cancellationToken))
            throw new DomainException($"Le code douanier '{code}' est déjà utilisé.");

        entity.Name = name;
        entity.Code = code;
        entity.Description = Trim(dto.Description);
        await UpdateAsync(entity, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.Products.AnyAsync(p => p.CustomsRegimeId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un régime douanier utilisé par des produits.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static CustomsRegimeDto ToDto(CustomsRegime x) => new(x.Id, x.Name, x.Code, x.Description, x.CreatedAt, x.UpdatedAt);
    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
