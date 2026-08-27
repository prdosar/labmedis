using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class PurchaseConfiguration : IEntityTypeConfiguration<Purchase>
{
    public void Configure(EntityTypeBuilder<Purchase> builder)
    {
        builder.ToTable("purchases");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Reference).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ContainerReference).HasMaxLength(100);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.PurchaseCurrency).HasConversion<string>().HasMaxLength(10);

        builder.Property(x => x.ExchangeRateToXof).HasPrecision(18, 6);
        builder.Property(x => x.CommissionCoefficient).HasPrecision(10, 6);
        builder.Property(x => x.FreightCoefficient).HasPrecision(10, 6);
        builder.Property(x => x.TransitCoefficient).HasPrecision(10, 6);
        builder.Property(x => x.TransferFeesCoefficient).HasPrecision(10, 6);
        builder.Property(x => x.DefaultMarginCoefficient).HasPrecision(10, 6);

        builder.HasOne(x => x.Supplier)
            .WithMany(s => s.Purchases)
            .HasForeignKey(x => x.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Reference).IsUnique();
    }
}
