using LabMedis.Application.Dtos.Accesses;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IAccessService
{
    Task<PagedResult<AccessDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccessDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<AccessDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<AccessDto> CreateAsync(AccessCreateDto dto, CancellationToken cancellationToken = default);
    Task<AccessDto?> UpdateAsync(long id, AccessUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
