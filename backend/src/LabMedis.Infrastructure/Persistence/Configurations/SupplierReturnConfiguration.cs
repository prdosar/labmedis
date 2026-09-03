using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class SupplierReturnConfiguration : IEntityTypeConfiguration<SupplierReturn>
{
    public void Configure(EntityTypeBuilder<SupplierReturn> builder)
    {
        builder.ToTable("supplier_returns");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Reference).HasMaxLength(60).IsRequired();
        builder.Property(r => r.Currency).HasMaxLength(10).IsRequired();
        builder.Property(r => r.Reason).HasMaxLength(200);
        builder.Property(r => r.Notes).HasMaxLength(2000);
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(30);

        builder.Property(r => r.TotalAmountForeign).HasColumnType("numeric(18,4)");
        builder.Property(r => r.ExchangeRateToXof).HasColumnType("numeric(18,6)");
        builder.Property(r => r.TotalAmountXof).HasColumnType("numeric(18,2)");

        builder.HasIndex(r => r.Reference).IsUnique();

        builder.HasOne(r => r.Supplier)
            .WithMany()
            .HasForeignKey(r => r.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Purchase)
            .WithMany()
            .HasForeignKey(r => r.PurchaseId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(r => r.Lines)
            .WithOne(l => l.SupplierReturn)
            .HasForeignKey(l => l.SupplierReturnId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(r => r.Lines)
            .HasField("_lines")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
