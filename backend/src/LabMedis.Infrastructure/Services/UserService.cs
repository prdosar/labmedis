using LabMedis.Application.Dtos.Users;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<Role> _roleManager;
    private readonly ILogger<UserService> _logger;

    public UserService(UserManager<User> userManager, RoleManager<Role> roleManager, ILogger<UserService> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }

    public async Task<PagedResult<UserDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await _userManager.Users.CountAsync(cancellationToken);
        var users = await _userManager.Users.OrderBy(u => u.UserName).Skip(skip).Take(size).ToListAsync(cancellationToken);
        var result = new List<UserDto>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(ToDto(u, roles));
        }
        return new PagedResult<UserDto>(result, total, page, size);
    }

    public async Task<UserDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return null;
        var roles = await _userManager.GetRolesAsync(user);
        return ToDto(user, roles);
    }

    public async Task<UserDto> CreateAsync(UserCreateDto dto, CancellationToken cancellationToken = default)
    {
        var userName = dto.UserName.Trim();
        var email = dto.Email.Trim().ToLowerInvariant();

        if (await _userManager.FindByNameAsync(userName) is not null)
            throw new DomainException($"Le nom d'utilisateur '{userName}' est déjà utilisé.");

        if (await _userManager.FindByEmailAsync(email) is not null)
            throw new DomainException($"L'email '{email}' est déjà utilisé.");

        await ValidateRolesAsync(dto.Roles);

        var user = new User
        {
            UserName = userName,
            Email = email,
            FullName = Trim(dto.FullName),
            IsActive = true,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            throw new DomainException($"Création impossible : {string.Join(", ", result.Errors.Select(e => e.Description))}");

        if (dto.Roles.Count > 0)
        {
            var roleResult = await _userManager.AddToRolesAsync(user, dto.Roles);
            if (!roleResult.Succeeded)
                throw new DomainException($"Assignation des rôles impossible : {string.Join(", ", roleResult.Errors.Select(e => e.Description))}");
        }

        _logger.LogInformation("Utilisateur créé Id={Id} UserName={UserName}", user.Id, user.UserName);
        var roles = await _userManager.GetRolesAsync(user);
        return ToDto(user, roles);
    }

    public async Task<UserDto?> UpdateAsync(long id, UserUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return null;

        var email = dto.Email.Trim().ToLowerInvariant();
        var existingByEmail = await _userManager.FindByEmailAsync(email);
        if (existingByEmail is not null && existingByEmail.Id != id)
            throw new DomainException($"L'email '{email}' est déjà utilisé par un autre utilisateur.");

        await ValidateRolesAsync(dto.Roles);

        user.Email = email;
        user.NormalizedEmail = email.ToUpperInvariant();
        user.FullName = Trim(dto.FullName);
        user.IsActive = dto.IsActive;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            throw new DomainException($"Mise à jour impossible : {string.Join(", ", updateResult.Errors.Select(e => e.Description))}");

        var currentRoles = await _userManager.GetRolesAsync(user);
        var toRemove = currentRoles.Except(dto.Roles).ToList();
        var toAdd = dto.Roles.Except(currentRoles).ToList();

        if (toRemove.Count > 0) await _userManager.RemoveFromRolesAsync(user, toRemove);
        if (toAdd.Count > 0) await _userManager.AddToRolesAsync(user, toAdd);

        _logger.LogInformation("Utilisateur mis à jour Id={Id}", id);
        var roles = await _userManager.GetRolesAsync(user);
        return ToDto(user, roles);
    }

    public async Task<bool> ChangePasswordAsync(long id, ChangePasswordDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return false;

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
        if (!result.Succeeded)
            throw new DomainException($"Changement de mot de passe impossible : {string.Join(", ", result.Errors.Select(e => e.Description))}");

        _logger.LogInformation("Mot de passe changé pour l'utilisateur Id={Id}", id);
        return true;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return false;

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            throw new DomainException($"Suppression impossible : {string.Join(", ", result.Errors.Select(e => e.Description))}");

        _logger.LogInformation("Utilisateur supprimé Id={Id}", id);
        return true;
    }

    private async Task ValidateRolesAsync(IReadOnlyList<string> roles)
    {
        foreach (var role in roles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
                throw new DomainException($"Le rôle '{role}' n'existe pas.");
        }
    }

    private static UserDto ToDto(User u, IList<string> roles) =>
        new(u.Id, u.UserName ?? string.Empty, u.Email ?? string.Empty, u.FullName, u.IsActive, roles.ToList());

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
