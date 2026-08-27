using LabMedis.Application.Dtos.CustomerOrders;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/customer-orders")]
public class CustomerOrdersController : ControllerBase
{
    private readonly ICustomerOrderService _service;

    public CustomerOrdersController(ICustomerOrderService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<CustomerOrderSummaryDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] string? status = null,
        [FromQuery] long? customerId = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, status, customerId, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<CustomerOrderDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerOrderDto>> Create([FromBody] CustomerOrderCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<CustomerOrderDto>> Update(long id, [FromBody] CustomerOrderUpdateDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateAsync(id, dto, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("{id:long}/validate")]
    public async Task<ActionResult<CustomerOrderDto>> Validate(long id, CancellationToken ct)
        => Ok(await _service.ValidateAsync(id, ct));

    [HttpPost("{id:long}/complete")]
    public async Task<ActionResult<CustomerOrderDto>> Complete(long id, CancellationToken ct)
        => Ok(await _service.CompleteAsync(id, ct));

    [HttpPost("{id:long}/cancel")]
    public async Task<ActionResult<CustomerOrderDto>> Cancel(long id, CancellationToken ct)
        => Ok(await _service.CancelAsync(id, ct));

    [HttpPost("preview")]
    public async Task<ActionResult<CustomerOrderPreviewDto>> Preview([FromBody] CustomerOrderPreviewRequestDto dto, CancellationToken ct)
        => Ok(await _service.PreviewAsync(dto, ct));

    [HttpGet("stock/{productId:long}")]
    public async Task<ActionResult<int>> GetStock(long productId, [FromQuery] long? excludeOrderId = null, CancellationToken ct = default)
        => Ok(await _service.GetAvailableStockAsync(productId, excludeOrderId, ct));

    [HttpGet("customer-stats/{customerId:long}")]
    public async Task<ActionResult<CustomerStatsDto>> GetCustomerStats(long customerId, CancellationToken ct)
        => Ok(await _service.GetCustomerStatsAsync(customerId, ct));
}
