namespace LabMedis.Application.Dtos.Accounting;

public record CreateChartAccountDto(
    string Code,
    string Name,
    string AccountClass,
    string NormalBalance,
    bool IsThirdParty,
    string? ParentCode);

public record UpdateChartAccountDto(
    string Name,
    bool IsThirdParty,
    string? ParentCode);
