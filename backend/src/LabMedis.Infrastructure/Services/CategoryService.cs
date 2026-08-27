using LabMedis.Application.Dtos.Categories;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class CategoryService : BaseRepository<Category>, ICategoryService
{
    private readonly ILogger<CategoryService> _logger;

    public CategoryService(AppDbContext dbContext, ILogger<CategoryService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<CategoryDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.OrderBy(c => c.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<CategoryDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<CategoryDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.OrderBy(c => c.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<CategoryDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var category = await base.GetByIdAsync(id, cancellationToken);
        if (category is null) return null;
        return ToDto(category);
    }

    public async Task<CategoryDto> CreateAsync(CategoryCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(c => c.Name == name, cancellationToken))
            throw new DomainException($"Une catégorie '{name}' existe déjà.");

        var category = new Category { Name = name, Description = Trim(dto.Description) };
        await CreateAsync(category, cancellationToken);
        _logger.LogInformation("Catégorie créée Id={Id} Name={Name}", category.Id, category.Name);
        return ToDto(category);
    }

    public async Task<CategoryDto?> UpdateAsync(long id, CategoryUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var category = await base.GetByIdAsync(id, cancellationToken);
        if (category is null) return null;

        var name = dto.Name.Trim();
        if (!string.Equals(category.Name, name, StringComparison.Ordinal)
            && await DbSet.AnyAsync(c => c.Id != id && c.Name == name, cancellationToken))
            throw new DomainException($"Une autre catégorie utilise déjà le nom '{name}'.");

        category.Name = name;
        category.Description = Trim(dto.Description);
        await UpdateAsync(category, cancellationToken);
        return ToDto(category);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var category = await base.GetByIdAsync(id, cancellationToken);
        if (category is null) return false;

        if (await DbContext.TherapeuticClasses.AnyAsync(tc => tc.CategoryId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer une catégorie qui contient des classes thérapeutiques.");

        if (await DbContext.Products.AnyAsync(p => p.CategoryId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer une catégorie qui contient des produits.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static CategoryDto ToDto(Category c) =>
        new(c.Id, c.Name, c.Description, c.CreatedAt, c.UpdatedAt);

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
