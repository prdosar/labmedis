using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class SupplierOrderConfiguration : IEntityTypeConfiguration<SupplierOrder>
{
    public void Configure(EntityTypeBuilder<SupplierOrder> builder)
    {
        builder.ToTable("supplier_orders");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Reference).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => x.Reference).IsUnique();

        builder.Property(x => x.Currency).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Status).HasConversion<int>();

        builder.Property(x => x.ProformaReference).HasMaxLength(100);
        builder.Property(x => x.ProformaFilePath).HasMaxLength(500);
        builder.Property(x => x.ContainerReference).HasMaxLength(200);
        builder.Property(x => x.FreightAmount).HasColumnType("numeric(18,4)");
        builder.Property(x => x.PaymentTerms).HasMaxLength(300);
        builder.Property(x => x.Brand).HasMaxLength(100);
        builder.Property(x => x.Origin).HasMaxLength(100);

        builder.HasOne(x => x.Supplier)
            .WithMany()
            .HasForeignKey(x => x.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Lines)
            .WithOne(l => l.SupplierOrder)
            .HasForeignKey(l => l.SupplierOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Documents)
            .WithOne(d => d.SupplierOrder)
            .HasForeignKey(d => d.SupplierOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(x => x.Lines)
            .HasField("_lines")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.Navigation(x => x.Documents)
            .HasField("_documents")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
