using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class PurchaseLineTransportConfiguration : IEntityTypeConfiguration<PurchaseLineTransport>
{
    public void Configure(EntityTypeBuilder<PurchaseLineTransport> builder)
    {
        builder.ToTable("purchase_line_transports");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Quantity).IsRequired();

        builder.HasOne(x => x.PurchaseLine)
            .WithMany(pl => pl.Transports)
            .HasForeignKey(x => x.PurchaseLineId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.TransportType)
            .WithMany(tt => tt.PurchaseLineTransports)
            .HasForeignKey(x => x.TransportTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.PurchaseLineId, x.TransportTypeId }).IsUnique();
    }
}
