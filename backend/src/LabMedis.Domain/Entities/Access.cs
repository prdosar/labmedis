using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class Access : BaseEntity
{
    private readonly List<RoleAccess> _roleAccesses = new();

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public IReadOnlyCollection<RoleAccess> RoleAccesses => _roleAccesses;
}
