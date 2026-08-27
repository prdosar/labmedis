using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations;

public partial class AddCurrencyToCustomerOrder : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Currency",
            table: "customer_orders",
            type: "character varying(10)",
            maxLength: 10,
            nullable: false,
            defaultValue: "XOF");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "Currency",
            table: "customer_orders");
    }
}
