using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class DeliveryDelayConfiguration : IEntityTypeConfiguration<DeliveryDelay>
{
    public void Configure(EntityTypeBuilder<DeliveryDelay> b)
    {
        b.ToTable("delivery_delays");
        b.HasKey(x => x.Id);
        b.Property(x => x.Label).IsRequired().HasMaxLength(100);
        b.HasIndex(x => x.Label).IsUnique();
    }
}
