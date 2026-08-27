using LabMedis.Application.Dtos.Customers;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _service;

    public CustomersController(ICustomerService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<CustomerDto>>> GetAll([FromQuery] int page = 1, [FromQuery] int size = 10, [FromQuery] bool includeDeleted = false, CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, includeDeleted, ct));

    [HttpGet("select")]
    public async Task<ActionResult<IReadOnlyList<CustomerDto>>> GetForSelect(CancellationToken ct)
        => Ok(await _service.GetAllForSelectAsync(ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<CustomerDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create([FromBody] CustomerCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<CustomerDto>> Update(long id, [FromBody] CustomerUpdateDto dto, CancellationToken ct)
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
