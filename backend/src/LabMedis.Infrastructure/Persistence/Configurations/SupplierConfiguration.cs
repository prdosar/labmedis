using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class SupplierConfiguration : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> builder)
    {
        builder.ToTable("suppliers");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).IsRequired().HasMaxLength(10);
        builder.HasIndex(x => x.Code).IsUnique();
        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Address).HasMaxLength(300);
        builder.Property(x => x.PostalBox).HasMaxLength(50);
        builder.Property(x => x.Phone).HasMaxLength(100);
        builder.Property(x => x.Email).HasMaxLength(150);
        builder.Property(x => x.ContactPerson).HasMaxLength(150);

        builder.HasOne(x => x.Country)
            .WithMany()
            .HasForeignKey(x => x.CountryId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
