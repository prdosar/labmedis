using LabMedis.Application.Dtos.FixedAssets;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IFixedAssetService
{
    Task<PagedResult<FixedAssetDto>> GetAllAsync(int page = 1, int size = 20, CancellationToken ct = default);
    Task<FixedAssetDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<FixedAssetDto> CreateAsync(FixedAssetCreateDto dto, CancellationToken ct = default);
    Task<FixedAssetDto> UpdateAsync(long id, FixedAssetUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(long id, CancellationToken ct = default);
    Task<IReadOnlyList<DepreciationLineDto>> GetTableauAsync(long id, CancellationToken ct = default);
}
