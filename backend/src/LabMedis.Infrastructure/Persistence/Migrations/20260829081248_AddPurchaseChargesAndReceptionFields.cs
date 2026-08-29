using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseChargesAndReceptionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CommissionCoefficient",
                table: "purchases");

            migrationBuilder.DropColumn(
                name: "DefaultMarginCoefficient",
                table: "purchases");

            migrationBuilder.DropColumn(
                name: "FreightCoefficient",
                table: "purchases");

            migrationBuilder.DropColumn(
                name: "TransferFeesCoefficient",
                table: "purchases");

            migrationBuilder.DropColumn(
                name: "TransitCoefficient",
                table: "purchases");

            migrationBuilder.AddColumn<long>(
                name: "SupplierOrderId",
                table: "purchases",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransportMode",
                table: "purchases",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "QuantityLostCartons",
                table: "purchase_lines",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "UnitsPerCarton",
                table: "purchase_lines",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "purchase_charges",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseId = table.Column<long>(type: "bigint", nullable: false),
                    ChargeType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    AmountXof = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ChargeDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DebitAccountCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreditAccountCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    JournalEntryId = table.Column<long>(type: "bigint", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_charges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_charges_journal_entries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "journal_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_charges_purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_purchases_SupplierOrderId",
                table: "purchases",
                column: "SupplierOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_charges_JournalEntryId",
                table: "purchase_charges",
                column: "JournalEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_charges_PurchaseId",
                table: "purchase_charges",
                column: "PurchaseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "purchase_charges");

            migrationBuilder.DropIndex(
                name: "IX_purchases_SupplierOrderId",
                table: "purchases");

            migrationBuilder.DropColumn(
                name: "SupplierOrderId",
                table: "purchases");

            migrationBuilder.DropColumn(
                name: "TransportMode",
                table: "purchases");

            migrationBuilder.DropColumn(
                name: "QuantityLostCartons",
                table: "purchase_lines");

            migrationBuilder.DropColumn(
                name: "UnitsPerCarton",
                table: "purchase_lines");

            migrationBuilder.AddColumn<decimal>(
                name: "CommissionCoefficient",
                table: "purchases",
                type: "numeric(10,6)",
                precision: 10,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultMarginCoefficient",
                table: "purchases",
                type: "numeric(10,6)",
                precision: 10,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "FreightCoefficient",
                table: "purchases",
                type: "numeric(10,6)",
                precision: 10,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TransferFeesCoefficient",
                table: "purchases",
                type: "numeric(10,6)",
                precision: 10,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TransitCoefficient",
                table: "purchases",
                type: "numeric(10,6)",
                precision: 10,
                scale: 6,
                nullable: false,
                defaultValue: 0m);
        }
    }
}
