namespace LabMedis.Application.Dtos.Accounting;

public record TrialBalanceLineDto(
    long AccountId,
    string AccountCode,
    string AccountName,
    string AccountClass,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal Balance);
