using LabMedis.Application.Dtos.CustomerCreditNotes;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/customer-credit-notes")]
public class CustomerCreditNotesController : ControllerBase
{
    private readonly ICustomerCreditNoteService _service;

    public CustomerCreditNotesController(ICustomerCreditNoteService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<CustomerCreditNoteDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int size = 50,
        [FromQuery] string? status = null,
        [FromQuery] long? customerId = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, status, customerId, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<CustomerCreditNoteDto>> GetById(long id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("by-invoice/{invoiceId:long}")]
    public async Task<ActionResult<IReadOnlyList<CustomerCreditNoteDto>>> GetByInvoice(long invoiceId, CancellationToken ct)
        => Ok(await _service.GetByInvoiceAsync(invoiceId, ct));

    [HttpPost]
    public async Task<ActionResult<CustomerCreditNoteDto>> Create([FromBody] CreateCustomerCreditNoteDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:long}/status")]
    public async Task<ActionResult<CustomerCreditNoteDto>> UpdateStatus(
        long id, [FromBody] UpdateCustomerCreditNoteStatusDto dto, CancellationToken ct)
        => Ok(await _service.UpdateStatusAsync(id, dto, ct));

    [HttpPost("{id:long}/apply-to-invoice")]
    public async Task<ActionResult<CustomerCreditNoteDto>> ApplyToInvoice(long id, CancellationToken ct)
        => Ok(await _service.ApplyToInvoiceAsync(id, ct));
}
