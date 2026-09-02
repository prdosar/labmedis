using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierCreditNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "supplier_credit_notes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Reference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SupplierOrderId = table.Column<long>(type: "bigint", nullable: false),
                    SupplierInvoiceId = table.Column<long>(type: "bigint", nullable: true),
                    PurchaseId = table.Column<long>(type: "bigint", nullable: false),
                    SupplierId = table.Column<long>(type: "bigint", nullable: false),
                    CreditNoteDate = table.Column<DateOnly>(type: "date", nullable: false),
                    AmountForeign = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ExchangeRateToXof = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    AmountXof = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    LostBoxesCount = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supplier_credit_notes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_supplier_credit_notes_purchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "purchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_credit_notes_supplier_invoices_SupplierInvoiceId",
                        column: x => x.SupplierInvoiceId,
                        principalTable: "supplier_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_supplier_credit_notes_supplier_orders_SupplierOrderId",
                        column: x => x.SupplierOrderId,
                        principalTable: "supplier_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_supplier_credit_notes_suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_supplier_credit_notes_PurchaseId",
                table: "supplier_credit_notes",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_credit_notes_Reference",
                table: "supplier_credit_notes",
                column: "Reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_supplier_credit_notes_SupplierId",
                table: "supplier_credit_notes",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_credit_notes_SupplierInvoiceId",
                table: "supplier_credit_notes",
                column: "SupplierInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_supplier_credit_notes_SupplierOrderId",
                table: "supplier_credit_notes",
                column: "SupplierOrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "supplier_credit_notes");
        }
    }
}
