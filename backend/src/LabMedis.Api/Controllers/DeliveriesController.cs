using LabMedis.Application.Dtos.Deliveries;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/deliveries")]
public class DeliveriesController : ControllerBase
{
    private readonly IDeliveryService _service;

    public DeliveriesController(IDeliveryService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<DeliveryDto>>> GetAll([FromQuery] int page = 1, [FromQuery] int size = 10, CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<DeliveryDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<DeliveryDto>> Create([FromBody] DeliveryCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<DeliveryDto>> Update(long id, [FromBody] DeliveryUpdateDto dto, CancellationToken ct)
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

    [HttpPost("{id:long}/lines")]
    public async Task<ActionResult<DeliveryLineDto>> AddLine(long id, [FromBody] DeliveryLineCreateDto dto, CancellationToken ct)
    {
        var line = await _service.AddLineAsync(id, dto, ct);
        return Ok(line);
    }

    [HttpDelete("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> RemoveLine(long id, long lineId, CancellationToken ct)
    {
        var removed = await _service.RemoveLineAsync(id, lineId, ct);
        return removed ? NoContent() : NotFound();
    }

    [HttpPost("{id:long}/ship")]
    public async Task<ActionResult<DeliveryDto>> Ship(long id, CancellationToken ct)
    {
        var result = await _service.ShipAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:long}/deliver")]
    public async Task<ActionResult<DeliveryDto>> MarkDelivered(long id, CancellationToken ct)
    {
        var result = await _service.MarkDeliveredAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:long}/cancel")]
    public async Task<ActionResult<DeliveryDto>> Cancel(long id, CancellationToken ct)
    {
        var result = await _service.CancelAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }
}
