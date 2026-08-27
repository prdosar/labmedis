using LabMedis.Application.Dtos.TherapeuticClasses;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class TherapeuticClassService : BaseRepository<TherapeuticClass>, ITherapeuticClassService
{
    private readonly ILogger<TherapeuticClassService> _logger;

    public TherapeuticClassService(AppDbContext dbContext, ILogger<TherapeuticClassService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<TherapeuticClassDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.Include(tc => tc.Category).OrderBy(tc => tc.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<TherapeuticClassDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<TherapeuticClassDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.Include(tc => tc.Category).OrderBy(tc => tc.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<PagedResult<TherapeuticClassDto>> GetByCategoryAsync(long categoryId, int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(tc => tc.CategoryId == categoryId, cancellationToken);
        var items = await DbSet
            .Include(tc => tc.Category)
            .Where(tc => tc.CategoryId == categoryId)
            .OrderBy(tc => tc.Name)
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<TherapeuticClassDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<TherapeuticClassDto>> GetByCategoryForSelectAsync(long categoryId, CancellationToken cancellationToken = default)
    {
        var items = await DbSet
            .Include(tc => tc.Category)
            .Where(tc => tc.CategoryId == categoryId)
            .OrderBy(tc => tc.Name)
            .ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<TherapeuticClassDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var tc = await DbSet.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return tc is null ? null : ToDto(tc);
    }

    public async Task<TherapeuticClassDto> CreateAsync(TherapeuticClassCreateDto dto, CancellationToken cancellationToken = default)
    {
        var category = await DbContext.Categories.FirstOrDefaultAsync(c => c.Id == dto.CategoryId, cancellationToken)
            ?? throw new DomainException($"La catégorie Id={dto.CategoryId} est introuvable.");

        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(tc => tc.CategoryId == dto.CategoryId && tc.Name == name, cancellationToken))
            throw new DomainException($"La classe '{name}' existe déjà dans cette catégorie.");

        var entity = new TherapeuticClass { CategoryId = dto.CategoryId, Name = name, Description = Trim(dto.Description) };
        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Classe thérapeutique créée Id={Id} Name={Name}", entity.Id, entity.Name);
        entity.Category = category;
        return ToDto(entity);
    }

    public async Task<TherapeuticClassDto?> UpdateAsync(long id, TherapeuticClassUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var tc = await DbSet.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (tc is null) return null;

        if (dto.CategoryId != tc.CategoryId)
        {
            if (await DbContext.Products.AnyAsync(p => p.TherapeuticClassId == id, cancellationToken))
                throw new DomainException("Impossible de changer la catégorie d'une classe qui contient des produits.");
            if (!await DbContext.Categories.AnyAsync(c => c.Id == dto.CategoryId, cancellationToken))
                throw new DomainException($"La catégorie Id={dto.CategoryId} est introuvable.");
        }

        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(x => x.Id != id && x.CategoryId == dto.CategoryId && x.Name == name, cancellationToken))
            throw new DomainException($"La classe '{name}' existe déjà dans cette catégorie.");

        tc.CategoryId = dto.CategoryId;
        tc.Name = name;
        tc.Description = Trim(dto.Description);
        await UpdateAsync(tc, cancellationToken);
        tc.Category = await DbContext.Categories.FirstAsync(c => c.Id == tc.CategoryId, cancellationToken);
        return ToDto(tc);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var tc = await base.GetByIdAsync(id, cancellationToken);
        if (tc is null) return false;

        if (await DbContext.Products.AnyAsync(p => p.TherapeuticClassId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer une classe thérapeutique référencée par des produits.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static TherapeuticClassDto ToDto(TherapeuticClass tc) =>
        new(tc.Id, tc.CategoryId, tc.Category?.Name ?? string.Empty, tc.Name, tc.Description, tc.CreatedAt, tc.UpdatedAt);

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
