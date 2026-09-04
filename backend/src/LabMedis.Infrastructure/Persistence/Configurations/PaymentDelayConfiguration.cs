using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class PaymentDelayConfiguration : IEntityTypeConfiguration<PaymentDelay>
{
    public void Configure(EntityTypeBuilder<PaymentDelay> b)
    {
        b.ToTable("payment_delays");
        b.HasKey(x => x.Id);
        b.Property(x => x.Label).IsRequired().HasMaxLength(100);
        b.HasIndex(x => x.Label).IsUnique();
    }
}
