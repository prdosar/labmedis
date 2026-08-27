using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class JournalLine : BaseEntity
{
    public long JournalEntryId { get; set; }
    public JournalEntry? JournalEntry { get; set; }

    public long AccountId { get; set; }
    public ChartAccount? Account { get; set; }

    public string? Label { get; set; }

    public decimal DebitAmount { get; set; }
    public decimal CreditAmount { get; set; }

    public long? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public long? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
}
