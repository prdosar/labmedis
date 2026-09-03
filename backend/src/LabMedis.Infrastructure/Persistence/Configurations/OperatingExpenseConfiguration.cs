using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class OperatingExpenseConfiguration : IEntityTypeConfiguration<OperatingExpense>
{
    public void Configure(EntityTypeBuilder<OperatingExpense> builder)
    {
        builder.ToTable("operating_expenses");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Description).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Reference).HasMaxLength(100);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.Montant).HasColumnType("numeric(18,2)");
        builder.Property(x => x.Categorie).HasConversion<int>();
        builder.Property(x => x.ModePaiement).HasConversion<int>();

        builder.HasIndex(x => new { x.Categorie, x.Date });
    }
}
