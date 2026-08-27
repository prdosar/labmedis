namespace LabMedis.Application.Dtos.Users;

public record UserUpdateDto(
    string Email,
    string? FullName,
    bool IsActive,
    IReadOnlyList<string> Roles);
