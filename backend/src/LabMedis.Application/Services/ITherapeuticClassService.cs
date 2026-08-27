using LabMedis.Application.Dtos.TherapeuticClasses;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ITherapeuticClassService
{
    Task<PagedResult<TherapeuticClassDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TherapeuticClassDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<PagedResult<TherapeuticClassDto>> GetByCategoryAsync(long categoryId, int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TherapeuticClassDto>> GetByCategoryForSelectAsync(long categoryId, CancellationToken cancellationToken = default);
    Task<TherapeuticClassDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<TherapeuticClassDto> CreateAsync(TherapeuticClassCreateDto dto, CancellationToken cancellationToken = default);
    Task<TherapeuticClassDto?> UpdateAsync(long id, TherapeuticClassUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
