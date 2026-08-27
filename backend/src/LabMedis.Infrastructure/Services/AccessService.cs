using LabMedis.Application.Dtos.Accesses;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class AccessService : BaseRepository<Access>, IAccessService
{
    private readonly ILogger<AccessService> _logger;

    public AccessService(AppDbContext dbContext, ILogger<AccessService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<AccessDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.OrderBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<AccessDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<AccessDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<AccessDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await base.GetByIdAsync(id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<AccessDto> CreateAsync(AccessCreateDto dto, CancellationToken cancellationToken = default)
    {
        var code = dto.Code.Trim().ToLowerInvariant();
        if (await DbSet.AnyAsync(x => x.Code == code, cancellationToken))
            throw new DomainException($"Un accès avec le code '{code}' existe déjà.");

        var entity = new Access { Code = code, Name = dto.Name.Trim(), Description = Trim(dto.Description) };
        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Accès créé Id={Id} Code={Code}", entity.Id, entity.Code);
        return ToDto(entity);
    }

    public async Task<AccessDto?> UpdateAsync(long id, AccessUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        var code = dto.Code.Trim().ToLowerInvariant();
        if (!string.Equals(entity.Code, code, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Code == code, cancellationToken))
            throw new DomainException($"Un autre accès utilise déjà le code '{code}'.");

        entity.Code = code;
        entity.Name = dto.Name.Trim();
        entity.Description = Trim(dto.Description);
        await UpdateAsync(entity, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.RoleAccesses.AnyAsync(ra => ra.AccessId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un accès assigné à des rôles.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static AccessDto ToDto(Access x) => new(x.Id, x.Code, x.Name, x.Description, x.CreatedAt, x.UpdatedAt);
    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
