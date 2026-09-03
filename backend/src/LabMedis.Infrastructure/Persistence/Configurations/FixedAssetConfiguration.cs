using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class FixedAssetConfiguration : IEntityTypeConfiguration<FixedAsset>
{
    public void Configure(EntityTypeBuilder<FixedAsset> builder)
    {
        builder.ToTable("fixed_assets");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Designation).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.CoutAcquisition).HasColumnType("numeric(18,2)");
        builder.Property(x => x.ValeurResiduelle).HasColumnType("numeric(18,2)");
        builder.Property(x => x.TauxLineaire).HasColumnType("numeric(8,4)");
        builder.Property(x => x.CoefficientDegressif).HasColumnType("numeric(4,2)");
        builder.Property(x => x.Categorie).HasConversion<int>();
        builder.Property(x => x.Methode).HasConversion<int>();
        builder.Property(x => x.Status).HasConversion<int>();

        builder.HasMany(x => x.Tableau)
            .WithOne(l => l.FixedAsset)
            .HasForeignKey(l => l.FixedAssetId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(x => x.Tableau)
            .HasField("_lines")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(x => x.Code).IsUnique();
    }
}
