namespace LabMedis.Application.Dtos.Packagings;

public record PackagingCreateDto(string Name, string? Description, int UnitsPerPackaging = 1);
