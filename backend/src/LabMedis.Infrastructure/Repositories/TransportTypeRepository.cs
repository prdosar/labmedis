using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class TransportTypeRepository : BaseRepository<TransportType>, ITransportTypeRepository
{
    public TransportTypeRepository(AppDbContext dbContext) : base(dbContext) { }
}
