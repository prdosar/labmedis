using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class SupplierRepository : BaseRepository<Supplier>, ISupplierRepository
{
    public SupplierRepository(AppDbContext dbContext) : base(dbContext) { }
}
