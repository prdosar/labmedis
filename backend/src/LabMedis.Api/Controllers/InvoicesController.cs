using LabMedis.Application.Dtos.Invoices;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/invoices")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _service;

    public InvoicesController(IInvoiceService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<InvoiceDto>>> GetAll([FromQuery] int page = 1, [FromQuery] int size = 10, CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<InvoiceDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<InvoiceDto>> Create([FromBody] InvoiceCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<InvoiceDto>> Update(long id, [FromBody] InvoiceUpdateDto dto, CancellationToken ct)
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
    public async Task<ActionResult<InvoiceLineDto>> AddLine(long id, [FromBody] InvoiceLineCreateDto dto, CancellationToken ct)
    {
        var line = await _service.AddLineAsync(id, dto, ct);
        return Ok(line);
    }

    [HttpPut("{id:long}/lines/{lineId:long}")]
    public async Task<ActionResult<InvoiceLineDto>> UpdateLine(long id, long lineId, [FromBody] InvoiceLineUpdateDto dto, CancellationToken ct)
    {
        var line = await _service.UpdateLineAsync(id, lineId, dto, ct);
        return line is null ? NotFound() : Ok(line);
    }

    [HttpDelete("{id:long}/lines/{lineId:long}")]
    public async Task<IActionResult> RemoveLine(long id, long lineId, CancellationToken ct)
    {
        var removed = await _service.RemoveLineAsync(id, lineId, ct);
        return removed ? NoContent() : NotFound();
    }

    [HttpPost("{id:long}/issue")]
    public async Task<ActionResult<InvoiceDto>> Issue(long id, CancellationToken ct)
    {
        var result = await _service.IssueAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:long}/payment")]
    public async Task<ActionResult<InvoiceDto>> RegisterPayment(long id, [FromBody] RegisterPaymentDto dto, CancellationToken ct)
    {
        var result = await _service.RegisterPaymentAsync(id, dto, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:long}/cancel")]
    public async Task<ActionResult<InvoiceDto>> Cancel(long id, CancellationToken ct)
    {
        var result = await _service.CancelAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }
}
