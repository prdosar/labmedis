using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class PurchaseRepository : BaseRepository<Purchase>, IPurchaseRepository
{
    public PurchaseRepository(AppDbContext dbContext) : base(dbContext) { }
}
