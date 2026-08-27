using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class DeliveryLineRepository : BaseRepository<DeliveryLine>, IDeliveryLineRepository
{
    public DeliveryLineRepository(AppDbContext dbContext) : base(dbContext) { }
}
