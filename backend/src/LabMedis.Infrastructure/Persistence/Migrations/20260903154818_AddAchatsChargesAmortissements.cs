using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAchatsChargesAmortissements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "expense_budgets",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Annee = table.Column<int>(type: "integer", nullable: false),
                    Mois = table.Column<int>(type: "integer", nullable: false),
                    Categorie = table.Column<int>(type: "integer", nullable: false),
                    MontantBudget = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expense_budgets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "fixed_assets",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Designation = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Categorie = table.Column<int>(type: "integer", nullable: false),
                    DateAcquisition = table.Column<DateOnly>(type: "date", nullable: false),
                    CoutAcquisition = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ValeurResiduelle = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DureeVieAns = table.Column<int>(type: "integer", nullable: false),
                    Methode = table.Column<int>(type: "integer", nullable: false),
                    TauxLineaire = table.Column<decimal>(type: "numeric(8,4)", nullable: false),
                    CoefficientDegressif = table.Column<decimal>(type: "numeric(4,2)", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fixed_assets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "general_purchases",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DateAchat = table.Column<DateOnly>(type: "date", nullable: false),
                    Reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FournisseurNom = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Designation = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Categorie = table.Column<int>(type: "integer", nullable: false),
                    MontantHT = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TauxTVA = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    MontantTTC = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ModePaiement = table.Column<int>(type: "integer", nullable: false),
                    EstPaye = table.Column<bool>(type: "boolean", nullable: false),
                    DatePaiement = table.Column<DateOnly>(type: "date", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_general_purchases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "operating_expenses",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Categorie = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Montant = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ModePaiement = table.Column<int>(type: "integer", nullable: false),
                    Reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operating_expenses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "depreciation_lines",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FixedAssetId = table.Column<long>(type: "bigint", nullable: false),
                    Annee = table.Column<int>(type: "integer", nullable: false),
                    BaseAmortissable = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DotationAnnuelle = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CumulAmortissements = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ValeurNette = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_depreciation_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_depreciation_lines_fixed_assets_FixedAssetId",
                        column: x => x.FixedAssetId,
                        principalTable: "fixed_assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_depreciation_lines_FixedAssetId_Annee",
                table: "depreciation_lines",
                columns: new[] { "FixedAssetId", "Annee" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_expense_budgets_Annee_Mois_Categorie",
                table: "expense_budgets",
                columns: new[] { "Annee", "Mois", "Categorie" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fixed_assets_Code",
                table: "fixed_assets",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_general_purchases_DateAchat",
                table: "general_purchases",
                column: "DateAchat");

            migrationBuilder.CreateIndex(
                name: "IX_general_purchases_EstPaye",
                table: "general_purchases",
                column: "EstPaye");

            migrationBuilder.CreateIndex(
                name: "IX_operating_expenses_Categorie_Date",
                table: "operating_expenses",
                columns: new[] { "Categorie", "Date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "depreciation_lines");

            migrationBuilder.DropTable(
                name: "expense_budgets");

            migrationBuilder.DropTable(
                name: "general_purchases");

            migrationBuilder.DropTable(
                name: "operating_expenses");

            migrationBuilder.DropTable(
                name: "fixed_assets");
        }
    }
}
