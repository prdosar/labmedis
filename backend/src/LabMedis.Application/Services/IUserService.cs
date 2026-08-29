using LabMedis.Application.Dtos.Users;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IUserService
{
    Task<PagedResult<UserDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<UserDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<UserDto> CreateAsync(UserCreateDto dto, CancellationToken cancellationToken = default);
    Task<UserDto?> UpdateAsync(long id, UserUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> ChangePasswordAsync(long id, ChangePasswordDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<IList<string>> GetRolesAsync(CancellationToken cancellationToken = default);
}
