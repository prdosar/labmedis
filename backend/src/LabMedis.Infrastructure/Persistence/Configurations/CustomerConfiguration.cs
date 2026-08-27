using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("customers");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Address).HasMaxLength(300);
        builder.Property(x => x.PostalBox).HasMaxLength(50);
        builder.Property(x => x.Phone).HasMaxLength(100);
        builder.Property(x => x.Email).HasMaxLength(150);
        builder.Property(x => x.City).HasMaxLength(100);
        builder.Property(x => x.ContactPerson).HasMaxLength(150);

        builder.HasIndex(x => x.Code).IsUnique();

        builder.HasOne(x => x.Country)
            .WithMany()
            .HasForeignKey(x => x.CountryId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Property(x => x.ChartAccountId);
        builder.HasOne(x => x.ChartAccount)
            .WithMany()
            .HasForeignKey(x => x.ChartAccountId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
