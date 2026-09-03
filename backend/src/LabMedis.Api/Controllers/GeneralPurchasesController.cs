using LabMedis.Application.Dtos.GeneralPurchases;
using LabMedis.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/general-purchases")]
[Authorize]
public class GeneralPurchasesController : ControllerBase
{
    private readonly IGeneralPurchaseService _service;

    public GeneralPurchasesController(IGeneralPurchaseService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int size = 20, CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, ct));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GeneralPurchaseCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] GeneralPurchaseUpdateDto dto, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, dto, ct));

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var deleted = await _service.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:long}/mark-paid")]
    public async Task<IActionResult> MarkPaid(long id, [FromBody] MarkPaidRequest request, CancellationToken ct)
        => Ok(await _service.MarkPaidAsync(id, request.DatePaiement, ct));

    public record MarkPaidRequest(DateOnly DatePaiement);
}
