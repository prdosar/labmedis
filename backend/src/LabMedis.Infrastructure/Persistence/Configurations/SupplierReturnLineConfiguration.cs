using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class SupplierReturnLineConfiguration : IEntityTypeConfiguration<SupplierReturnLine>
{
    public void Configure(EntityTypeBuilder<SupplierReturnLine> builder)
    {
        builder.ToTable("supplier_return_lines");
        builder.HasKey(l => l.Id);

        builder.Property(l => l.LotNumber).HasMaxLength(100);
        builder.Property(l => l.UnitCostForeign).HasColumnType("numeric(18,4)");
        builder.Property(l => l.UnitCostXof).HasColumnType("numeric(18,4)");
        builder.Property(l => l.LineTotalForeign).HasColumnType("numeric(18,4)");
        builder.Property(l => l.LineTotalXof).HasColumnType("numeric(18,2)");

        builder.HasOne(l => l.Product)
            .WithMany()
            .HasForeignKey(l => l.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(l => l.Warehouse)
            .WithMany()
            .HasForeignKey(l => l.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(l => l.PurchaseLine)
            .WithMany()
            .HasForeignKey(l => l.PurchaseLineId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(l => l.StockMovement)
            .WithMany()
            .HasForeignKey(l => l.StockMovementId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
