using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class CustomerCreditNoteConfiguration : IEntityTypeConfiguration<CustomerCreditNote>
{
    public void Configure(EntityTypeBuilder<CustomerCreditNote> builder)
    {
        builder.ToTable("customer_credit_notes");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Reference).HasMaxLength(60).IsRequired();
        builder.Property(c => c.Notes).HasMaxLength(2000);

        builder.Property(c => c.TotalAmountHt).HasColumnType("numeric(18,4)");
        builder.Property(c => c.TotalTva).HasColumnType("numeric(18,4)");
        builder.Property(c => c.TotalAmountTtc).HasColumnType("numeric(18,4)");

        builder.Property(c => c.Status).HasConversion<string>().HasMaxLength(30);

        builder.HasIndex(c => c.Reference).IsUnique();

        builder.HasOne(c => c.Customer)
            .WithMany()
            .HasForeignKey(c => c.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Invoice)
            .WithMany()
            .HasForeignKey(c => c.InvoiceId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(c => c.Lines)
            .WithOne(l => l.CreditNote)
            .HasForeignKey(l => l.CustomerCreditNoteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(c => c.Lines)
            .HasField("_lines")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
