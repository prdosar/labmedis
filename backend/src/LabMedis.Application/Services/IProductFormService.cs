using LabMedis.Application.Dtos.ProductForms;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IProductFormService
{
    Task<PagedResult<ProductFormDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductFormDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<ProductFormDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<ProductFormDto> CreateAsync(ProductFormCreateDto dto, CancellationToken cancellationToken = default);
    Task<ProductFormDto?> UpdateAsync(long id, ProductFormUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
