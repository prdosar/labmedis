using LabMedis.Domain.Common;
using LabMedis.Domain.Identity;

namespace LabMedis.Domain.Entities;

public class RoleAccess : BaseEntity
{
    public long RoleId { get; set; }
    public Role? Role { get; set; }

    public long AccessId { get; set; }
    public Access? Access { get; set; }
}
