namespace LabMedis.Application.Dtos.Accounting;

public record ChartAccountDto(
    long Id,
    string Code,
    string Name,
    string AccountClass,
    string NormalBalance,
    bool IsThirdParty,
    bool IsSystem,
    string? ParentCode,
    DateTime CreatedAt);
