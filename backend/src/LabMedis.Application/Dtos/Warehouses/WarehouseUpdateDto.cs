using System.ComponentModel.DataAnnotations;

namespace LabMedis.Application.Dtos.Warehouses;

public class WarehouseUpdateDto
{
    [Required]
    [StringLength(2, MinimumLength = 2)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [StringLength(300)]
    public string? Address { get; set; }

    [StringLength(100)]
    public string? City { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}
