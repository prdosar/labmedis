namespace LabMedis.Application.Dtos.Users;

public record UserDto(
    long Id,
    string UserName,
    string Email,
    string? FullName,
    bool IsActive,
    bool MustChangePassword,
    IReadOnlyList<string> Roles);
