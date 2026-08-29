namespace LabMedis.Application.Dtos.Users;

public record UserCreateDto(
    string UserName,
    string Email,
    string? FullName,
    IReadOnlyList<string> Roles);
