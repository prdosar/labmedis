using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class SupplierOrderDocumentConfiguration : IEntityTypeConfiguration<SupplierOrderDocument>
{
    public void Configure(EntityTypeBuilder<SupplierOrderDocument> builder)
    {
        builder.ToTable("supplier_order_documents");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.DocumentType).IsRequired().HasMaxLength(50);
        builder.Property(x => x.FileName).IsRequired().HasMaxLength(255);
        builder.Property(x => x.FilePath).IsRequired().HasMaxLength(500);

        builder.HasOne(x => x.SupplierOrder)
            .WithMany(o => o.Documents)
            .HasForeignKey(x => x.SupplierOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
