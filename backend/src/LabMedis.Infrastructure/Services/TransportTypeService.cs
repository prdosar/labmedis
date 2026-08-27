using LabMedis.Application.Dtos.TransportTypes;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class TransportTypeService : BaseRepository<TransportType>, ITransportTypeService
{
    private readonly ILogger<TransportTypeService> _logger;

    public TransportTypeService(AppDbContext dbContext, ILogger<TransportTypeService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<TransportTypeDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.OrderBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<TransportTypeDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<TransportTypeDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<TransportTypeDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await base.GetByIdAsync(id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<TransportTypeDto> CreateAsync(TransportTypeCreateDto dto, CancellationToken cancellationToken = default)
    {
        var code = dto.Code.Trim().ToUpperInvariant();
        if (await DbSet.AnyAsync(x => x.Code == code, cancellationToken))
            throw new DomainException($"Un mode de transport avec le code '{code}' existe déjà.");

        var entity = new TransportType { Code = code, Name = dto.Name.Trim(), Description = Trim(dto.Description) };
        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Mode de transport créé Id={Id} Code={Code}", entity.Id, entity.Code);
        return ToDto(entity);
    }

    public async Task<TransportTypeDto?> UpdateAsync(long id, TransportTypeUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        var code = dto.Code.Trim().ToUpperInvariant();
        if (!string.Equals(entity.Code, code, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Code == code, cancellationToken))
            throw new DomainException($"Un autre mode de transport utilise déjà le code '{code}'.");

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

        if (await DbContext.PurchaseLineTransports.AnyAsync(t => t.TransportTypeId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un mode de transport utilisé dans des arrivages.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static TransportTypeDto ToDto(TransportType x) => new(x.Id, x.Code, x.Name, x.Description, x.CreatedAt, x.UpdatedAt);
    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
