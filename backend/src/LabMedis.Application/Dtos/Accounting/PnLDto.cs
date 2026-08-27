namespace LabMedis.Application.Dtos.Accounting;

public record PnLLineDto(
    long AccountId,
    string AccountCode,
    string AccountName,
    decimal Amount);

public record PnLDto(
    IReadOnlyList<PnLLineDto> Income,
    IReadOnlyList<PnLLineDto> Expenses,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal NetResult);
