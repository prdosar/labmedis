namespace LabMedis.Application.Dtos.Accounting;

public record JournalEntryDto(
    long Id,
    string JournalCode,
    DateTime EntryDate,
    string Reference,
    string Description,
    string SourceType,
    long? SourceId,
    bool IsPosted,
    string? AttachmentFileName,
    string? AttachmentPath,
    IReadOnlyList<JournalLineDto> Lines,
    DateTime CreatedAt);
