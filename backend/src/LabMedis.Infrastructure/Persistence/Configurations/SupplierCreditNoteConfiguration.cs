using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class SupplierCreditNoteConfiguration : IEntityTypeConfiguration<SupplierCreditNote>
{
    public void Configure(EntityTypeBuilder<SupplierCreditNote> builder)
    {
        builder.ToTable("supplier_credit_notes");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Reference).HasMaxLength(50).IsRequired();
        builder.Property(c => c.Currency).HasMaxLength(10).IsRequired();
        builder.Property(c => c.Notes).HasMaxLength(2000);

        builder.Property(c => c.AmountForeign).HasColumnType("numeric(18,4)");
        builder.Property(c => c.ExchangeRateToXof).HasColumnType("numeric(18,6)");
        builder.Property(c => c.AmountXof).HasColumnType("numeric(18,2)");

        builder.HasIndex(c => c.Reference).IsUnique();

        builder.HasOne(c => c.SupplierOrder)
            .WithMany()
            .HasForeignKey(c => c.SupplierOrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.SupplierInvoice)
            .WithMany()
            .HasForeignKey(c => c.SupplierInvoiceId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(c => c.Purchase)
            .WithMany()
            .HasForeignKey(c => c.PurchaseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Supplier)
            .WithMany()
            .HasForeignKey(c => c.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
