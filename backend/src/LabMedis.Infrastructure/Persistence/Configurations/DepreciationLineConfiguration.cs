using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class DepreciationLineConfiguration : IEntityTypeConfiguration<DepreciationLine>
{
    public void Configure(EntityTypeBuilder<DepreciationLine> builder)
    {
        builder.ToTable("depreciation_lines");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.BaseAmortissable).HasColumnType("numeric(18,2)");
        builder.Property(x => x.DotationAnnuelle).HasColumnType("numeric(18,2)");
        builder.Property(x => x.CumulAmortissements).HasColumnType("numeric(18,2)");
        builder.Property(x => x.ValeurNette).HasColumnType("numeric(18,2)");

        builder.HasIndex(x => new { x.FixedAssetId, x.Annee }).IsUnique();
    }
}
