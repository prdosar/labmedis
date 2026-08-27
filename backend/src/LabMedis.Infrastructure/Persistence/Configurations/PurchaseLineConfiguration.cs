using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class PurchaseLineConfiguration : IEntityTypeConfiguration<PurchaseLine>
{
    public void Configure(EntityTypeBuilder<PurchaseLine> builder)
    {
        builder.ToTable("purchase_lines");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.LotNumber).IsRequired().HasMaxLength(100);

        builder.Property(x => x.UnitPurchasePrice).HasPrecision(18, 4);
        builder.Property(x => x.UnitPurchasePriceXof).HasPrecision(18, 4);
        builder.Property(x => x.UnitCostPriceXof).HasPrecision(18, 4);
        builder.Property(x => x.TargetSellingPriceHt).HasPrecision(18, 4);

        builder.HasOne(x => x.Purchase)
            .WithMany(p => p.Lines)
            .HasForeignKey(x => x.PurchaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Product)
            .WithMany(p => p.PurchaseLines)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.ProductId, x.LotNumber });
        builder.HasIndex(x => new { x.PurchaseId, x.ProductId, x.LotNumber }).IsUnique();
        builder.HasIndex(x => x.ExpirationDate);
    }
}
