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

    [HttpPost("{id:long}/validate-proforma")]
    public async Task<ActionResult<SupplierOrderDto>> ValidateProforma(long id, CancellationToken ct)
        => Ok(await _service.ValidateProformaAsync(id, ct));

    [HttpPost("{id:long}/reject-proforma")]
    public async Task<ActionResult<SupplierOrderDto>> RejectProforma(
        long id, [FromBody] RejectProformaDto dto, CancellationToken ct)
        => Ok(await _service.RejectProformaAsync(id, dto, ct));

    [HttpPost("{id:long}/receive-invoice")]
    public async Task<ActionResult<SupplierOrderDto>> ReceiveInvoice(
        long id, [FromBody] ReceiveSupplierInvoiceDto dto, CancellationToken ct)
        => Ok(await _service.ReceiveInvoiceAsync(id, dto, ct));

    [HttpPost("{id:long}/receive-goods")]
    public async Task<ActionResult<SupplierOrderDto>> ReceiveGoods(
        long id, [FromBody] ReceiveGoodsDto dto, CancellationToken ct)
        => Ok(await _service.ReceiveGoodsAsync(id, dto, ct));

    [HttpPost("{id:long}/close-reception")]
    public async Task<ActionResult<SupplierOrderDto>> CloseReception(long id, CancellationToken ct)
        => Ok(await _service.CloseReceptionAsync(id, ct));

    // ── Arrivages (réceptions) ────────────────────────────────────────────────────

    [HttpGet("{id:long}/receptions")]
    public async Task<ActionResult<IReadOnlyList<PurchaseSummaryDto>>> GetReceptions(long id, CancellationToken ct)
        => Ok(await _service.GetReceptionsAsync(id, ct));

    // ── Charges d'arrivage ────────────────────────────────────────────────────────

    [HttpGet("purchases/{purchaseId:long}/charges")]
    public async Task<ActionResult<IReadOnlyList<PurchaseChargeDto>>> GetCharges(long purchaseId, CancellationToken ct)
        => Ok(await _service.GetPurchaseChargesAsync(purchaseId, ct));

    [HttpPost("purchases/{purchaseId:long}/charges")]
    public async Task<ActionResult<PurchaseChargeDto>> AddCharge(
        long purchaseId, [FromBody] AddPurchaseChargeDto dto, CancellationToken ct)
        => Ok(await _service.AddPurchaseChargeAsync(purchaseId, dto, ct));

    // ── Factures fournisseurs ─────────────────────────────────────────────────────

    [HttpGet("invoices")]
    public async Task<ActionResult<PagedResult<SupplierInvoiceDto>>> GetAllInvoices(
        [FromQuery] int page = 1,
        [FromQuery] int size = 50,
        [FromQuery] string? status = null,
        [FromQuery] long? supplierId = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllInvoicesAsync(page, size, status, supplierId, ct));

    [HttpGet("invoices/{invoiceId:long}")]
    public async Task<ActionResult<SupplierInvoiceDto>> GetInvoiceById(long invoiceId, CancellationToken ct)
    {
        var result = await _service.GetInvoiceByIdAsync(invoiceId, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("invoices/{invoiceId:long}/payment")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<SupplierInvoiceDto>> RegisterPayment(
        long invoiceId,
        [FromForm] decimal amount,
        [FromForm] string paymentDate,
        [FromForm] string? paymentMethod = null,
        [FromForm] string? reference = null,
        [FromForm] string? notes = null,
        IFormFile? attachmentFile = null,
        CancellationToken ct = default)
    {
        var dto = new RegisterSupplierPaymentDto
        {
            Amount = amount,
            PaymentDate = DateOnly.TryParse(paymentDate, out var pd) ? pd : DateOnly.FromDateTime(DateTime.UtcNow),
            PaymentMethod = paymentMethod,
            Reference = reference,
            Notes = notes
        };
        await using var stream = attachmentFile is { Length: > 0 } ? attachmentFile.OpenReadStream() : null;
        return Ok(await _service.RegisterPaymentAsync(invoiceId, dto, stream, attachmentFile?.FileName, ct));
    }

    // ── Documents ────────────────────────────────────────────────────────────────

    [HttpGet("{id:long}/documents")]
    public async Task<ActionResult<IReadOnlyList<SupplierOrderDocumentDto>>> GetDocuments(long id, CancellationToken ct)
        => Ok(await _service.GetDocumentsAsync(id, ct));

    [HttpPost("{id:long}/documents")]
    [RequestSizeLimit(20 * 1024 * 1024)]
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

    [HttpPost("{id:long}/send-email")]
    public async Task<IActionResult> SendByEmail(long id, [FromBody] SendOrderEmailDto dto, CancellationToken ct)
    {
        await _service.SendOrderByEmailAsync(id, dto.RecipientEmail, ct);
        return Ok(new { message = "Bon de commande envoyé par email." });
    }

    // ── Factures avoir fournisseurs ───────────────────────────────────────────────

    [HttpGet("credit-notes")]
    public async Task<ActionResult<PagedResult<SupplierCreditNoteDto>>> GetAllCreditNotes(
        [FromQuery] int page = 1,
        [FromQuery] int size = 50,
        [FromQuery] string? status = null,
        [FromQuery] long? supplierId = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllCreditNotesAsync(page, size, status, supplierId, ct));

    [HttpGet("{id:long}/credit-notes")]
    public async Task<ActionResult<IReadOnlyList<SupplierCreditNoteDto>>> GetCreditNotesByOrder(long id, CancellationToken ct)
        => Ok(await _service.GetCreditNotesByOrderAsync(id, ct));

    [HttpPatch("credit-notes/{creditNoteId:long}/status")]
    public async Task<ActionResult<SupplierCreditNoteDto>> UpdateCreditNoteStatus(
        long creditNoteId, [FromBody] UpdateCreditNoteStatusDto dto, CancellationToken ct)
        => Ok(await _service.UpdateCreditNoteStatusAsync(creditNoteId, dto, ct));
}
