using LabMedis.Application.Dtos.GeneralPurchases;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IGeneralPurchaseService
{
    Task<PagedResult<GeneralPurchaseDto>> GetAllAsync(int page = 1, int size = 20, CancellationToken ct = default);
    Task<GeneralPurchaseDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<GeneralPurchaseDto> CreateAsync(GeneralPurchaseCreateDto dto, CancellationToken ct = default);
    Task<GeneralPurchaseDto> UpdateAsync(long id, GeneralPurchaseUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(long id, CancellationToken ct = default);
    Task<GeneralPurchaseDto> MarkPaidAsync(long id, DateOnly datePaiement, CancellationToken ct = default);
}
