using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierReturnsAndDiverseExits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<long>(
                name: "SupplierOrderId",
                table: "supplier_credit_notes",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "PurchaseId",
                table: "supplier_credit_notes",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<long>(
                name: "SupplierReturnId",
                table: "supplier_credit_notes",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reason",
                table: "stock_movements",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "supplier_returns",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Reference = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    SupplierId = table.Column<long>(type: "bigint", nullable: false),
                    PurchaseId = table.Column<long>(type: "bigint", nullable: true),
                    ReturnDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ExchangeRateToXof = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    TotalAmountForeign = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    TotalAmountXof = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    SupplierCreditNoteId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supplier_returns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_supplier_returns_purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_returns_suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "supplier_return_lines",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupplierReturnId = table.Column<long>(type: "bigint", nullable: false),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    PurchaseLineId = table.Column<long>(type: "bigint", nullable: true),
                    WarehouseId = table.Column<long>(type: "bigint", nullable: false),
                    QuantityReturned = table.Column<int>(type: "integer", nullable: false),
                    LotNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UnitCostForeign = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    UnitCostXof = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    LineTotalForeign = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    LineTotalXof = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    StockMovementId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supplier_return_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_supplier_return_lines_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_return_lines_purchase_lines_PurchaseLineId",
                        column: x => x.PurchaseLineId,
                        principalTable: "purchase_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_return_lines_stock_movements_StockMovementId",
                        column: x => x.StockMovementId,
                        principalTable: "stock_movements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_supplier_return_lines_supplier_returns_SupplierReturnId",
                        column: x => x.SupplierReturnId,
                        principalTable: "supplier_returns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_supplier_return_lines_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_supplier_credit_notes_SupplierReturnId",
                table: "supplier_credit_notes",
                column: "SupplierReturnId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_supplier_return_lines_ProductId",
                table: "supplier_return_lines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_return_lines_PurchaseLineId",
                table: "supplier_return_lines",
                column: "PurchaseLineId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_return_lines_StockMovementId",
                table: "supplier_return_lines",
                column: "StockMovementId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_return_lines_SupplierReturnId",
                table: "supplier_return_lines",
                column: "SupplierReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_return_lines_WarehouseId",
                table: "supplier_return_lines",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_returns_PurchaseId",
                table: "supplier_returns",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_returns_Reference",
                table: "supplier_returns",
                column: "Reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_supplier_returns_SupplierId",
                table: "supplier_returns",
                column: "SupplierId");

            migrationBuilder.AddForeignKey(
                name: "FK_supplier_credit_notes_supplier_returns_SupplierReturnId",
                table: "supplier_credit_notes",
                column: "SupplierReturnId",
                principalTable: "supplier_returns",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_supplier_credit_notes_supplier_returns_SupplierReturnId",
                table: "supplier_credit_notes");

            migrationBuilder.DropTable(
                name: "supplier_return_lines");

            migrationBuilder.DropTable(
                name: "supplier_returns");

            migrationBuilder.DropIndex(
                name: "IX_supplier_credit_notes_SupplierReturnId",
                table: "supplier_credit_notes");

            migrationBuilder.DropColumn(
                name: "SupplierReturnId",
                table: "supplier_credit_notes");

            migrationBuilder.DropColumn(
                name: "Reason",
                table: "stock_movements");

            migrationBuilder.AlterColumn<long>(
                name: "SupplierOrderId",
                table: "supplier_credit_notes",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AlterColumn<long>(
                name: "PurchaseId",
                table: "supplier_credit_notes",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);
        }
    }
}
