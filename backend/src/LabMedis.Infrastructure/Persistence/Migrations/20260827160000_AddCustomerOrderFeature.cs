using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerOrderFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Add ChartAccountId to customers ───────────────────────────
            migrationBuilder.AddColumn<long>(
                name: "ChartAccountId",
                table: "customers",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_customers_chart_accounts_ChartAccountId",
                table: "customers",
                column: "ChartAccountId",
                principalTable: "chart_accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.CreateIndex(
                name: "IX_customers_ChartAccountId",
                table: "customers",
                column: "ChartAccountId");

            // ── customer_orders ───────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "customer_orders",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Reference = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<long>(type: "bigint", nullable: false),
                    VatApplied = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    InvoiceId = table.Column<long>(type: "bigint", nullable: true),
                    TotalHt = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalTva = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalTtc = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Profit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_orders_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_orders_invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_CustomerId",
                table: "customer_orders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_InvoiceId",
                table: "customer_orders",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_Reference",
                table: "customer_orders",
                column: "Reference",
                unique: true);

            // ── customer_order_lines ──────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "customer_order_lines",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerOrderId = table.Column<long>(type: "bigint", nullable: false),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPriceHt = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    UnitCostPrice = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    LineTotalHt = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    LineTotalTva = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    LineTotalTtc = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    LineTotalCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_order_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_order_lines_customer_orders_CustomerOrderId",
                        column: x => x.CustomerOrderId,
                        principalTable: "customer_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_customer_order_lines_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lines_CustomerOrderId",
                table: "customer_order_lines",
                column: "CustomerOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lines_ProductId",
                table: "customer_order_lines",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "customer_order_lines");
            migrationBuilder.DropTable(name: "customer_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_customers_chart_accounts_ChartAccountId",
                table: "customers");
            migrationBuilder.DropIndex(
                name: "IX_customers_ChartAccountId",
                table: "customers");
            migrationBuilder.DropColumn(
                name: "ChartAccountId",
                table: "customers");
        }
    }
}
