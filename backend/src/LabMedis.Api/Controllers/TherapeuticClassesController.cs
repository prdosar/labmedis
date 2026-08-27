using LabMedis.Application.Dtos.TherapeuticClasses;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/therapeutic-classes")]
public class TherapeuticClassesController : ControllerBase
{
    private readonly ITherapeuticClassService _service;

    public TherapeuticClassesController(ITherapeuticClassService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<TherapeuticClassDto>>> GetAll([FromQuery] long? categoryId, [FromQuery] int page = 1, [FromQuery] int size = 10, CancellationToken ct = default)
    {
        if (categoryId.HasValue)
            return Ok(await _service.GetByCategoryAsync(categoryId.Value, page, size, ct));
        return Ok(await _service.GetAllAsync(page, size, ct));
    }

    [HttpGet("select")]
    public async Task<ActionResult<IReadOnlyList<TherapeuticClassDto>>> GetForSelect([FromQuery] long? categoryId, CancellationToken ct)
    {
        if (categoryId.HasValue)
            return Ok(await _service.GetByCategoryForSelectAsync(categoryId.Value, ct));
        return Ok(await _service.GetAllForSelectAsync(ct));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<TherapeuticClassDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<TherapeuticClassDto>> Create([FromBody] TherapeuticClassCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<TherapeuticClassDto>> Update(long id, [FromBody] TherapeuticClassUpdateDto dto, CancellationToken ct)
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
