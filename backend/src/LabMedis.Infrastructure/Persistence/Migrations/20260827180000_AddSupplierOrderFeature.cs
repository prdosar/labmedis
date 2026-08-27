using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierOrderFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── supplier_orders ───────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "supplier_orders",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Reference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: ""),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SupplierId = table.Column<long>(type: "bigint", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "EUR"),
                    Status = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    ProformaReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ProformaFilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ProformaReceivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supplier_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_supplier_orders_suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_supplier_orders_SupplierId",
                table: "supplier_orders",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_orders_Reference",
                table: "supplier_orders",
                column: "Reference",
                unique: true);

            // ── supplier_order_lines ──────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "supplier_order_lines",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupplierOrderId = table.Column<long>(type: "bigint", nullable: false),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    OrderUnit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Carton"),
                    UnitsPerCarton = table.Column<int>(type: "integer", nullable: true),
                    UnitFobPrice = table.Column<decimal>(type: "numeric(18,4)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supplier_order_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_supplier_order_lines_supplier_orders_SupplierOrderId",
                        column: x => x.SupplierOrderId,
                        principalTable: "supplier_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_supplier_order_lines_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_supplier_order_lines_SupplierOrderId",
                table: "supplier_order_lines",
                column: "SupplierOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_order_lines_ProductId",
                table: "supplier_order_lines",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "supplier_order_lines");
            migrationBuilder.DropTable(name: "supplier_orders");
        }
    }
}
