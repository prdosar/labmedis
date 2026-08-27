using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class DeliveryLineConfiguration : IEntityTypeConfiguration<DeliveryLine>
{
    public void Configure(EntityTypeBuilder<DeliveryLine> builder)
    {
        builder.ToTable("delivery_lines");
        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Delivery)
            .WithMany(d => d.Lines)
            .HasForeignKey(x => x.DeliveryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.InvoiceLine)
            .WithMany(il => il.DeliveryLines)
            .HasForeignKey(x => x.InvoiceLineId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.PurchaseLine)
            .WithMany(pl => pl.DeliveryLines)
            .HasForeignKey(x => x.PurchaseLineId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
