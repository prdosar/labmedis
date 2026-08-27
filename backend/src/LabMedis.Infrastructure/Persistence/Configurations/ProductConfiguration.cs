using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).IsRequired().HasMaxLength(50);
        builder.Property(x => x.Designation).IsRequired().HasMaxLength(300);
        builder.Property(x => x.CipCode).HasMaxLength(50);
        builder.Property(x => x.ActiveIngredient).HasMaxLength(300);

        builder.HasOne(x => x.Warehouse)
            .WithMany(w => w.Products)
            .HasForeignKey(x => x.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.TherapeuticClass)
            .WithMany(tc => tc.Products)
            .HasForeignKey(x => x.TherapeuticClassId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ProductForm)
            .WithMany(pf => pf.Products)
            .HasForeignKey(x => x.ProductFormId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Dosage)
            .WithMany(d => d.Products)
            .HasForeignKey(x => x.DosageId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Packaging)
            .WithMany(p => p.Products)
            .HasForeignKey(x => x.PackagingId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.OriginCountry)
            .WithMany(c => c.OriginatingProducts)
            .HasForeignKey(x => x.OriginCountryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CustomsRegime)
            .WithMany(cr => cr.Products)
            .HasForeignKey(x => x.CustomsRegimeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Supplier)
            .WithMany(s => s.Products)
            .HasForeignKey(x => x.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.Designation);
        builder.HasIndex(x => x.CipCode);
    }
}
