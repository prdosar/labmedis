using LabMedis.Application.Dtos.Delays;

namespace LabMedis.Application.Services;

public interface IDeliveryDelayService
{
    Task<IReadOnlyList<DelayDto>> GetAllAsync(CancellationToken ct = default);
    Task<DelayDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<DelayDto> CreateAsync(DelayCreateDto dto, CancellationToken ct = default);
    Task<DelayDto?> UpdateAsync(long id, DelayUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(long id, CancellationToken ct = default);
}

public interface IPaymentDelayService
{
    Task<IReadOnlyList<DelayDto>> GetAllAsync(CancellationToken ct = default);
    Task<DelayDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<DelayDto> CreateAsync(DelayCreateDto dto, CancellationToken ct = default);
    Task<DelayDto?> UpdateAsync(long id, DelayUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(long id, CancellationToken ct = default);
}
