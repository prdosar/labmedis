namespace LabMedis.Application.Dtos.Packagings;

public record PackagingDto(
    long Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
