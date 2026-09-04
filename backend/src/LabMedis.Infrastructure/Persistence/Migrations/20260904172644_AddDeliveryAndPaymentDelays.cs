using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryAndPaymentDelays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "DeliveryDelayId",
                table: "customer_orders",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "PaymentDelayId",
                table: "customer_orders",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "delivery_delays",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_delivery_delays", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "payment_delays",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_delays", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_DeliveryDelayId",
                table: "customer_orders",
                column: "DeliveryDelayId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_PaymentDelayId",
                table: "customer_orders",
                column: "PaymentDelayId");

            migrationBuilder.CreateIndex(
                name: "IX_delivery_delays_Label",
                table: "delivery_delays",
                column: "Label",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payment_delays_Label",
                table: "payment_delays",
                column: "Label",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_customer_orders_delivery_delays_DeliveryDelayId",
                table: "customer_orders",
                column: "DeliveryDelayId",
                principalTable: "delivery_delays",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_customer_orders_payment_delays_PaymentDelayId",
                table: "customer_orders",
                column: "PaymentDelayId",
                principalTable: "payment_delays",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_customer_orders_delivery_delays_DeliveryDelayId",
                table: "customer_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_customer_orders_payment_delays_PaymentDelayId",
                table: "customer_orders");

            migrationBuilder.DropTable(
                name: "delivery_delays");

            migrationBuilder.DropTable(
                name: "payment_delays");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_DeliveryDelayId",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_PaymentDelayId",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "DeliveryDelayId",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "PaymentDelayId",
                table: "customer_orders");
        }
    }
}
