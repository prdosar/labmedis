using LabMedis.Application.Dtos.Dosages;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IDosageService
{
    Task<PagedResult<DosageDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DosageDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<DosageDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<DosageDto> CreateAsync(DosageCreateDto dto, CancellationToken cancellationToken = default);
    Task<DosageDto?> UpdateAsync(long id, DosageUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
