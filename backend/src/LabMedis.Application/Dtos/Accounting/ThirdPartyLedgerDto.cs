namespace LabMedis.Application.Dtos.Accounting;

public record ThirdPartyLedgerDto(
    string ThirdPartyType,
    long ThirdPartyId,
    string ThirdPartyName,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal Balance,
    IReadOnlyList<ThirdPartyLedgerEntryDto> Entries);
