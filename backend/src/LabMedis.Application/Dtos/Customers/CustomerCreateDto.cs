namespace LabMedis.Application.Dtos.Customers;

public record CustomerCreateDto(
    string? Code,
    string Name,
    string? Address,
    string? PostalBox,
    string? Phone,
    string? Email,
    string? City,
    long? CountryId,
    string? ContactPerson);
