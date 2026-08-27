namespace LabMedis.Application.Dtos.Suppliers;

public record SupplierUpdateDto(
    string Name,
    string? Address,
    string? PostalBox,
    string? Phone,
    string? Email,
    long? CountryId,
    string? ContactPerson);
