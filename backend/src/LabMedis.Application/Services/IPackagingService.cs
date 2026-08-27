using LabMedis.Application.Dtos.Packagings;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IPackagingService
{
    Task<PagedResult<PackagingDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PackagingDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<PackagingDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<PackagingDto> CreateAsync(PackagingCreateDto dto, CancellationToken cancellationToken = default);
    Task<PackagingDto?> UpdateAsync(long id, PackagingUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
