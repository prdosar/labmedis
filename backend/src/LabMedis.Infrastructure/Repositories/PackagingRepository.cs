using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class PackagingRepository : BaseRepository<Packaging>, IPackagingRepository
{
    public PackagingRepository(AppDbContext dbContext) : base(dbContext) { }
}
