using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class PurchaseLineRepository : BaseRepository<PurchaseLine>, IPurchaseLineRepository
{
    public PurchaseLineRepository(AppDbContext dbContext) : base(dbContext) { }
}
