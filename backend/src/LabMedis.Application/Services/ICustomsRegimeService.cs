using LabMedis.Application.Dtos.CustomsRegimes;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ICustomsRegimeService
{
    Task<PagedResult<CustomsRegimeDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CustomsRegimeDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<CustomsRegimeDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<CustomsRegimeDto> CreateAsync(CustomsRegimeCreateDto dto, CancellationToken cancellationToken = default);
    Task<CustomsRegimeDto?> UpdateAsync(long id, CustomsRegimeUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
