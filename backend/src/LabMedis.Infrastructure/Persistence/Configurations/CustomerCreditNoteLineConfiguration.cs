using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class CustomerCreditNoteLineConfiguration : IEntityTypeConfiguration<CustomerCreditNoteLine>
{
    public void Configure(EntityTypeBuilder<CustomerCreditNoteLine> builder)
    {
        builder.ToTable("customer_credit_note_lines");
        builder.HasKey(l => l.Id);

        builder.Property(l => l.LotNumber).HasMaxLength(100);

        builder.Property(l => l.UnitPriceHt).HasColumnType("numeric(18,4)");
        builder.Property(l => l.DiscountPercent).HasColumnType("numeric(5,2)");
        builder.Property(l => l.TvaRate).HasColumnType("numeric(5,4)");
        builder.Property(l => l.LineTotalHt).HasColumnType("numeric(18,4)");
        builder.Property(l => l.LineTva).HasColumnType("numeric(18,4)");
        builder.Property(l => l.LineTotalTtc).HasColumnType("numeric(18,4)");

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
