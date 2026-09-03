using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class GeneralPurchaseConfiguration : IEntityTypeConfiguration<GeneralPurchase>
{
    public void Configure(EntityTypeBuilder<GeneralPurchase> builder)
    {
        builder.ToTable("general_purchases");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.FournisseurNom).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Designation).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Reference).HasMaxLength(100);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.MontantHT).HasColumnType("numeric(18,2)");
        builder.Property(x => x.TauxTVA).HasColumnType("numeric(5,2)");
        builder.Property(x => x.MontantTTC).HasColumnType("numeric(18,2)");
        builder.Property(x => x.Categorie).HasConversion<int>();
        builder.Property(x => x.ModePaiement).HasConversion<int>();

        builder.HasIndex(x => x.DateAchat);
        builder.HasIndex(x => x.EstPaye);
    }
}
