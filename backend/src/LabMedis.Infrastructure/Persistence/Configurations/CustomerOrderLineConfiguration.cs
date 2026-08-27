using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class CustomerOrderLineConfiguration : IEntityTypeConfiguration<CustomerOrderLine>
{
    public void Configure(EntityTypeBuilder<CustomerOrderLine> builder)
    {
        builder.ToTable("customer_order_lines");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UnitPriceHt).HasColumnType("numeric(18,4)");
        builder.Property(x => x.UnitCostPrice).HasColumnType("numeric(18,4)");
        builder.Property(x => x.LineTotalHt).HasColumnType("numeric(18,2)");
        builder.Property(x => x.LineTotalTva).HasColumnType("numeric(18,2)");
        builder.Property(x => x.LineTotalTtc).HasColumnType("numeric(18,2)");
        builder.Property(x => x.LineTotalCost).HasColumnType("numeric(18,2)");

        builder.HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
