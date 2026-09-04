using LabMedis.Application.Dtos.StockMovements;
using Microsoft.AspNetCore.Authorization;
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
    public async Task<ActionResult<PagedResult<StockMovementDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int size = 10,
        [FromQuery] long? productId = null, [FromQuery] long? warehouseId = null,
        [FromQuery] string? movementType = null,
        [FromQuery] DateTime? dateFrom = null, [FromQuery] DateTime? dateTo = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, productId, warehouseId, movementType, dateFrom, dateTo, ct));

    [HttpPost("{id:long}/cancel")]
    public async Task<IActionResult> Cancel(long id, CancellationToken ct)
    {
        await _service.CancelAsync(id, ct);
        return NoContent();
    }

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

    [HttpPost("diverse-exit")]
    public async Task<ActionResult<StockMovementDto>> CreateDiverseExit([FromBody] DiverseExitCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateDiverseExitAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPost("opening-inventory")]
    public async Task<IActionResult> PostOpeningInventory([FromBody] OpeningInventoryInput input, CancellationToken ct)
    {
        await _service.PostOpeningInventoryAsync(input, ct);
        return NoContent();
    }
}
