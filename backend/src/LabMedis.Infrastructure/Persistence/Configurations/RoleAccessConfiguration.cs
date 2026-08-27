using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class RoleAccessConfiguration : IEntityTypeConfiguration<RoleAccess>
{
    public void Configure(EntityTypeBuilder<RoleAccess> builder)
    {
        builder.ToTable("role_accesses");
        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Role)
            .WithMany(r => r.RoleAccesses)
            .HasForeignKey(x => x.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Access)
            .WithMany(a => a.RoleAccesses)
            .HasForeignKey(x => x.AccessId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.RoleId, x.AccessId }).IsUnique();
    }
}
