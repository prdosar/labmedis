using LabMedis.Application.Dtos.StockMovements;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/stock-movements")]
public class StockMovementsController : ControllerBase
{
    private readonly IStockMovementService _service;

    public StockMovementsController(IStockMovementService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<StockMovementDto>>> GetAll([FromQuery] int page = 1, [FromQuery] int size = 10, CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<StockMovementDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("by-product/{productId:long}")]
    public async Task<ActionResult<PagedResult<StockMovementDto>>> GetByProduct(long productId, [FromQuery] int page = 1, [FromQuery] int size = 10, CancellationToken ct = default)
        => Ok(await _service.GetByProductAsync(productId, page, size, ct));

    [HttpGet("by-warehouse/{warehouseId:long}")]
    public async Task<ActionResult<PagedResult<StockMovementDto>>> GetByWarehouse(long warehouseId, [FromQuery] int page = 1, [FromQuery] int size = 10, CancellationToken ct = default)
        => Ok(await _service.GetByWarehouseAsync(warehouseId, page, size, ct));

    [HttpPost]
    public async Task<ActionResult<StockMovementDto>> Create([FromBody] StockMovementCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }
}
