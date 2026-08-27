using LabMedis.Application.Dtos.Countries;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ICountryService
{
    Task<PagedResult<CountryDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CountryDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default);
    Task<CountryDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<CountryDto> CreateAsync(CountryCreateDto dto, CancellationToken cancellationToken = default);
    Task<CountryDto?> UpdateAsync(long id, CountryUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default);
}
