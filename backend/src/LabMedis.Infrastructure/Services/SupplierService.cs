using LabMedis.Application.Dtos.Suppliers;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class SupplierService : BaseRepository<Supplier>, ISupplierService
{
    private readonly ILogger<SupplierService> _logger;

    public SupplierService(AppDbContext dbContext, ILogger<SupplierService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<SupplierDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.Include(x => x.Country).OrderBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<SupplierDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<SupplierDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.Include(x => x.Country).OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<SupplierDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await DbSet.Include(x => x.Country).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<SupplierDto> CreateAsync(SupplierCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(x => x.Name == name, cancellationToken))
            throw new DomainException($"Un fournisseur '{name}' existe déjà.");

        var entity = new Supplier
        {
            Name = name,
            Address = Trim(dto.Address),
            PostalBox = Trim(dto.PostalBox),
            Phone = Trim(dto.Phone),
            Email = Trim(dto.Email),
            CountryId = dto.CountryId,
            ContactPerson = Trim(dto.ContactPerson)
        };
        await CreateAsync(entity, cancellationToken);
        await DbContext.Entry(entity).Reference(x => x.Country).LoadAsync(cancellationToken);
        _logger.LogInformation("Fournisseur créé Id={Id} Name={Name}", entity.Id, entity.Name);
        return ToDto(entity);
    }

    public async Task<SupplierDto?> UpdateAsync(long id, SupplierUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await DbSet.Include(x => x.Country).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return null;

        var name = dto.Name.Trim();
        if (!string.Equals(entity.Name, name, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Name == name, cancellationToken))
            throw new DomainException($"Un autre fournisseur utilise déjà le nom '{name}'.");

        entity.Name = name;
        entity.Address = Trim(dto.Address);
        entity.PostalBox = Trim(dto.PostalBox);
        entity.Phone = Trim(dto.Phone);
        entity.Email = Trim(dto.Email);
        entity.CountryId = dto.CountryId;
        entity.ContactPerson = Trim(dto.ContactPerson);
        await UpdateAsync(entity, cancellationToken);
        await DbContext.Entry(entity).Reference(x => x.Country).LoadAsync(cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.Products.AnyAsync(p => p.SupplierId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un fournisseur lié à des produits.");

        if (await DbContext.Purchases.AnyAsync(p => p.SupplierId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un fournisseur lié à des arrivages.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static SupplierDto ToDto(Supplier x) =>
        new(x.Id, x.Name, x.Address, x.PostalBox, x.Phone, x.Email, x.CountryId, x.Country?.Name, x.ContactPerson, x.CreatedAt, x.UpdatedAt);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
