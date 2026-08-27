using LabMedis.Application.Dtos.Categories;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ICategoryService
{
    Task<PagedResult<CategoryDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CategoryDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<CategoryDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<CategoryDto> CreateAsync(CategoryCreateDto dto, CancellationToken cancellationToken = default);
    Task<CategoryDto?> UpdateAsync(long id, CategoryUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
