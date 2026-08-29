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
    IReadOnlyList<ManualJournalLineInput> Lines,
    /// <summary>Optionnel : rattacher cette OD à un arrivage spécifique pour alimenter son prix de revient.</summary>
    long? PurchaseId,
    /// <summary>Type de charge (Douane, Fret, TransportLocal, Chargement, Autres) — requis si PurchaseId est renseigné.</summary>
    string? ChargeType);
