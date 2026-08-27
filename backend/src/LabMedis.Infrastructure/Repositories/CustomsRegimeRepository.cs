using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class CustomsRegimeRepository : BaseRepository<CustomsRegime>, ICustomsRegimeRepository
{
    public CustomsRegimeRepository(AppDbContext dbContext) : base(dbContext) { }
}
