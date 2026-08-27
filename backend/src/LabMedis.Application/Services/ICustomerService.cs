using LabMedis.Application.Dtos.Customers;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ICustomerService
{
    Task<PagedResult<CustomerDto>> GetAllAsync(int page = 1, int size = 10, bool includeDeleted = false, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CustomerDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<CustomerDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<CustomerDto> CreateAsync(CustomerCreateDto dto, CancellationToken cancellationToken = default);
    Task<CustomerDto?> UpdateAsync(long id, CustomerUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
