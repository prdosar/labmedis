using LabMedis.Application.Dtos.Purchases;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IPurchaseService
{
    /// <summary>
    /// Liste paginée des arrivages. Par défaut n'inclut que les arrivages liés à un bon de commande
    /// fournisseur (vrais arrivages) ; passer <c>includeUnlinked=true</c> pour aussi voir les
    /// arrivages techniques (inventaire d'ouverture notamment).
    /// </summary>
    Task<PagedResult<PurchaseDto>> GetAllAsync(int page = 1, int size = 10, bool includeUnlinked = false, CancellationToken cancellationToken = default);
    Task<PurchaseDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<PurchaseDto> CreateAsync(PurchaseCreateDto dto, CancellationToken cancellationToken = default);
    Task<PurchaseDto?> UpdateAsync(long id, PurchaseUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);

    Task<PurchaseLineDto> AddLineAsync(long purchaseId, PurchaseLineCreateDto dto, CancellationToken cancellationToken = default);
    Task<bool> RemoveLineAsync(long purchaseId, long lineId, CancellationToken cancellationToken = default);

    Task<PurchaseLineTransportDto> AddTransportAsync(long purchaseId, long lineId, PurchaseLineTransportCreateDto dto, CancellationToken cancellationToken = default);
    Task<PurchaseLineTransportDto?> UpdateTransportAsync(long purchaseId, long lineId, long transportTypeId, PurchaseLineTransportUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> RemoveTransportAsync(long purchaseId, long lineId, long transportTypeId, CancellationToken cancellationToken = default);

    Task<PurchaseLineDto> UpdateLotPriceAsync(long lineId, UpdateLotPriceDto dto, CancellationToken cancellationToken = default);
}
