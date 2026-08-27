using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class AccessRepository : BaseRepository<Access>, IAccessRepository
{
    public AccessRepository(AppDbContext dbContext) : base(dbContext) { }
}
