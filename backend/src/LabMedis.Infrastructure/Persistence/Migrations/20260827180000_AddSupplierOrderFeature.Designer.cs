using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using LabMedis.Infrastructure.Persistence;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260827180000_AddSupplierOrderFeature")]
partial class AddSupplierOrderFeature
{
    protected override void BuildTargetModel(ModelBuilder modelBuilder) { }
}
