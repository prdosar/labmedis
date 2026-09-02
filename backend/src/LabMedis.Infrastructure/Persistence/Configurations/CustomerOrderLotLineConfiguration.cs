using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class CustomerOrderLotLineConfiguration : IEntityTypeConfiguration<CustomerOrderLotLine>
{
    public void Configure(EntityTypeBuilder<CustomerOrderLotLine> b)
    {
        b.ToTable("customer_order_lot_lines");

        b.HasOne(l => l.CustomerOrderLine)
            .WithMany()
            .HasForeignKey(l => l.CustomerOrderLineId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(l => l.Product)
            .WithMany()
            .HasForeignKey(l => l.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(l => l.PurchaseLine)
            .WithMany()
            .HasForeignKey(l => l.PurchaseLineId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(l => l.Warehouse)
            .WithMany()
            .HasForeignKey(l => l.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
