namespace LabMedis.Application.Dtos.Accounting;

public record ManualJournalLineInput(
    long AccountId,
    string? Label,
    decimal DebitAmount,
    decimal CreditAmount,
    long? CustomerId,
    long? SupplierId);

public record ManualJournalEntryInput(
    string JournalCode,
    DateTime EntryDate,
    string Reference,
    string Description,
    string? AttachmentFileName,
    string? AttachmentPath,
    IReadOnlyList<ManualJournalLineInput> Lines);
