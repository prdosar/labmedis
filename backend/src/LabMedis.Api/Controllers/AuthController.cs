using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LabMedis.Application.Dtos.Auth;
using LabMedis.Application.Services;
using LabMedis.Domain.Identity;
using LabMedis.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly IConfiguration _config;
    private readonly IEmailService _emailService;

    public AuthController(UserManager<User> userManager, IConfiguration config, IEmailService emailService)
    {
        _userManager = userManager;
        _config = config;
        _emailService = emailService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<TokenResponseDto>> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByNameAsync(dto.Username)
                   ?? await _userManager.FindByEmailAsync(dto.Username);

        if (user is null || !await _userManager.CheckPasswordAsync(user, dto.Password))
            return Unauthorized(new { message = "Identifiants incorrects." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Ce compte est désactivé." });

        var roles = await _userManager.GetRolesAsync(user);
        var expiresAt = DateTime.UtcNow.AddDays(7);
        var token = GenerateToken(user, roles, expiresAt);

        return Ok(new TokenResponseDto(token, user.Id, user.UserName!, user.Email!, user.FullName, user.MustChangePassword, roles.ToList(), expiresAt));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email.Trim().ToLowerInvariant());
        if (user is not null && user.IsActive)
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = Uri.EscapeDataString(token);
            var encodedEmail = Uri.EscapeDataString(user.Email!);
            var appUrl = _config["AppUrl"] ?? "http://localhost:5173";
            var resetUrl = $"{appUrl}/reset-password?email={encodedEmail}&token={encodedToken}";
            var body = EmailTemplateService.BuildPasswordResetEmail(user.FullName, user.UserName!, resetUrl, appUrl);
            await _emailService.SendEmailAsync(user.Email!, "Réinitialisation de mot de passe — LabMedis", body);
        }
        // Always return 200 for security (don't reveal if email exists)
        return Ok(new { message = "Si cet email est enregistré, un lien de réinitialisation vous a été envoyé." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email.Trim().ToLowerInvariant());
        if (user is null)
            return BadRequest(new { message = "Lien invalide ou expiré." });

        var result = await _userManager.ResetPasswordAsync(user, dto.Token, dto.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(", ", result.Errors.Select(e => e.Description)) });

        user.MustChangePassword = false;
        await _userManager.UpdateAsync(user);

        return Ok(new { message = "Mot de passe réinitialisé avec succès." });
    }

    private string GenerateToken(User user, IList<string> roles, DateTime expiresAt)
    {
        var key = _config["Jwt:Key"] ?? "labmedis-dev-secret-key-min-32-chars!!";
        var secKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(secKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName!),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new("fullName", user.FullName ?? string.Empty),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
