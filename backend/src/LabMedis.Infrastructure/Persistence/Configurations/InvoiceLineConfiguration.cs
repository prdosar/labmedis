using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class InvoiceLineConfiguration : IEntityTypeConfiguration<InvoiceLine>
{
    public void Configure(EntityTypeBuilder<InvoiceLine> builder)
    {
        builder.ToTable("invoice_lines");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UnitPriceHt).HasPrecision(18, 4);
        builder.Property(x => x.DiscountPercent).HasPrecision(5, 2);
        builder.Property(x => x.TvaRate).HasPrecision(5, 4);
        builder.Property(x => x.LineTotalHt).HasPrecision(18, 4);
        builder.Property(x => x.LineTva).HasPrecision(18, 4);
        builder.Property(x => x.LineTotalTtc).HasPrecision(18, 4);

        builder.HasOne(x => x.Invoice)
            .WithMany(i => i.Lines)
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
