using LabMedis.Application.Dtos.ProductForms;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class ProductFormService : BaseRepository<ProductForm>, IProductFormService
{
    private readonly ILogger<ProductFormService> _logger;

    public ProductFormService(AppDbContext dbContext, ILogger<ProductFormService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<ProductFormDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.OrderBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<ProductFormDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<ProductFormDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<ProductFormDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await base.GetByIdAsync(id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<ProductFormDto> CreateAsync(ProductFormCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(x => x.Name == name, cancellationToken))
            throw new DomainException($"Une forme pharmaceutique '{name}' existe déjà.");

        var entity = new ProductForm { Name = name, Description = Trim(dto.Description) };
        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Forme pharmaceutique créée Id={Id} Name={Name}", entity.Id, entity.Name);
        return ToDto(entity);
    }

    public async Task<ProductFormDto?> UpdateAsync(long id, ProductFormUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        var name = dto.Name.Trim();
        if (!string.Equals(entity.Name, name, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Name == name, cancellationToken))
            throw new DomainException($"Une autre forme pharmaceutique utilise déjà le nom '{name}'.");

        entity.Name = name;
        entity.Description = Trim(dto.Description);
        await UpdateAsync(entity, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.Products.AnyAsync(p => p.ProductFormId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer une forme pharmaceutique utilisée par des produits.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static ProductFormDto ToDto(ProductForm x) => new(x.Id, x.Name, x.Description, x.CreatedAt, x.UpdatedAt);
    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
