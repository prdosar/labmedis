using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceDiscountAndAdvance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AdvanceAmountForeign",
                table: "supplier_invoices",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AdvanceAmountXof",
                table: "supplier_invoices",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmountForeign",
                table: "supplier_invoices",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmountXof",
                table: "supplier_invoices",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdvanceAmountForeign",
                table: "supplier_invoices");

            migrationBuilder.DropColumn(
                name: "AdvanceAmountXof",
                table: "supplier_invoices");

            migrationBuilder.DropColumn(
                name: "DiscountAmountForeign",
                table: "supplier_invoices");

            migrationBuilder.DropColumn(
                name: "DiscountAmountXof",
                table: "supplier_invoices");
        }
    }
}
