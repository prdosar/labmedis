using LabMedis.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace LabMedis.Domain.Identity;

public class Role : IdentityRole<long>
{
    private readonly List<RoleAccess> _roleAccesses = new();

    public string? Description { get; set; }

    public IReadOnlyCollection<RoleAccess> RoleAccesses => _roleAccesses;
}
