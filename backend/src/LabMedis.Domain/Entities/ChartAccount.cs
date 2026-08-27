using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class ChartAccount : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public AccountClass AccountClass { get; set; }
    public NormalBalance NormalBalance { get; set; }

    /// <summary>Accounts that link to clients/suppliers (e.g. 401, 411).</summary>
    public bool IsThirdParty { get; set; }

    /// <summary>Seeded system accounts that cannot be soft-deleted.</summary>
    public bool IsSystem { get; set; }

    public string? ParentCode { get; set; }
}
