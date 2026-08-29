using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class SupplierProformaRejectionConfiguration : IEntityTypeConfiguration<SupplierProformaRejection>
{
    public void Configure(EntityTypeBuilder<SupplierProformaRejection> builder)
    {
        builder.ToTable("supplier_proforma_rejections");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.ProformaReference).HasMaxLength(100);
        builder.Property(r => r.Reason).HasMaxLength(2000).IsRequired();

        builder.HasOne(r => r.SupplierOrder)
            .WithMany(o => o.ProformaRejections)
            .HasForeignKey(r => r.SupplierOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
