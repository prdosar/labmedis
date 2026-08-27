using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LabMedis.Application.Dtos.Auth;
using LabMedis.Domain.Identity;
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

    public AuthController(UserManager<User> userManager, IConfiguration config)
    {
        _userManager = userManager;
        _config = config;
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

        return Ok(new TokenResponseDto(token, user.Id, user.UserName!, user.Email!, user.FullName, roles.ToList(), expiresAt));
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
