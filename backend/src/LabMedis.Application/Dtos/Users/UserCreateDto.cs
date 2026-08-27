namespace LabMedis.Application.Dtos.Users;

public record UserCreateDto(
    string UserName,
    string Email,
    string Password,
    string? FullName,
    IReadOnlyList<string> Roles);
