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

    [HttpGet("{id:long}/suggested-lots")]
    public async Task<ActionResult<IReadOnlyList<CustomerOrderSuggestedLotDto>>> GetSuggestedLots(long id, CancellationToken ct)
        => Ok(await _service.GetSuggestedLotsAsync(id, ct));

    [HttpPost("{id:long}/prepare")]
    public async Task<ActionResult<CustomerOrderDto>> Prepare(long id, [FromBody] PrepareOrderDto dto, CancellationToken ct)
        => Ok(await _service.PrepareAsync(id, dto, ct));

    [HttpPost("{id:long}/complete")]
    public async Task<ActionResult<CustomerOrderDto>> Complete(long id, [FromBody] CompleteOrderDto? dto, CancellationToken ct)
        => Ok(await _service.CompleteAsync(id, dto, ct));

    [HttpPost("{id:long}/cancel")]
    public async Task<ActionResult<CustomerOrderDto>> Cancel(long id, CancellationToken ct)
        => Ok(await _service.CancelAsync(id, ct));

    [HttpPost("preview")]
    public async Task<ActionResult<CustomerOrderPreviewDto>> Preview([FromBody] CustomerOrderPreviewRequestDto dto, CancellationToken ct)
        => Ok(await _service.PreviewAsync(dto, ct));

    [HttpGet("stock/{productId:long}")]
    public async Task<ActionResult<ProductStockInfoDto>> GetStock(long productId, [FromQuery] long? excludeOrderId = null, CancellationToken ct = default)
        => Ok(await _service.GetStockInfoAsync(productId, excludeOrderId, ct));

    [HttpGet("customer-stats/{customerId:long}")]
    public async Task<ActionResult<CustomerStatsDto>> GetCustomerStats(long customerId, CancellationToken ct)
        => Ok(await _service.GetCustomerStatsAsync(customerId, ct));

    // ── Documents ────────────────────────────────────────────────────────────────

    [HttpGet("{id:long}/documents")]
    public async Task<ActionResult<IReadOnlyList<CustomerOrderDocumentDto>>> GetDocuments(long id, CancellationToken ct)
        => Ok(await _service.GetDocumentsAsync(id, ct));

    [HttpPost("{id:long}/documents")]
    [RequestSizeLimit(26_214_400)]
    public async Task<ActionResult<CustomerOrderDocumentDto>> UploadDocument(
        long id, IFormFile file, [FromForm] string documentType = "BonCommande", CancellationToken ct = default)
    {
        await using var stream = file.OpenReadStream();
        var doc = await _service.UploadDocumentAsync(id, stream, file.FileName, file.Length, documentType, ct);
        return Ok(doc);
    }

    [HttpDelete("documents/{documentId:long}")]
    public async Task<IActionResult> DeleteDocument(long documentId, CancellationToken ct)
    {
        await _service.DeleteDocumentAsync(documentId, ct);
        return NoContent();
    }

    // ── Email ─────────────────────────────────────────────────────────────────────

    [HttpPost("{id:long}/send-email")]
    public async Task<IActionResult> SendEmail(long id, [FromQuery] string type = "proforma", CancellationToken ct = default)
    {
        await _service.SendEmailAsync(id, type, ct);
        return NoContent();
    }
}
