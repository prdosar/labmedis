using LabMedis.Application.Dtos.StockMovements;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IStockMovementService
{
    Task<PagedResult<StockMovementDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<PagedResult<StockMovementDto>> GetByProductAsync(long productId, int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<PagedResult<StockMovementDto>> GetByWarehouseAsync(long warehouseId, int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<StockMovementDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<StockMovementDto> CreateAsync(StockMovementCreateDto dto, CancellationToken cancellationToken = default);
}
