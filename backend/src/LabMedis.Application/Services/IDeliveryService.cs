using LabMedis.Application.Dtos.Deliveries;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IDeliveryService
{
    Task<PagedResult<DeliveryDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<DeliveryDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<DeliveryDto> CreateAsync(DeliveryCreateDto dto, CancellationToken cancellationToken = default);
    Task<DeliveryDto?> UpdateAsync(long id, DeliveryUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);

    Task<DeliveryLineDto> AddLineAsync(long deliveryId, DeliveryLineCreateDto dto, CancellationToken cancellationToken = default);
    Task<bool> RemoveLineAsync(long deliveryId, long lineId, CancellationToken cancellationToken = default);

    Task<DeliveryDto?> ShipAsync(long id, CancellationToken cancellationToken = default);
    Task<DeliveryDto?> MarkDeliveredAsync(long id, CancellationToken cancellationToken = default);
    Task<DeliveryDto?> CancelAsync(long id, CancellationToken cancellationToken = default);
}
