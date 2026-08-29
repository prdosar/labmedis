using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class PackagingConfiguration : IEntityTypeConfiguration<Packaging>
{
    public void Configure(EntityTypeBuilder<Packaging> builder)
    {
        builder.ToTable("packagings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Description).HasMaxLength(300);
        builder.Property(x => x.UnitsPerPackaging).HasDefaultValue(1);

        builder.HasIndex(x => x.Name).IsUnique();
    }
}
