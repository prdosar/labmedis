using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using LabMedis.Infrastructure.Persistence;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260827170000_AddCurrencyToCustomerOrder")]
partial class AddCurrencyToCustomerOrder
{
    protected override void BuildTargetModel(ModelBuilder modelBuilder) { }
}
