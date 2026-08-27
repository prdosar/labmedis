using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;

namespace LabMedis.Infrastructure.Persistence;

public static class AccountingSeeder
{
    public static async Task SeedAsync(AppDbContext ctx)
    {
        if (ctx.ChartAccounts.Any())
            return;

        var accounts = new List<ChartAccount>
        {
            // ── Class 1 – Capitaux ────────────────────────────────────────
            Account("101",  "Capital social",                             AccountClass.Equity,      NormalBalance.Credit, isSystem: true),
            Account("12",   "Report à nouveau",                           AccountClass.Equity,      NormalBalance.Credit, isSystem: true),
            Account("13",   "Résultat de l'exercice",                     AccountClass.Equity,      NormalBalance.Credit, isSystem: true),

            // ── Class 3 – Stocks ──────────────────────────────────────────
            Account("311",  "Marchandises",                               AccountClass.Asset,       NormalBalance.Debit,  isSystem: true),

            // ── Class 4 – Comptes de tiers ────────────────────────────────
            Account("401",  "Fournisseurs",                               AccountClass.ThirdParty,  NormalBalance.Credit, isSystem: true, isThirdParty: true),
            Account("4011", "Fournisseurs – Achats de biens",             AccountClass.ThirdParty,  NormalBalance.Credit, isThirdParty: true, parentCode: "401"),
            Account("4094", "Fournisseurs – Avances versées",             AccountClass.ThirdParty,  NormalBalance.Debit,  isThirdParty: true, parentCode: "401"),
            Account("408",  "Fournisseurs – Factures non parvenues",      AccountClass.ThirdParty,  NormalBalance.Credit, isThirdParty: true, parentCode: "401"),
            Account("411",  "Clients",                                    AccountClass.ThirdParty,  NormalBalance.Debit,  isSystem: true, isThirdParty: true),
            Account("4111", "Clients – Ventes de biens",                  AccountClass.ThirdParty,  NormalBalance.Debit,  isThirdParty: true, parentCode: "411"),
            Account("4194", "Clients – Avances reçues",                   AccountClass.ThirdParty,  NormalBalance.Credit, isThirdParty: true, parentCode: "411"),
            Account("418",  "Clients – Produits à recevoir",              AccountClass.ThirdParty,  NormalBalance.Debit,  isThirdParty: true, parentCode: "411"),
            Account("4431", "TVA collectée (due)",                        AccountClass.Liability,   NormalBalance.Credit, isSystem: true),
            Account("4452", "TVA récupérable sur achats",                 AccountClass.Asset,       NormalBalance.Debit,  isSystem: true),
            Account("4458", "TVA à régulariser",                          AccountClass.Liability,   NormalBalance.Credit),

            // ── Class 5 – Trésorerie ──────────────────────────────────────
            Account("521",  "Banques",                                    AccountClass.Asset,       NormalBalance.Debit,  isSystem: true),
            Account("5211", "Compte courant bancaire",                    AccountClass.Asset,       NormalBalance.Debit,  parentCode: "521"),
            Account("571",  "Caisse",                                     AccountClass.Asset,       NormalBalance.Debit,  isSystem: true),

            // ── Class 6 – Charges ─────────────────────────────────────────
            Account("601",  "Achats de marchandises",                     AccountClass.Expense,     NormalBalance.Debit,  isSystem: true),
            Account("6011", "Variation de stocks de marchandises",        AccountClass.Expense,     NormalBalance.Debit,  parentCode: "601"),
            Account("622",  "Transports sur achats",                      AccountClass.Expense,     NormalBalance.Debit),
            Account("6221", "Fret international",                         AccountClass.Expense,     NormalBalance.Debit,  parentCode: "622"),
            Account("6222", "Assurances transport",                       AccountClass.Expense,     NormalBalance.Debit,  parentCode: "622"),
            Account("6228", "Autres frais de transport",                  AccountClass.Expense,     NormalBalance.Debit,  parentCode: "622"),
            Account("627",  "Frais douaniers et accessoires",             AccountClass.Expense,     NormalBalance.Debit),
            Account("6271", "Droits de douane et taxes d'importation",    AccountClass.Expense,     NormalBalance.Debit,  parentCode: "627"),
            Account("6272", "Frais de transit",                           AccountClass.Expense,     NormalBalance.Debit,  parentCode: "627"),
            Account("6275", "Commissions et courtages sur achats",        AccountClass.Expense,     NormalBalance.Debit,  parentCode: "627"),
            Account("658",  "Charges diverses de gestion",               AccountClass.Expense,     NormalBalance.Debit),
            Account("6581", "Pertes sur stocks (péremption, casse)",      AccountClass.Expense,     NormalBalance.Debit,  parentCode: "658"),
            Account("665",  "Escomptes et intérêts accordés",             AccountClass.Expense,     NormalBalance.Debit),
            Account("673",  "Créances irrécouvrables",                   AccountClass.Expense,     NormalBalance.Debit),

            // ── Class 7 – Produits ────────────────────────────────────────
            Account("701",  "Ventes de marchandises",                     AccountClass.Income,      NormalBalance.Credit, isSystem: true),
            Account("7011", "Ventes de médicaments",                      AccountClass.Income,      NormalBalance.Credit, parentCode: "701"),
            Account("7094", "Rabais, remises, ristournes accordés",       AccountClass.Income,      NormalBalance.Debit,  parentCode: "701"),
            Account("7097", "Retours sur ventes de marchandises",         AccountClass.Income,      NormalBalance.Debit,  parentCode: "701"),
            Account("765",  "Escomptes obtenus",                          AccountClass.Income,      NormalBalance.Credit),
        };

        ctx.ChartAccounts.AddRange(accounts);
        await ctx.SaveChangesAsync();
    }

    private static ChartAccount Account(
        string code,
        string name,
        AccountClass accountClass,
        NormalBalance normalBalance,
        bool isSystem = false,
        bool isThirdParty = false,
        string? parentCode = null)
    {
        return new ChartAccount
        {
            Code = code,
            Name = name,
            AccountClass = accountClass,
            NormalBalance = normalBalance,
            IsSystem = isSystem,
            IsThirdParty = isThirdParty,
            ParentCode = parentCode
        };
    }
}
