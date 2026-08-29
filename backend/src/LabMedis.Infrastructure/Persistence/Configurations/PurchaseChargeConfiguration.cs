using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class PurchaseChargeConfiguration : IEntityTypeConfiguration<PurchaseCharge>
{
    public void Configure(EntityTypeBuilder<PurchaseCharge> builder)
    {
        builder.ToTable("purchase_charges");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ChargeType).IsRequired().HasMaxLength(50);
        builder.Property(x => x.Description).IsRequired().HasMaxLength(300);
        builder.Property(x => x.AmountXof).HasPrecision(18, 2);
        builder.Property(x => x.Reference).HasMaxLength(100);
        builder.Property(x => x.DebitAccountCode).IsRequired().HasMaxLength(20);
        builder.Property(x => x.CreditAccountCode).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasOne(x => x.Purchase)
            .WithMany(p => p.Charges)
            .HasForeignKey(x => x.PurchaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.JournalEntry)
            .WithMany()
            .HasForeignKey(x => x.JournalEntryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.PurchaseId);
    }
}
