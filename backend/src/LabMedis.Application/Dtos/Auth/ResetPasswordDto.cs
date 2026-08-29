namespace LabMedis.Application.Dtos.Auth;

public record ResetPasswordDto(string Email, string Token, string NewPassword);
