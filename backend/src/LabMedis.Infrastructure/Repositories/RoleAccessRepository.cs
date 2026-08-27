using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class RoleAccessRepository : BaseRepository<RoleAccess>, IRoleAccessRepository
{
    public RoleAccessRepository(AppDbContext dbContext) : base(dbContext) { }
}
