using LabMedis.Application.Dtos.SupplierReturns;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ISupplierReturnService
{
    Task<PagedResult<SupplierReturnDto>> GetAllAsync(int page, int size, long? supplierId, CancellationToken ct = default);
    Task<SupplierReturnDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<SupplierReturnDto> CreateAsync(CreateSupplierReturnDto dto, CancellationToken ct = default);
    Task<SupplierReturnDto> UpdateStatusAsync(long id, UpdateSupplierReturnStatusDto dto, CancellationToken ct = default);
}
