namespace LabMedis.Application.Dtos.Suppliers;

public record SupplierCreateDto(
    string Name,
    string? Address,
    string? PostalBox,
    string? Phone,
    string? Email,
    long? CountryId,
    string? ContactPerson);
