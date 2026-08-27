using LabMedis.Application.Dtos.Warehouses;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IWarehouseService
{
    Task<PagedResult<WarehouseDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WarehouseDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<WarehouseDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<WarehouseDto> CreateAsync(WarehouseCreateDto dto, CancellationToken cancellationToken = default);
    Task<WarehouseDto?> UpdateAsync(long id, WarehouseUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
