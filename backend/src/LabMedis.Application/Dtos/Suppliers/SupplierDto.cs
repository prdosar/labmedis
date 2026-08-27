namespace LabMedis.Application.Dtos.Suppliers;

public record SupplierDto(
    long Id,
    string Name,
    string? Address,
    string? PostalBox,
    string? Phone,
    string? Email,
    long? CountryId,
    string? CountryName,
    string? ContactPerson,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
