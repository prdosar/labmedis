using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class TherapeuticClassRepository : BaseRepository<TherapeuticClass>, ITherapeuticClassRepository
{
    public TherapeuticClassRepository(AppDbContext dbContext) : base(dbContext)
    {
    }
}
