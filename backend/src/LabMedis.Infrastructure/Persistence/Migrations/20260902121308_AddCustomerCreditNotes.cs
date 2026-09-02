using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerCreditNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<long>(
                name: "PurchaseLineId",
                table: "stock_movements",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.CreateTable(
                name: "customer_credit_notes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Reference = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    CustomerId = table.Column<long>(type: "bigint", nullable: false),
                    InvoiceId = table.Column<long>(type: "bigint", nullable: true),
                    CreditNoteDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalAmountHt = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    TotalTva = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    TotalAmountTtc = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_credit_notes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_credit_notes_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_credit_notes_invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "customer_credit_note_lines",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerCreditNoteId = table.Column<long>(type: "bigint", nullable: false),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    WarehouseId = table.Column<long>(type: "bigint", nullable: false),
                    PurchaseLineId = table.Column<long>(type: "bigint", nullable: true),
                    QuantityReturned = table.Column<int>(type: "integer", nullable: false),
                    UnitPriceHt = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    TvaRate = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    LineTotalHt = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    LineTva = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    LineTotalTtc = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    LotNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StockMovementId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_credit_note_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_credit_note_lines_customer_credit_notes_CustomerCr~",
                        column: x => x.CustomerCreditNoteId,
                        principalTable: "customer_credit_notes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_customer_credit_note_lines_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_credit_note_lines_purchase_lines_PurchaseLineId",
                        column: x => x.PurchaseLineId,
                        principalTable: "purchase_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_credit_note_lines_stock_movements_StockMovementId",
                        column: x => x.StockMovementId,
                        principalTable: "stock_movements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_customer_credit_note_lines_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_credit_note_lines_CustomerCreditNoteId",
                table: "customer_credit_note_lines",
                column: "CustomerCreditNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_credit_note_lines_ProductId",
                table: "customer_credit_note_lines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_credit_note_lines_PurchaseLineId",
                table: "customer_credit_note_lines",
                column: "PurchaseLineId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_credit_note_lines_StockMovementId",
                table: "customer_credit_note_lines",
                column: "StockMovementId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_credit_note_lines_WarehouseId",
                table: "customer_credit_note_lines",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_credit_notes_CustomerId",
                table: "customer_credit_notes",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_credit_notes_InvoiceId",
                table: "customer_credit_notes",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_credit_notes_Reference",
                table: "customer_credit_notes",
                column: "Reference",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "customer_credit_note_lines");

            migrationBuilder.DropTable(
                name: "customer_credit_notes");

            migrationBuilder.AlterColumn<long>(
                name: "PurchaseLineId",
                table: "stock_movements",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);
        }
    }
}
