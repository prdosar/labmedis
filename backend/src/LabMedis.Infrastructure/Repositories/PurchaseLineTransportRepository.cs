using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class PurchaseLineTransportRepository : BaseRepository<PurchaseLineTransport>, IPurchaseLineTransportRepository
{
    public PurchaseLineTransportRepository(AppDbContext dbContext) : base(dbContext) { }
}
