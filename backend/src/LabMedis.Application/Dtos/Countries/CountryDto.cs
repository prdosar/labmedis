namespace LabMedis.Application.Dtos.Countries;

public record CountryDto(
    long Id,
    string Name,
    string? IsoCode,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
