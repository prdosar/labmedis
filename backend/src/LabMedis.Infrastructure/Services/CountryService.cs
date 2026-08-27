using LabMedis.Application.Dtos.Countries;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class CountryService : BaseRepository<Country>, ICountryService
{
    private readonly ILogger<CountryService> _logger;

    public CountryService(AppDbContext dbContext, ILogger<CountryService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<CountryDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.OrderBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<CountryDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<CountryDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<CountryDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await base.GetByIdAsync(id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<CountryDto> CreateAsync(CountryCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(x => x.Name == name, cancellationToken))
            throw new DomainException($"Un pays '{name}' existe déjà.");

        var isoCode = Trim(dto.IsoCode)?.ToUpperInvariant();
        if (isoCode is not null && await DbSet.AnyAsync(x => x.IsoCode == isoCode, cancellationToken))
            throw new DomainException($"Le code ISO '{isoCode}' est déjà utilisé.");

        var entity = new Country { Name = name, IsoCode = isoCode, Description = Trim(dto.Description) };
        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Pays créé Id={Id} Name={Name}", entity.Id, entity.Name);
        return ToDto(entity);
    }

    public async Task<CountryDto?> UpdateAsync(long id, CountryUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        var name = dto.Name.Trim();
        if (!string.Equals(entity.Name, name, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Name == name, cancellationToken))
            throw new DomainException($"Un autre pays utilise déjà le nom '{name}'.");

        var isoCode = Trim(dto.IsoCode)?.ToUpperInvariant();
        if (isoCode is not null && !string.Equals(entity.IsoCode, isoCode, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.IsoCode == isoCode, cancellationToken))
            throw new DomainException($"Le code ISO '{isoCode}' est déjà utilisé par un autre pays.");

        entity.Name = name;
        entity.IsoCode = isoCode;
        entity.Description = Trim(dto.Description);
        await UpdateAsync(entity, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.Products.AnyAsync(p => p.OriginCountryId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un pays utilisé comme origine de produits.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static CountryDto ToDto(Country x) => new(x.Id, x.Name, x.IsoCode, x.Description, x.CreatedAt, x.UpdatedAt);
    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
