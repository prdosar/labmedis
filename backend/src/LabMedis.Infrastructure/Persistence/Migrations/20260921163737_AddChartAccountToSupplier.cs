using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChartAccountToSupplier : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ChartAccountId",
                table: "suppliers",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_suppliers_ChartAccountId",
                table: "suppliers",
                column: "ChartAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_suppliers_chart_accounts_ChartAccountId",
                table: "suppliers",
                column: "ChartAccountId",
                principalTable: "chart_accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Peuplement pour les fournisseurs existants : sous-compte 4011<Code>
            // rattaché au parent 401, classe ThirdParty (6), NormalBalance Credit (2).
            // NOT EXISTS pour ne pas doublonner si un code identique existe déjà.
            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    s RECORD;
                    new_code TEXT;
                    new_id BIGINT;
                BEGIN
                    FOR s IN SELECT ""Id"", ""Code"", ""Name"" FROM suppliers WHERE ""ChartAccountId"" IS NULL LOOP
                        new_code := '4011' || s.""Code"";
                        SELECT ""Id"" INTO new_id FROM chart_accounts WHERE ""Code"" = new_code;
                        IF new_id IS NULL THEN
                            INSERT INTO chart_accounts
                                (""Code"", ""Name"", ""AccountClass"", ""NormalBalance"", ""IsThirdParty"", ""IsSystem"", ""ParentCode"", ""IsDeleted"", ""CreatedAt"")
                            VALUES
                                (new_code, 'Fournisseur – ' || s.""Name"", 6, 2, TRUE, FALSE, '401', FALSE, NOW())
                            RETURNING ""Id"" INTO new_id;
                        END IF;
                        UPDATE suppliers SET ""ChartAccountId"" = new_id WHERE ""Id"" = s.""Id"";
                    END LOOP;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_suppliers_chart_accounts_ChartAccountId",
                table: "suppliers");

            migrationBuilder.DropIndex(
                name: "IX_suppliers_ChartAccountId",
                table: "suppliers");

            migrationBuilder.DropColumn(
                name: "ChartAccountId",
                table: "suppliers");
        }
    }
}
