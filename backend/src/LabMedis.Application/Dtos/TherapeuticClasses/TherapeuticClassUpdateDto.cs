using System.ComponentModel.DataAnnotations;

namespace LabMedis.Application.Dtos.TherapeuticClasses;

public class TherapeuticClassUpdateDto
{
    [Required]
    public long CategoryId { get; set; }

    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }
}
