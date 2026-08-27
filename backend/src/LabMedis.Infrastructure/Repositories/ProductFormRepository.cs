using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class ProductFormRepository : BaseRepository<ProductForm>, IProductFormRepository
{
    public ProductFormRepository(AppDbContext dbContext) : base(dbContext) { }
}
