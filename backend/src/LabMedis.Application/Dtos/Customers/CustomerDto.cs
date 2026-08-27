namespace LabMedis.Application.Dtos.Customers;

public record CustomerDto(
    long Id,
    string? Code,
    string Name,
    string? Address,
    string? PostalBox,
    string? Phone,
    string? Email,
    string? City,
    long? CountryId,
    string? CountryName,
    string? ContactPerson,
    decimal Balance,
    bool IsDeleted,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
