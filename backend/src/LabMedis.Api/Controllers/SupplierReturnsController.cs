using LabMedis.Application.Dtos.SupplierReturns;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/supplier-returns")]
public class SupplierReturnsController : ControllerBase
{
    private readonly ISupplierReturnService _service;

    public SupplierReturnsController(ISupplierReturnService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<SupplierReturnDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] long? supplierId = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, supplierId, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SupplierReturnDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<SupplierReturnDto>> Create([FromBody] CreateSupplierReturnDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:long}/status")]
    public async Task<ActionResult<SupplierReturnDto>> UpdateStatus(
        long id, [FromBody] UpdateSupplierReturnStatusDto dto, CancellationToken ct)
        => Ok(await _service.UpdateStatusAsync(id, dto, ct));
}
