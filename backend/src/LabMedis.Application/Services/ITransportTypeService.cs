using LabMedis.Application.Dtos.TransportTypes;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ITransportTypeService
{
    Task<PagedResult<TransportTypeDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TransportTypeDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<TransportTypeDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<TransportTypeDto> CreateAsync(TransportTypeCreateDto dto, CancellationToken cancellationToken = default);
    Task<TransportTypeDto?> UpdateAsync(long id, TransportTypeUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
