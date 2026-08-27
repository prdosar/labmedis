using LabMedis.Application.Dtos.Products;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _service;

    public ProductsController(IProductService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int size = 10,
        [FromQuery] string? search = null,
        [FromQuery] long? categoryId = null,
        [FromQuery] long? therapeuticClassId = null,
        [FromQuery] long? supplierId = null,
        [FromQuery] bool includeDeleted = false,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, search, categoryId, therapeuticClassId, supplierId, includeDeleted, ct));

    [HttpGet("select")]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetForSelect(CancellationToken ct)
        => Ok(await _service.GetAllForSelectAsync(ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ProductDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] ProductCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ProductDto>> Update(long id, [FromBody] ProductUpdateDto dto, CancellationToken ct)
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

    [HttpGet("{id:long}/history")]
    public async Task<ActionResult<ProductHistoryDto>> GetHistory(long id, CancellationToken ct)
    {
        var history = await _service.GetHistoryAsync(id, ct);
        return history is null ? NotFound() : Ok(history);
    }
}
