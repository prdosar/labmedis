using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class DeliveryConfiguration : IEntityTypeConfiguration<Delivery>
{
    public void Configure(EntityTypeBuilder<Delivery> builder)
    {
        builder.ToTable("deliveries");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Reference).IsRequired().HasMaxLength(50);
        builder.Property(x => x.DeliveryAddress).HasMaxLength(300);
        builder.Property(x => x.RecipientName).HasMaxLength(200);
        builder.Property(x => x.CarrierName).HasMaxLength(150);
        builder.Property(x => x.TrackingNumber).HasMaxLength(100);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);

        builder.HasOne(x => x.Invoice)
            .WithMany(i => i.Deliveries)
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Reference).IsUnique();
    }
}
