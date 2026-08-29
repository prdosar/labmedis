namespace LabMedis.Application.Dtos.Auth;

public record TokenResponseDto(
    string Token,
    long UserId,
    string UserName,
    string Email,
    string? FullName,
    bool MustChangePassword,
    IReadOnlyList<string> Roles,
    DateTime ExpiresAt);
