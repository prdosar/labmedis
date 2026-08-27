using LabMedis.Domain.Common;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LabMedis.Infrastructure.Repositories;

public class BaseRepository<T> : IBaseRepository<T> where T : BaseEntity
{
    protected readonly AppDbContext DbContext;

    protected DbSet<T> DbSet => DbContext.Set<T>();

    public BaseRepository(AppDbContext dbContext)
    {
        DbContext = dbContext;
    }

    public virtual Task<T?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        => DbSet.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public virtual async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default)
        => await DbSet.ToListAsync(cancellationToken);

    public virtual async Task<PagedResult<T>> GetPagedAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<T>(items, total, page, size);
    }

    public virtual async Task<T> CreateAsync(T entity, CancellationToken cancellationToken = default)
    {
        DbSet.Add(entity);
        await DbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public virtual async Task<T> UpdateAsync(T entity, CancellationToken cancellationToken = default)
    {
        DbSet.Update(entity);
        await DbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public virtual async Task<bool> SoftDeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity is null)
            return false;

        DbSet.Remove(entity);
        await DbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public virtual async Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await DbSet.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null || !entity.IsDeleted)
            return false;

        entity.Restore(DateTime.UtcNow);
        DbContext.Entry(entity).State = EntityState.Modified;
        await DbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
