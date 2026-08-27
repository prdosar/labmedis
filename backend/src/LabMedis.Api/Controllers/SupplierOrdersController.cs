using LabMedis.Application.Dtos.SupplierOrders;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/supplier-orders")]
public class SupplierOrdersController : ControllerBase
{
    private readonly ISupplierOrderService _service;

    public SupplierOrdersController(ISupplierOrderService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<SupplierOrderSummaryDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] string? status = null,
        [FromQuery] long? supplierId = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, status, supplierId, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SupplierOrderDto>> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<SupplierOrderDto>> Create([FromBody] SupplierOrderCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<SupplierOrderDto>> Update(long id, [FromBody] SupplierOrderUpdateDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateAsync(id, dto, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("{id:long}/send")]
    public async Task<ActionResult<SupplierOrderDto>> MarkSent(long id, CancellationToken ct)
        => Ok(await _service.MarkSentAsync(id, ct));

    [HttpPost("{id:long}/cancel")]
    public async Task<ActionResult<SupplierOrderDto>> Cancel(long id, CancellationToken ct)
        => Ok(await _service.CancelAsync(id, ct));

    [HttpPost("{id:long}/receive-proforma")]
    public async Task<ActionResult<SupplierOrderDto>> ReceiveProforma(
        long id, [FromBody] ReceiveProformaDto dto, CancellationToken ct)
        => Ok(await _service.ReceiveProformaAsync(id, dto, ct));

    // ── Documents ────────────────────────────────────────────────────────────────

    [HttpGet("{id:long}/documents")]
    public async Task<ActionResult<IReadOnlyList<SupplierOrderDocumentDto>>> GetDocuments(long id, CancellationToken ct)
        => Ok(await _service.GetDocumentsAsync(id, ct));

    [HttpPost("{id:long}/documents")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB
    public async Task<ActionResult<SupplierOrderDocumentDto>> UploadDocument(
        long id,
        IFormFile file,
        [FromForm] string documentType = "Proforma",
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest("Aucun fichier fourni.");

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
}
