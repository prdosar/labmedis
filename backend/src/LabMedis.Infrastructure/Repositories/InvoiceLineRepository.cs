using LabMedis.Domain.Entities;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;

namespace LabMedis.Infrastructure.Repositories;

public class InvoiceLineRepository : BaseRepository<InvoiceLine>, IInvoiceLineRepository
{
    public InvoiceLineRepository(AppDbContext dbContext) : base(dbContext) { }
}
