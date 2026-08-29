namespace LabMedis.Application.Dtos.Packagings;

public record PackagingDto(
    long Id,
    string Name,
    string? Description,
    int UnitsPerPackaging,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
