using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class TherapeuticClassConfiguration : IEntityTypeConfiguration<TherapeuticClass>
{
    public void Configure(EntityTypeBuilder<TherapeuticClass> builder)
    {
        builder.ToTable("therapeutic_classes");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Description).HasMaxLength(500);

        builder.HasOne(x => x.Category)
            .WithMany(c => c.TherapeuticClasses)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.CategoryId, x.Name }).IsUnique();
    }
}
