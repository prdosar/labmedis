using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCountryIdToSupplierAndCustomer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Country",
                table: "suppliers");

            migrationBuilder.AddColumn<long>(
                name: "CountryId",
                table: "suppliers",
                type: "bigint",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "customers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);

            migrationBuilder.AddColumn<long>(
                name: "CountryId",
                table: "customers",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_suppliers_CountryId",
                table: "suppliers",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_customers_CountryId",
                table: "customers",
                column: "CountryId");

            migrationBuilder.AddForeignKey(
                name: "FK_customers_countries_CountryId",
                table: "customers",
                column: "CountryId",
                principalTable: "countries",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_suppliers_countries_CountryId",
                table: "suppliers",
                column: "CountryId",
                principalTable: "countries",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_customers_countries_CountryId",
                table: "customers");

            migrationBuilder.DropForeignKey(
                name: "FK_suppliers_countries_CountryId",
                table: "suppliers");

            migrationBuilder.DropIndex(
                name: "IX_suppliers_CountryId",
                table: "suppliers");

            migrationBuilder.DropIndex(
                name: "IX_customers_CountryId",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "CountryId",
                table: "suppliers");

            migrationBuilder.DropColumn(
                name: "CountryId",
                table: "customers");

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "suppliers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "customers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldNullable: true);
        }
    }
}
