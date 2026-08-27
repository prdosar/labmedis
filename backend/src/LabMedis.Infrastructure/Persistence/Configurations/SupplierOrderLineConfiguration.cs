using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class SupplierOrderLineConfiguration : IEntityTypeConfiguration<SupplierOrderLine>
{
    public void Configure(EntityTypeBuilder<SupplierOrderLine> builder)
    {
        builder.ToTable("supplier_order_lines");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.OrderUnit).IsRequired().HasMaxLength(20);
        builder.Property(x => x.UnitFobPrice).HasColumnType("numeric(18,4)");

        builder.HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
