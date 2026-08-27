using LabMedis.Application.Dtos.ProductForms;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/product-forms")]
public class ProductFormsController : ControllerBase
{
    private readonly IProductFormService _service;

    public ProductFormsController(IProductFormService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductFormDto>>> GetAll([FromQuery] int page = 1, [FromQuery] int size = 10, CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, ct));

    [HttpGet("select")]
    public async Task<ActionResult<IReadOnlyList<ProductFormDto>>> GetForSelect(CancellationToken ct)
        => Ok(await _service.GetAllForSelectAsync(ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ProductFormDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ProductFormDto>> Create([FromBody] ProductFormCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ProductFormDto>> Update(long id, [FromBody] ProductFormUpdateDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateAsync(id, dto, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var deleted = await _service.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:long}/restore")]
    public async Task<IActionResult> Restore(long id, CancellationToken ct)
    {
        var restored = await _service.RestoreAsync(id, ct);
        return restored ? NoContent() : NotFound();
    }
}
