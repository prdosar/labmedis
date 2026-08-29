using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class SupplierInvoiceConfiguration : IEntityTypeConfiguration<SupplierInvoice>
{
    public void Configure(EntityTypeBuilder<SupplierInvoice> builder)
    {
        builder.ToTable("supplier_invoices");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.InvoiceReference).HasMaxLength(100).IsRequired();
        builder.Property(i => i.Currency).HasMaxLength(10).IsRequired();
        builder.Property(i => i.Notes).HasMaxLength(2000);

        builder.Property(i => i.TotalAmountForeign).HasColumnType("numeric(18,4)");
        builder.Property(i => i.ExchangeRateToXof).HasColumnType("numeric(18,6)");
        builder.Property(i => i.TotalAmountXof).HasColumnType("numeric(18,2)");
        builder.Property(i => i.AmountPaid).HasColumnType("numeric(18,2)");

        // Une commande = une facture fournisseur
        builder.HasIndex(i => i.SupplierOrderId).IsUnique();

        builder.HasOne(i => i.SupplierOrder)
            .WithOne(o => o.SupplierInvoice)
            .HasForeignKey<SupplierInvoice>(i => i.SupplierOrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Supplier)
            .WithMany()
            .HasForeignKey(i => i.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
