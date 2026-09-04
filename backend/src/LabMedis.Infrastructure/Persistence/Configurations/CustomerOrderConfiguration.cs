using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class CustomerOrderConfiguration : IEntityTypeConfiguration<CustomerOrder>
{
    public void Configure(EntityTypeBuilder<CustomerOrder> builder)
    {
        builder.ToTable("customer_orders");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Reference).IsRequired().HasMaxLength(30);
        builder.HasIndex(x => x.Reference).IsUnique();

        builder.Property(x => x.Status).HasConversion<int>();

        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.Property(x => x.TotalHt).HasColumnType("numeric(18,2)");
        builder.Property(x => x.TotalTva).HasColumnType("numeric(18,2)");
        builder.Property(x => x.TotalTtc).HasColumnType("numeric(18,2)");
        builder.Property(x => x.TotalCost).HasColumnType("numeric(18,2)");
        builder.Property(x => x.Profit).HasColumnType("numeric(18,2)");

        builder.HasOne(x => x.Customer)
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Invoice)
            .WithMany()
            .HasForeignKey(x => x.InvoiceId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.DeliveryDelay)
            .WithMany()
            .HasForeignKey(x => x.DeliveryDelayId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.PaymentDelay)
            .WithMany()
            .HasForeignKey(x => x.PaymentDelayId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(x => x.Lines)
            .WithOne(l => l.CustomerOrder)
            .HasForeignKey(l => l.CustomerOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(x => x.Lines)
            .HasField("_lines")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasMany(x => x.LotLines)
            .WithOne(l => l.CustomerOrder)
            .HasForeignKey(l => l.CustomerOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(x => x.LotLines)
            .HasField("_lotLines")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
