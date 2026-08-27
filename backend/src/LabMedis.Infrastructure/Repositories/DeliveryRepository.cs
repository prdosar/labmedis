using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class DeliveryRepository : BaseRepository<Delivery>, IDeliveryRepository
{
    public DeliveryRepository(AppDbContext dbContext) : base(dbContext) { }
}
