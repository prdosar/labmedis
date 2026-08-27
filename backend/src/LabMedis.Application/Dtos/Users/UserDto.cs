namespace LabMedis.Application.Dtos.Users;

public record UserDto(
    long Id,
    string UserName,
    string Email,
    string? FullName,
    bool IsActive,
    IReadOnlyList<string> Roles);
