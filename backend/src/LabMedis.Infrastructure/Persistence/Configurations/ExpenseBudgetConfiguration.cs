using LabMedis.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabMedis.Infrastructure.Persistence.Configurations;

public class ExpenseBudgetConfiguration : IEntityTypeConfiguration<ExpenseBudget>
{
    public void Configure(EntityTypeBuilder<ExpenseBudget> builder)
    {
        builder.ToTable("expense_budgets");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.MontantBudget).HasColumnType("numeric(18,2)");
        builder.Property(x => x.Categorie).HasConversion<int>();

        builder.HasIndex(x => new { x.Annee, x.Mois, x.Categorie }).IsUnique();
    }
}
