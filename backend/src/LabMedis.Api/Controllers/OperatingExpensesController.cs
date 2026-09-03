using LabMedis.Application.Dtos.OperatingExpenses;
using LabMedis.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabMedis.Api.Controllers;

[ApiController]
[Route("api/operating-expenses")]
[Authorize]
public class OperatingExpensesController : ControllerBase
{
    private readonly IOperatingExpenseService _service;

    public OperatingExpensesController(IOperatingExpenseService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] int? annee = null,
        [FromQuery] int? mois = null,
        CancellationToken ct = default)
        => Ok(await _service.GetAllAsync(page, size, annee, mois, ct));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] OperatingExpenseCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] OperatingExpenseCreateDto dto, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, dto, ct));

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var deleted = await _service.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("budgets")]
    public async Task<IActionResult> GetBudgets([FromQuery] int annee, [FromQuery] int mois, CancellationToken ct)
        => Ok(await _service.GetBudgetsAsync(annee, mois, ct));

    [HttpPut("budgets")]
    public async Task<IActionResult> UpsertBudget([FromBody] ExpenseBudgetUpsertDto dto, CancellationToken ct)
        => Ok(await _service.UpsertBudgetAsync(dto, ct));

    [HttpGet("budget-vs-actuel")]
    public async Task<IActionResult> GetBudgetVsActuel([FromQuery] int annee, [FromQuery] int mois, CancellationToken ct)
        => Ok(await _service.GetBudgetVsActuelAsync(annee, mois, ct));
}
