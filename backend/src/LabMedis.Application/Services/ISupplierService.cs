using LabMedis.Application.Dtos.Suppliers;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ISupplierService
{
    Task<PagedResult<SupplierDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SupplierDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<SupplierDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<SupplierDto> CreateAsync(SupplierCreateDto dto, CancellationToken cancellationToken = default);
    Task<SupplierDto?> UpdateAsync(long id, SupplierUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
