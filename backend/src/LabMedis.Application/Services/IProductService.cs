using LabMedis.Application.Dtos.Products;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetAllAsync(int page = 1, int size = 10, string? search = null, long? categoryId = null, long? therapeuticClassId = null, long? supplierId = null, bool includeDeleted = false, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<ProductDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<ProductHistoryDto?> GetHistoryAsync(long id, CancellationToken cancellationToken = default);
    Task<ProductDto> CreateAsync(ProductCreateDto dto, CancellationToken cancellationToken = default);
    Task<ProductDto?> UpdateAsync(long id, ProductUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
