using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProformaDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── New columns on supplier_orders ────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "ContainerReference",
                table: "supplier_orders",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FreightAmount",
                table: "supplier_orders",
                type: "numeric(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentTerms",
                table: "supplier_orders",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Brand",
                table: "supplier_orders",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Origin",
                table: "supplier_orders",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "ExpectedShippingDate",
                table: "supplier_orders",
                type: "date",
                nullable: true);

            // ── supplier_order_documents ──────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "supplier_order_documents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupplierOrderId = table.Column<long>(type: "bigint", nullable: false),
                    DocumentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Proforma"),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false, defaultValue: ""),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false, defaultValue: ""),
                    FileSize = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supplier_order_documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_supplier_order_documents_supplier_orders_SupplierOrderId",
                        column: x => x.SupplierOrderId,
                        principalTable: "supplier_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_supplier_order_documents_SupplierOrderId",
                table: "supplier_order_documents",
                column: "SupplierOrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "supplier_order_documents");

            migrationBuilder.DropColumn(name: "ContainerReference", table: "supplier_orders");
            migrationBuilder.DropColumn(name: "FreightAmount", table: "supplier_orders");
            migrationBuilder.DropColumn(name: "PaymentTerms", table: "supplier_orders");
            migrationBuilder.DropColumn(name: "Brand", table: "supplier_orders");
            migrationBuilder.DropColumn(name: "Origin", table: "supplier_orders");
            migrationBuilder.DropColumn(name: "ExpectedShippingDate", table: "supplier_orders");
        }
    }
}
