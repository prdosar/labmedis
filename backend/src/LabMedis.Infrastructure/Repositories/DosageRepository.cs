using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class DosageRepository : BaseRepository<Dosage>, IDosageRepository
{
    public DosageRepository(AppDbContext dbContext) : base(dbContext) { }
}
