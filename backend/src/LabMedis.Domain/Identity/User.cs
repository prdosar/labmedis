using Microsoft.AspNetCore.Identity;

namespace LabMedis.Domain.Identity;

public class User : IdentityUser<long>
{
    public string? FullName { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; } = false;
}
