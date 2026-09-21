namespace LabMedis.Application.Dtos.Suppliers;

public record SupplierDto(
    long Id,
    string Code,
    string Name,
    string? Address,
    string? PostalBox,
    string? Phone,
    string? Email,
    long? CountryId,
    string? CountryName,
    string? ContactPerson,
    long? ChartAccountId,
    string? ChartAccountCode,
    bool IsDeleted,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
