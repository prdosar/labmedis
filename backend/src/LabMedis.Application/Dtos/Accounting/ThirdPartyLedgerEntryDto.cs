namespace LabMedis.Application.Dtos.Accounting;

public record ThirdPartyLedgerEntryDto(
    long JournalEntryId,
    DateTime EntryDate,
    string JournalCode,
    string Reference,
    string Description,
    decimal DebitAmount,
    decimal CreditAmount,
    decimal RunningBalance);
