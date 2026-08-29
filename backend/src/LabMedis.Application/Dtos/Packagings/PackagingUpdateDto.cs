namespace LabMedis.Application.Dtos.Packagings;

public record PackagingUpdateDto(string Name, string? Description, int UnitsPerPackaging = 1);
