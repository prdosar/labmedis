namespace LabMedis.Application.Dtos.Accounting;

public record JournalLineDto(
    long Id,
    long AccountId,
    string AccountCode,
    string AccountName,
    string? Label,
    decimal DebitAmount,
    decimal CreditAmount,
    long? CustomerId,
    string? CustomerName,
    long? SupplierId,
    string? SupplierName);
