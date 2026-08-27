using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class CustomsRegimeConfiguration : IEntityTypeConfiguration<CustomsRegime>
{
    public void Configure(EntityTypeBuilder<CustomsRegime> builder)
    {
        builder.ToTable("customs_regimes");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Code).HasMaxLength(20);
        builder.Property(x => x.Description).HasMaxLength(300);

        builder.HasIndex(x => x.Name).IsUnique();
        builder.HasIndex(x => x.Code).IsUnique().HasFilter("\"Code\" IS NOT NULL");
    }
}
