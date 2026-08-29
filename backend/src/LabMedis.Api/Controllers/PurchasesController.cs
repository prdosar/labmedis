using LabMedis.Application.Dtos.Purchases;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/purchases")]
public class PurchasesController : ControllerBase
{
    private readonly IPurchaseService _service;

    public PurchasesController(IPurchaseService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<PurchaseDto>>> GetAll([FromQuery] int page = 1, [FromQuery] int size = 10, CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<PurchaseDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<PurchaseDto>> Create([FromBody] PurchaseCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<PurchaseDto>> Update(long id, [FromBody] PurchaseUpdateDto dto, CancellationToken ct)
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
    public async Task<ActionResult<PurchaseLineDto>> AddLine(long id, [FromBody] PurchaseLineCreateDto dto, CancellationToken ct)
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

    [HttpPost("{id:long}/lines/{lineId:long}/transports")]
    public async Task<ActionResult<PurchaseLineTransportDto>> AddTransport(long id, long lineId, [FromBody] PurchaseLineTransportCreateDto dto, CancellationToken ct)
    {
        var transport = await _service.AddTransportAsync(id, lineId, dto, ct);
        return Ok(transport);
    }

    [HttpPut("{id:long}/lines/{lineId:long}/transports/{transportTypeId:long}")]
    public async Task<ActionResult<PurchaseLineTransportDto>> UpdateTransport(long id, long lineId, long transportTypeId, [FromBody] PurchaseLineTransportUpdateDto dto, CancellationToken ct)
    {
        var transport = await _service.UpdateTransportAsync(id, lineId, transportTypeId, dto, ct);
        return transport is null ? NotFound() : Ok(transport);
    }

    [HttpDelete("{id:long}/lines/{lineId:long}/transports/{transportTypeId:long}")]
    public async Task<IActionResult> RemoveTransport(long id, long lineId, long transportTypeId, CancellationToken ct)
    {
        var removed = await _service.RemoveTransportAsync(id, lineId, transportTypeId, ct);
        return removed ? NoContent() : NotFound();
    }

    [HttpPatch("lines/{lineId:long}/price")]
    public async Task<ActionResult<PurchaseLineDto>> UpdateLotPrice(long lineId, [FromBody] UpdateLotPriceDto dto, CancellationToken ct)
        => Ok(await _service.UpdateLotPriceAsync(lineId, dto, ct));
}
