using System.ComponentModel.DataAnnotations;

namespace LabMedis.Application.Dtos.Categories;

public class CategoryUpdateDto
{
    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }
}
