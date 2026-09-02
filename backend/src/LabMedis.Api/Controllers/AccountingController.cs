using LabMedis.Application.Dtos.Accounting;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/accounting")]
public class AccountingController : ControllerBase
{
    private readonly IAccountingService _service;

    public AccountingController(IAccountingService service) => _service = service;

    // ── Chart of accounts ───────────────────────────────────────────────────

    [HttpGet("chart-of-accounts")]
    public async Task<ActionResult<IReadOnlyList<ChartAccountDto>>> GetChartOfAccounts(CancellationToken ct)
        => Ok(await _service.GetChartOfAccountsAsync(ct));

    [HttpPost("chart-of-accounts")]
    public async Task<ActionResult<ChartAccountDto>> CreateChartAccount(
        [FromBody] CreateChartAccountDto dto, CancellationToken ct)
    {
        var created = await _service.CreateChartAccountAsync(dto, ct);
        return CreatedAtAction(nameof(GetChartOfAccounts), new { }, created);
    }

    [HttpPut("chart-of-accounts/{id:long}")]
    public async Task<ActionResult<ChartAccountDto>> UpdateChartAccount(
        long id, [FromBody] UpdateChartAccountDto dto, CancellationToken ct)
        => Ok(await _service.UpdateChartAccountAsync(id, dto, ct));

    [HttpDelete("chart-of-accounts/{id:long}")]
    public async Task<IActionResult> DeleteChartAccount(long id, CancellationToken ct)
    {
        await _service.DeleteChartAccountAsync(id, ct);
        return NoContent();
    }

    // ── Journal ─────────────────────────────────────────────────────────────

    [HttpGet("journal")]
    public async Task<ActionResult<PagedResult<JournalEntryDto>>> GetJournal(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] string? journalCode = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
        => Ok(await _service.GetJournalAsync(page, size, journalCode, from, to, search, ct));

    [HttpGet("journal/{id:long}")]
    public async Task<ActionResult<JournalEntryDto>> GetJournalEntry(long id, CancellationToken ct)
    {
        var entry = await _service.GetJournalEntryByIdAsync(id, ct);
        return entry is null ? NotFound() : Ok(entry);
    }

    [HttpPost("journal")]
    public async Task<ActionResult<JournalEntryDto>> PostManualEntry(
        [FromBody] ManualJournalEntryInput input, CancellationToken ct)
    {
        var created = await _service.PostManualEntryAsync(input, ct);
        return CreatedAtAction(nameof(GetJournalEntry), new { id = created.Id }, created);
    }

    // ── Reports ─────────────────────────────────────────────────────────────

    [HttpGet("trial-balance")]
    public async Task<ActionResult<IReadOnlyList<TrialBalanceLineDto>>> GetTrialBalance(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken ct = default)
        => Ok(await _service.GetTrialBalanceAsync(from, to, ct));

    [HttpGet("pnl")]
    public async Task<ActionResult<PnLDto>> GetPnL(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken ct = default)
        => Ok(await _service.GetPnLAsync(from, to, ct));

    [HttpGet("customer-ledger/{customerId:long}")]
    public async Task<ActionResult<ThirdPartyLedgerDto>> GetCustomerLedger(
        long customerId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken ct = default)
    {
        var ledger = await _service.GetCustomerLedgerAsync(customerId, from, to, ct);
        return ledger is null ? NotFound() : Ok(ledger);
    }

    [HttpGet("supplier-ledger/{supplierId:long}")]
    public async Task<ActionResult<ThirdPartyLedgerDto>> GetSupplierLedger(
        long supplierId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken ct = default)
    {
        var ledger = await _service.GetSupplierLedgerAsync(supplierId, from, to, ct);
        return ledger is null ? NotFound() : Ok(ledger);
    }
}
