using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerOrderPreparation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "customer_order_lot_lines",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerOrderId = table.Column<long>(type: "bigint", nullable: false),
                    CustomerOrderLineId = table.Column<long>(type: "bigint", nullable: false),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    PurchaseLineId = table.Column<long>(type: "bigint", nullable: false),
                    WarehouseId = table.Column<long>(type: "bigint", nullable: false),
                    QuantityAllocated = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_order_lot_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_order_lot_lines_customer_order_lines_CustomerOrder~",
                        column: x => x.CustomerOrderLineId,
                        principalTable: "customer_order_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_order_lot_lines_customer_orders_CustomerOrderId",
                        column: x => x.CustomerOrderId,
                        principalTable: "customer_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_customer_order_lot_lines_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_order_lot_lines_purchase_lines_PurchaseLineId",
                        column: x => x.PurchaseLineId,
                        principalTable: "purchase_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_order_lot_lines_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lot_lines_CustomerOrderId",
                table: "customer_order_lot_lines",
                column: "CustomerOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lot_lines_CustomerOrderLineId",
                table: "customer_order_lot_lines",
                column: "CustomerOrderLineId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lot_lines_ProductId",
                table: "customer_order_lot_lines",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lot_lines_PurchaseLineId",
                table: "customer_order_lot_lines",
                column: "PurchaseLineId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lot_lines_WarehouseId",
                table: "customer_order_lot_lines",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "customer_order_lot_lines");
        }
    }
}
