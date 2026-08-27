using LabMedis.Domain.Entities;
using LabMedis.Domain.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LabMedis.Infrastructure.Persistence.Seeding;

public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var userManager = services.GetRequiredService<UserManager<User>>();
        var roleManager = services.GetRequiredService<RoleManager<Role>>();

        await SeedWarehousesAsync(db, cancellationToken);
        await SeedCategoriesAsync(db, cancellationToken);
        await SeedTherapeuticClassesAsync(db, cancellationToken);
        await SeedProductFormsAsync(db, cancellationToken);
        await SeedDosagesAsync(db, cancellationToken);
        await SeedPackagingsAsync(db, cancellationToken);
        await SeedCountriesAsync(db, cancellationToken);
        await SeedTransportTypesAsync(db, cancellationToken);
        await SeedAccessesAsync(db, cancellationToken);
        await SeedRolesAsync(db, roleManager, cancellationToken);
        await SeedDefaultAdminAsync(userManager, cancellationToken);
        await SeedSuppliersAsync(db, cancellationToken);
        await SeedCustomersAsync(db, cancellationToken);
        await SeedProductsAsync(db, cancellationToken);
    }

    // -------------------------------------------------------------------------
    // Référentiel
    // -------------------------------------------------------------------------

    private static async Task SeedWarehousesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Warehouses.AnyAsync(ct))
            return;

        db.Warehouses.Add(new Warehouse
        {
            Code = "01",
            Name = "Magasin principal",
            City = "Lomé",
            Notes = "Magasin par défaut créé au démarrage."
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedCategoriesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Categories.AnyAsync(ct))
            return;

        foreach (var name in CategoryNames)
            db.Categories.Add(new Category { Name = name });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedTherapeuticClassesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.TherapeuticClasses.AnyAsync(ct))
            return;

        var categories = await db.Categories.ToDictionaryAsync(c => c.Name, c => c.Id, ct);

        foreach (var (categoryName, className) in TherapeuticClassSeeds)
        {
            if (!categories.TryGetValue(categoryName, out var categoryId))
                continue;
            db.TherapeuticClasses.Add(new TherapeuticClass
            {
                CategoryId = categoryId,
                Name = className
            });
        }
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedProductFormsAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.ProductForms.AnyAsync(ct))
            return;

        foreach (var name in ProductFormNames)
            db.ProductForms.Add(new ProductForm { Name = name });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedDosagesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Dosages.AnyAsync(ct))
            return;

        foreach (var name in DosageNames)
            db.Dosages.Add(new Dosage { Name = name });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedPackagingsAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Packagings.AnyAsync(ct))
            return;

        foreach (var name in PackagingNames)
            db.Packagings.Add(new Packaging { Name = name });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedCountriesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Countries.AnyAsync(ct))
            return;

        var sorted = CountrySeeds.OrderBy(n => n).ToArray();
        for (var i = 0; i < sorted.Length; i++)
            db.Countries.Add(new Country { Name = sorted[i], IsoCode = (i + 1).ToString("D2") });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedTransportTypesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.TransportTypes.AnyAsync(ct))
            return;

        foreach (var (code, name, description) in TransportTypeSeeds)
            db.TransportTypes.Add(new TransportType { Code = code, Name = name, Description = description });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedAccessesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Accesses.AnyAsync(ct))
            return;

        foreach (var (code, name, description) in AccessSeeds)
            db.Accesses.Add(new Access { Code = code, Name = name, Description = description });
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedRolesAsync(AppDbContext db, RoleManager<Role> roleManager, CancellationToken ct)
    {
        var accessesByCode = await db.Accesses.ToDictionaryAsync(a => a.Code, a => a.Id, ct);

        foreach (var (roleName, description, accessCodes) in RoleSeeds)
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role is null)
            {
                role = new Role
                {
                    Name = roleName,
                    NormalizedName = roleName.ToUpperInvariant(),
                    Description = description
                };
                var createResult = await roleManager.CreateAsync(role);
                if (!createResult.Succeeded)
                    continue;
            }

            var existingLinks = await db.RoleAccesses
                .Where(ra => ra.RoleId == role.Id)
                .Select(ra => ra.AccessId)
                .ToListAsync(ct);
            var existingSet = new HashSet<long>(existingLinks);

            var codesToLink = accessCodes ?? accessesByCode.Keys.ToArray();
            foreach (var code in codesToLink)
            {
                if (!accessesByCode.TryGetValue(code, out var accessId))
                    continue;
                if (existingSet.Contains(accessId))
                    continue;
                db.RoleAccesses.Add(new RoleAccess { RoleId = role.Id, AccessId = accessId });
            }
        }
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedDefaultAdminAsync(UserManager<User> userManager, CancellationToken ct)
    {
        const string defaultAdminEmail = "admin@labmedis-togo.com";
        const string defaultAdminPassword = "Admin@2026";

        var existing = await userManager.FindByEmailAsync(defaultAdminEmail);
        if (existing is not null)
            return;

        var admin = new User
        {
            UserName = defaultAdminEmail,
            Email = defaultAdminEmail,
            EmailConfirmed = true,
            FullName = "Administrateur",
            IsActive = true
        };

        var result = await userManager.CreateAsync(admin, defaultAdminPassword);
        if (!result.Succeeded)
            return;

        await userManager.AddToRoleAsync(admin, "Administrateur");
    }

    // -------------------------------------------------------------------------
    // Fournisseurs
    // -------------------------------------------------------------------------

    private static async Task SeedSuppliersAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Suppliers.AnyAsync(ct))
            return;

        var countries = await db.Countries.ToDictionaryAsync(c => c.Name, c => c.Id, ct);

        var suppliersSorted = SupplierSeeds.OrderBy(s => s.Name).ToArray();
        for (var i = 0; i < suppliersSorted.Length; i++)
        {
            var (name, address, postalBox, phone, countryName) = suppliersSorted[i];
            countries.TryGetValue(countryName, out var countryId);
            db.Suppliers.Add(new Supplier
            {
                Code = (i + 1).ToString("D2"),
                Name = name,
                Address = address,
                PostalBox = postalBox,
                Phone = phone,
                CountryId = countryId == 0 ? null : countryId
            });
        }
        await db.SaveChangesAsync(ct);
    }

    // -------------------------------------------------------------------------
    // Clients
    // -------------------------------------------------------------------------

    private static async Task SeedCustomersAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Customers.AnyAsync(ct))
            return;

        var countries = await db.Countries.ToDictionaryAsync(c => c.Name, c => c.Id, ct);
        countries.TryGetValue("Togo", out var togoId);

        var customerSeq = 0;
        foreach (var (name, address, postalBox, phone, city) in CustomerSeeds.OrderBy(s => s.Item1))
        {
            customerSeq++;
            db.Customers.Add(new Customer
            {
                Code = customerSeq.ToString("D2"),
                Name = name,
                Address = address,
                PostalBox = postalBox,
                Phone = phone,
                City = city,
                CountryId = togoId == 0 ? null : togoId
            });
        }
        await db.SaveChangesAsync(ct);
    }

    // -------------------------------------------------------------------------
    // Produits
    // -------------------------------------------------------------------------

    private static async Task SeedProductsAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Products.AnyAsync(ct))
            return;

        // Normalisation des noms fournisseurs (Excel → BD)
        var supplierAliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["CONTINENTAL COMMODITIES"] = "Continental Commodities",
            ["MAIA AFRICA SAS"]         = "Maïa Africa sas",
            ["DEO GRATIAS GROUP"]       = "DEO GRATIAS PHARMA",
            ["HORIBA"]                  = "HORIBA ABX SAS",
        };

        // Normalisation catégories (Excel → BD)
        var categoryAliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["complement alimentaire"] = "complément alimentaire",
        };

        var warehouse = await db.Warehouses.FirstAsync(ct);

        var categories = await db.Categories
            .ToDictionaryAsync(c => c.Name, c => c.Id, StringComparer.OrdinalIgnoreCase, ct);

        var therapeuticClasses = await db.TherapeuticClasses
            .ToDictionaryAsync(t => t.Name, t => t.Id, StringComparer.OrdinalIgnoreCase, ct);

        var dosages = await db.Dosages
            .ToDictionaryAsync(d => d.Name, d => d.Id, StringComparer.OrdinalIgnoreCase, ct);

        var packagings = await db.Packagings
            .ToDictionaryAsync(p => p.Name, p => p.Id, StringComparer.OrdinalIgnoreCase, ct);

        var supplierEntities = await db.Suppliers.ToListAsync(ct);
        var suppliers = supplierEntities.ToDictionary(s => s.Name, s => s, StringComparer.OrdinalIgnoreCase);
        var supplierCodesById = supplierEntities.ToDictionary(s => s.Id, s => s.Code);

        // Track sequential suffix per prefix to ensure uniqueness
        var prefixCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        // Première TherapeuticClass par catégorie (fallback quand non renseignée)
        var firstClassByCategory = await db.TherapeuticClasses
            .GroupBy(t => t.Category!.Name)
            .Select(g => new { Category = g.Key, ClassId = g.Min(t => t.Id) })
            .ToDictionaryAsync(x => x.Category, x => x.ClassId, StringComparer.OrdinalIgnoreCase, ct);

        long currentSupplierId = 0;
        long currentTherapeuticClassId = 0;

        for (var i = 0; i < ProductSeeds.Length; i++)
        {
            var (designation, rawCategory, rawDosage, rawPackaging, rawClass, rawSupplier) = ProductSeeds[i];

            // Résolution catégorie
            var categoryKey = rawCategory ?? string.Empty;
            if (categoryAliases.TryGetValue(categoryKey, out var normalizedCategory))
                categoryKey = normalizedCategory;
            if (!categories.TryGetValue(categoryKey, out var categoryId))
                continue;

            // Résolution fournisseur (carry-forward)
            if (rawSupplier is not null)
            {
                var supplierKey = supplierAliases.TryGetValue(rawSupplier, out var aliased) ? aliased : rawSupplier;
                if (suppliers.TryGetValue(supplierKey, out var sup))
                    currentSupplierId = sup.Id;
            }
            if (currentSupplierId == 0)
                continue;

            // Résolution classe thérapeutique (carry-forward)
            if (rawClass is not null && therapeuticClasses.TryGetValue(rawClass, out var tcId))
                currentTherapeuticClassId = tcId;
            if (currentTherapeuticClassId == 0)
            {
                if (firstClassByCategory.TryGetValue(categoryKey, out var fallbackTcId))
                    currentTherapeuticClassId = fallbackTcId;
                else
                    continue;
            }

            // Dosage et conditionnement (optionnels)
            long? dosageId = null;
            if (rawDosage is not null && dosages.TryGetValue(rawDosage, out var did))
                dosageId = did;

            long? packagingId = null;
            if (rawPackaging is not null && packagings.TryGetValue(rawPackaging, out var pid))
                packagingId = pid;

            // Generate composite code: countryCodesupplierCodewarehouseCodeseq
            var supplierCode = supplierCodesById.GetValueOrDefault(currentSupplierId, "00");
            var productPrefix = $"00{supplierCode}{warehouse.Code}";
            prefixCounts[productPrefix] = prefixCounts.GetValueOrDefault(productPrefix) + 1;
            var productCode = $"{productPrefix}{prefixCounts[productPrefix]:D3}";

            db.Products.Add(new Product
            {
                Code = productCode,
                Designation = designation,
                WarehouseId = warehouse.Id,
                CategoryId = categoryId,
                TherapeuticClassId = currentTherapeuticClassId,
                SupplierId = currentSupplierId,
                DosageId = dosageId,
                PackagingId = packagingId,
            });
        }

        await db.SaveChangesAsync(ct);
    }

    // =========================================================================
    // Données statiques
    // =========================================================================

    private static readonly string[] CategoryNames =
    {
        "produit infantile",
        "cosmétique",
        "insecticide",
        "médicament",
        "complément alimentaire",
        "réactifs de laboratoire"
    };

    private static readonly (string Category, string Class)[] TherapeuticClassSeeds =
    {
        ("produit infantile",       "Lait infantile"),
        ("cosmétique",              "anti-moustiques"),
        ("insecticide",             "insecticides"),
        ("médicament",              "antalgiques"),
        ("médicament",              "antalgiques oraux"),
        ("médicament",              "antalgiques injectables"),
        ("médicament",              "antibiotiques"),
        ("médicament",              "anti-fongiques"),
        ("médicament",              "anti-histaminique"),
        ("médicament",              "antiparasitaires"),
        ("médicament",              "antispasmodiques"),
        ("médicament",              "antigrippaux"),
        ("médicament",              "antitussif"),
        ("médicament",              "antihypertenseurs"),
        ("médicament",              "corticoides locaux"),
        ("médicament",              "corticoides oraux"),
        ("médicament",              "imidazolés"),
        ("médicament",              "inhibiteurs de pompe à protons"),
        ("médicament",              "laxatifs"),
        ("complément alimentaire",  "protéines alimentaires"),
        ("réactifs de laboratoire", "réactifs de laboratoire")
    };

    private static readonly string[] ProductFormNames =
    {
        "comprimé",
        "gélule",
        "sirop",
        "suspension buvable",
        "poudre",
        "sachet",
        "ampoule",
        "flacon",
        "suppositoire",
        "pommade",
        "crème",
        "solution",
        "injectable"
    };

    private static readonly string[] DosageNames =
    {
        "boite/400g", "boite/900g", "boite/250g", "boite/200g",
        "boite/100ml", "boite/250ml", "boite/100 plaquettes",
        "boite/30", "boite/20", "boite/14", "boite/12",
        "flacon/30g", "flacon/100ml", "flacon/125ml", "flacon/150ml",
        "tube/40g", "tube/10g", "gel/30g"
    };

    private static readonly string[] PackagingNames =
    {
        "carton/6", "carton/12", "carton/20", "carton/25", "carton/30",
        "carton/36", "carton/48", "carton/50", "carton/54",
        "carton/72", "carton/84", "carton/100", "carton/200"
    };

    private static readonly string[] CountrySeeds =
    {
        "Togo", "France", "Maroc", "Tunisie", "Inde", "Suisse", "Burkina Faso"
    };

    private static readonly (string Code, string Name, string Description)[] TransportTypeSeeds =
    {
        ("AER", "Aérien",   "Transport par voie aérienne"),
        ("MAR", "Maritime", "Transport par voie maritime")
    };

    private static readonly (string Code, string Name, string Description)[] AccessSeeds =
    {
        ("users.manage",      "Gestion des utilisateurs",    "Créer, modifier, désactiver les utilisateurs"),
        ("roles.manage",      "Gestion des rôles",           "Créer et modifier les rôles"),
        ("accesses.manage",   "Gestion des accès",           "Attribuer les accès aux rôles"),
        ("warehouses.manage", "Gestion des magasins",        "CRUD magasins et rangements"),
        ("catalog.manage",    "Gestion du catalogue",        "CRUD produits, catégories, classes thérapeutiques, formes, dosages, conditionnements"),
        ("catalog.view",      "Consultation catalogue",      "Lecture du catalogue produits"),
        ("suppliers.manage",  "Gestion des fournisseurs",    "CRUD fournisseurs"),
        ("customers.manage",  "Gestion des clients",         "CRUD clients"),
        ("purchases.manage",  "Gestion des arrivages",       "Créer et modifier les arrivages fournisseurs"),
        ("stock.view",        "Consultation du stock",       "Voir les niveaux de stock par lot"),
        ("stock.adjust",      "Ajustement de stock",         "Enregistrer ajustements, pertes, retours"),
        ("invoices.manage",   "Gestion des factures",        "Créer, éditer, émettre, annuler factures"),
        ("invoices.view",     "Consultation des factures",   "Lecture des factures"),
        ("payments.register", "Encaissement des règlements", "Enregistrer les règlements clients"),
        ("deliveries.manage", "Gestion des livraisons",      "Créer BL, expédier, marquer livré"),
        ("reports.view",      "Consultation des rapports",   "Accès aux rapports d'activité")
    };

    private static readonly (string Role, string Description, string[]? AccessCodes)[] RoleSeeds =
    {
        ("Administrateur",  "Accès total",                                   null),
        ("Gestionnaire",    "Gestion opérationnelle sans administration",    new[]
        {
            "warehouses.manage", "catalog.manage", "catalog.view",
            "suppliers.manage", "customers.manage", "purchases.manage",
            "stock.view", "stock.adjust", "invoices.manage", "invoices.view",
            "payments.register", "deliveries.manage", "reports.view"
        }),
        ("Opérateur stock", "Réception, préparation, mouvements de stock",   new[]
        {
            "catalog.view", "stock.view", "stock.adjust",
            "purchases.manage", "deliveries.manage"
        }),
        ("Comptable",       "Facturation et règlements",                     new[]
        {
            "catalog.view", "customers.manage", "invoices.manage",
            "invoices.view", "payments.register", "reports.view"
        }),
        ("Consultation",    "Lecture seule",                                 new[]
        {
            "catalog.view", "stock.view", "invoices.view", "reports.view"
        })
    };

    // (Nom, Adresse, Boîte postale, Téléphone, Pays)
    private static readonly (string Name, string? Address, string? PostalBox, string? Phone, string Country)[] SupplierSeeds =
    {
        ("HORIBA ABX SAS",        "398 Rue du Caducée, 34790 Grabels",       null,    "+33 4 67 14 15 16", "France"),
        ("DEO GRATIAS PHARMA",    "Totsi",                                   "81053", "98 51 74 85",       "Togo"),
        ("IBERMA",                "237, Bd ZERKTOUNI CASABLANCA",            null,    "+212522964633",     "Maroc"),
        ("GALPHARMA",             "Route Mahdia Km 10.5 Sfax",               null,    "+216 74 831 841",   "Tunisie"),
        ("Continental Commodities","174 Bd Haussmann",                       null,    "+33 1 40 13 71 17", "France"),
        ("B&B LIFE SCIENCE",      "Shilp Corporate Park, Block B",           null,    "+918000147200",     "Inde"),
        ("BIORESEARCH",           "Avenue de la Gare 8, 1870 Monthey",       null,    null,                "Suisse"),
        ("Maïa Africa sas",       "Rue Naba Kiba",                           null,    "+22657445454",      "Burkina Faso"),
    };

    // (Nom, Adresse, Boîte postale, Téléphone, Ville)
    private static readonly (string Name, string? Address, string? PostalBox, string? Phone, string? City)[] CustomerSeeds =
    {
        ("POUPONNIERE TOKOIN/BONJOUR BEBE", "Totsi",                          "8051",       "97426108 / 91791677",         "Lomé"),
        ("CAMEG",                           "202, bd des armées",             "08 BP 8349", "22 22 26 94",                 "Lomé"),
        ("DOGTA LAFIE",                     "Agoè-Nyivé nationale N°1",       "319",        "22 53 50 50",                 "Lomé"),
        ("LABOREX TOGO",                    "Rue des hydrocarbures",           "1653",       "22 20 25 10",                 "Lomé"),
        ("Clinique Mère et enfant l'étoile","Rue 142 Aflao Gakl",             null,         "22 37 82 82 / 90 09 29 46",   "Lomé"),
        ("OCDI",                            "Adidogomé derrière ESGIS",       "10 BP 10346","91 34 86 57",                 "Lomé"),
        ("TEDIS PHARMA TOGO",               "45, rue HDN",                    "1000",       "22 53 76 00",                 "Lomé"),
        ("UBIPHARM TOGO",                   "Zone portuaire",                  "9127",       "22 27 02 55",                 "Lomé"),
        ("CHP ANEHO",                       "Aného",                          null,         "23 31 00 17",                 "Aného"),
        ("CHR SOKODE",                      "Route de bassar",                "187",        "25 50 01 78",                 "Sokodé"),
        ("Clinique les p'tits anges",       "Dzidzolé",                       null,         "92 12 45 00",                 "Lomé"),
        ("Groupe Levant Sarl",              "Bd du 13 janvier",               null,         "22 20 63 60 / 70 07 07 07",   "Lomé"),
    };

    // (Désignation, Catégorie, Dosage, Conditionnement, Classe thérapeutique, Fournisseur)
    // Fournisseur et Classe thérapeutique : carry-forward quand null
    private static readonly (string Designation, string? Category, string? Dosage, string? Packaging, string? TherapeuticClass, string? Supplier)[] ProductSeeds =
    {
        ("France Lait 1ér âge 400g",                                    "produit infantile",       "boite/400g",          "carton/12",  "Lait infantile",               "CONTINENTAL COMMODITIES"),  // 1
        ("France Lait 1ér âge 900g",                                    "produit infantile",       "boite/900g",          "carton/6",   null,                           null),  // 2
        ("France Lait 2ème âge 400g",                                   "produit infantile",       "boite/400g",          "carton/12",  null,                           null),  // 3
        ("France Lait 2ème âge 900g",                                   "produit infantile",       "boite/900g",          "carton/6",   null,                           null),  // 4
        ("Fance Lait 3ème âge 400g",                                    "produit infantile",       "boite/400g",          "carton/12",  null,                           null),  // 5
        ("France Lait 3ème âge 900g",                                   "produit infantile",       "boite/900g",          "carton/6",   null,                           null),  // 6
        ("France lait AR 400g",                                         "produit infantile",       "boite/400g",          "carton/12",  null,                           null),  // 7
        ("France lait LF 400g",                                         "produit infantile",       "boite/400g",          "carton/12",  null,                           null),  // 8
        ("Pré France lait 400g",                                        "produit infantile",       "boite/400g",          "carton/12",  null,                           null),  // 9
        ("France lait confort 1er age 400g",                            "produit infantile",       "boite/400g",          "carton/12",  null,                           null),  // 10
        ("France lait confort 2è age 400g",                             "produit infantile",       "boite/400g",          "carton/12",  null,                           null),  // 11
        ("France lait Céréales blé-biscuité 250g",                      "produit infantile",       "boite/250g",          "carton/12",  null,                           null),  // 12
        ("France lait Céréales blé-miel 250g",                          "produit infantile",       "boite/250g",          "carton/12",  null,                           null),  // 13
        ("France lait Céréales blé-fruits 250g",                        "produit infantile",       "boite/250g",          "carton/12",  null,                           null),  // 14
        ("France lait Céréales riz-fuits 250g",                         "produit infantile",       "boite/250g",          "carton/12",  null,                           null),  // 15
        ("France lait Céréales riz-miel 250g",                          "produit infantile",       "boite/250g",          "carton/12",  null,                           null),  // 16
        ("France lait Céréales diastases 250g",                         "produit infantile",       "boite/250g",          "carton/12",  null,                           null),  // 17
        ("Pommade Maïa 100 ml",                                         "cosmétique",              "boite/100ml",         "carton/72",  "anti-moustiques",              "MAIA AFRICA SAS"),  // 18
        ("Pommade Maïa 250 ml",                                         "cosmétique",              "boite/250ml",         "carton/48",  null,                           null),  // 19
        ("Strick Out GEL POUR CAFARD T/30G",                            "insecticide",             "gel/30g",             "carton/200", "insecticides",                 "DEO GRATIAS GROUP"),  // 20
        ("Mycoderme poudre f/30g",                                      "médicament",              "flacon/30g",          null,         "anti-fongiques",               "IBERMA"),  // 21
        ("Mycoderme crème t/40g",                                       "médicament",              "tube/40g",            null,         null,                           null),  // 22
        ("Effermol inj perf f/100ml",                                   "médicament",              "flacon/100ml",        "carton/50",  "antalgiques injectables",      null),  // 23
        ("ABZOLE 400 MG CP B/100",                                      "médicament",              "boite/100 plaquettes","carton/36",  "antiparasitaires",             null),  // 24
        ("ALLERGICA 10MG CPR B/30",                                     "médicament",              "boite/30",            "carton/54",  "anti-histaminique",            "GALPHARMA"),  // 25
        ("ALLERGICA SP F/150ML",                                        "médicament",              "flacon/150ml",        "carton/36",  null,                           null),  // 26
        ("LEVOSTAMINE 5mg CP B/30",                                     "médicament",              "boite/30",            "carton/72",  null,                           null),  // 27
        ("CETRADOL GEL 325/37,5mg B/20",                                "médicament",              "boite/20",            "carton/84",  "antalgiques oraux",            null),  // 28
        ("DEBRICOL CPR 100mg B/30",                                     "médicament",              "boite/30",            "carton/72",  "antispasmodiques",             null),  // 29
        ("GRIPEX Adulte sans sucre sachet 500mg/25mg/200mg B/12",       "médicament",              "boite/12",            "carton/48",  "antigrippaux",                 null),  // 30
        ("GRIPEX Enfant sans sucre sachet 280mg+10mg+100mg B/12",       "médicament",              "boite/12",            "carton/48",  null,                           null),  // 31
        ("OFLODIS CP 200mg B/20",                                       "médicament",              "boite/20",            "carton/25",  "antibiotiques",                null),  // 32
        ("ROMPALGINE CP 400mg/50mg/20mg B/20",                          "médicament",              "boite/20",            "carton/84",  "antalgiques",                  null),  // 33
        ("RUDGAL Gel 40mg B/30",                                        "médicament",              "boite/30",            "carton/48",  "inhibiteurs de pompe à protons",null),  // 34
        ("TAMIZOL 500MG CP B/14",                                       "médicament",              "boite/14",            "carton/84",  "imidazolés",                   null),  // 35
        ("PECTOLYSE ADULTE SANS SUCRE 0,3% SIROP F/125ML",              "médicament",              "flacon/125ml",        "carton/48",  "antitussif",                   null),  // 36
        ("PECTOLYSE ENFANT 0,1% SIROP F/125ML",                         "médicament",              "flacon/125ml",        "carton/48",  null,                           null),  // 37
        ("DERMOCORT 0,05% CREME T/10G",                                 "médicament",              "tube/10g",            "carton/100", "corticoides locaux",           null),  // 38
        ("B-PROTEI ALL 200g",                                           "complement alimentaire",  "boite/200g",          "carton/50",  "protéines alimentaires",       "B&B LIFE SCIENCE"),  // 39
        ("B-PROTEI MOM 200g",                                           "complement alimentaire",  "boite/200g",          "carton/50",  null,                           null),  // 40
        ("TRANSITON ADULTE 10G SACHET B/14",                            "médicament",              "boite/14",            "carton/30",  "laxatifs",                     "GALPHARMA"),  // 41
        ("TRANSITON ENFANT 4G SACHET B/20",                             "médicament",              "boite/20",            "carton/30",  null,                           null),  // 42
        ("LODEPINE 5MG GELULE B/30",                                    "médicament",              "boite/30",            "carton/20",  "antihypertenseurs",            null),  // 43
        ("COPRED ODT 20MG CP ORODISPERSIBLE B/20",                      "médicament",              "boite/20",            "carton/72",  "corticoides oraux",            null),  // 44
        ("100 µL TEFLON SEAL",                                          "réactifs de laboratoire", null,                  null,         "réactifs de laboratoire",      "HORIBA"),  // 45
        ("1000 µL TEFLON SEAL",                                         "réactifs de laboratoire", null,                  null,         null,                           null),  // 46
        ("ABX BASOLYSE II 1L",                                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 47
        ("ABX CHOLESTEROL DIRECT",                                      "réactifs de laboratoire", null,                  null,         null,                           null),  // 48
        ("ABX CLEANER 1L",                                              "réactifs de laboratoire", null,                  null,         null,                           null),  // 49
        ("ABX CRP CONTROL LOW",                                         "réactifs de laboratoire", null,                  null,         null,                           null),  // 50
        ("ABX DIFFTROL 2N",                                             "réactifs de laboratoire", null,                  null,         null,                           null),  // 51
        ("ABX DIFFTROL H",                                              "réactifs de laboratoire", null,                  null,         null,                           null),  // 52
        ("ABX DIFFTROL L",                                              "réactifs de laboratoire", null,                  null,         null,                           null),  // 53
        ("ABX DIFFTROL N",                                              "réactifs de laboratoire", null,                  null,         null,                           null),  // 54
        ("ABX DILUENT 20L",                                             "réactifs de laboratoire", null,                  null,         null,                           null),  // 55
        ("ABX EOSINOFIX 1L",                                            "réactifs de laboratoire", null,                  null,         null,                           null),  // 56
        ("ABX FLUOCYTE 0,5L",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 57
        ("ABX LYSEBIO 0,4 L",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 58
        ("ABX MINICLEAN 1L",                                            "réactifs de laboratoire", null,                  null,         null,                           null),  // 59
        ("ABX MINIDIL 10L",                                             "réactifs de laboratoire", null,                  null,         null,                           null),  // 60
        ("ABX MINILYSE LMG 1L",                                         "réactifs de laboratoire", null,                  null,         null,                           null),  // 61
        ("ABX MINOCLAIR 0,5L",                                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 62
        ("ABX MINOTROL 16 ( 2N)",                                       "réactifs de laboratoire", null,                  null,         null,                           null),  // 63
        ("ABX MINOTROL RETIC1",                                         "réactifs de laboratoire", null,                  null,         null,                           null),  // 64
        ("ABX MINOTROL RETIC2",                                         "réactifs de laboratoire", null,                  null,         null,                           null),  // 65
        ("ABX MINOTROL RETIC3",                                         "réactifs de laboratoire", null,                  null,         null,                           null),  // 66
        ("ABX PENTRA ALBUMIN CP",                                       "réactifs de laboratoire", null,                  null,         null,                           null),  // 67
        ("ABX PENTRA ALP CP",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 68
        ("ABX PENTRA ALT CP",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 69
        ("ABX PENTRA AMYLASE CP",                                       "réactifs de laboratoire", null,                  null,         null,                           null),  // 70
        ("ABX PENTRA AMYLASE CP",                                       "réactifs de laboratoire", null,                  null,         null,                           null),  // 71
        ("ABX PENTRA AST CP",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 72
        ("ABX PENTRA BILIRUBIN DIRECT CP",                              "réactifs de laboratoire", null,                  null,         null,                           null),  // 73
        ("ABX PENTRA BILIRUBIN TOTAL CP",                               "réactifs de laboratoire", null,                  null,         null,                           null),  // 74
        ("ABX PENTRA CALCIUM AS CP",                                    "réactifs de laboratoire", null,                  null,         null,                           null),  // 75
        ("ABX PENTRA CHLORIDE",                                         "réactifs de laboratoire", null,                  null,         null,                           null),  // 76
        ("ABX PENTRA CHOLESTEROL CP",                                   "réactifs de laboratoire", null,                  null,         null,                           null),  // 77
        ("ABX PENTRA CK 2 CONTROL",                                     "réactifs de laboratoire", null,                  null,         null,                           null),  // 78
        ("ABX PENTRA CK 2 CONTROL",                                     "réactifs de laboratoire", null,                  null,         null,                           null),  // 79
        ("ABX PENTRA CK MB RTU",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 80
        ("ABX PENTRA CK MB RTU",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 81
        ("ABX PENTRA CK NAC CP",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 82
        ("ABX PENTRA CLEAN-CHEM CP",                                    "réactifs de laboratoire", null,                  null,         null,                           null),  // 83
        ("ABX PENTRA CRP CAL",                                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 84
        ("ABX PENTRA CRP CP",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 85
        ("ABX PENTRA DEPROTEINIZER CP",                                 "réactifs de laboratoire", null,                  null,         null,                           null),  // 86
        ("ABX PENTRA ENZYMATIC CREATININE CP",                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 87
        ("ABX PENTRA ENZYMATIC CREATININE CP",                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 88
        ("ABX PENTRA ETCHING CP",                                       "réactifs de laboratoire", null,                  null,         null,                           null),  // 89
        ("ABX PENTRA GGT CP",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 90
        ("ABX PENTRA GLUCOSE HK CP",                                    "réactifs de laboratoire", null,                  null,         null,                           null),  // 91
        ("ABX PENTRA GLUCOSE PAP CP",                                   "réactifs de laboratoire", null,                  null,         null,                           null),  // 92
        ("ABX PENTRA HDL CAL",                                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 93
        ("ABX PENTRA HDL DIRECT CP",                                    "réactifs de laboratoire", null,                  null,         null,                           null),  // 94
        ("ABX PENTRA IRON CP",                                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 95
        ("ABX PENTRA LDH CP",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 96
        ("ABX PENTRA LDL CAL",                                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 97
        ("ABX PENTRA MAGNESIUM RTU",                                    "réactifs de laboratoire", null,                  null,         null,                           null),  // 98
        ("ABX PENTRA MAGNESIUM RTU",                                    "réactifs de laboratoire", null,                  null,         null,                           null),  // 99
        ("ABX PENTRA MULTICAL",                                         "réactifs de laboratoire", null,                  null,         null,                           null),  // 100
        ("ABX PENTRA N CONTROL",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 101
        ("ABX PENTRA N MULTICONTROL",                                   "réactifs de laboratoire", null,                  null,         null,                           null),  // 102
        ("ABX PENTRA P CONTROL",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 103
        ("ABX PENTRA PHOSPHORUS CP",                                    "réactifs de laboratoire", null,                  null,         null,                           null),  // 104
        ("ABX PENTRA POTASSIUM",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 105
        ("ABX PENTRA PRECITEST SOLUTION",                               "réactifs de laboratoire", null,                  null,         null,                           null),  // 106
        ("ABX PENTRA REFERENCE",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 107
        ("ABX PENTRA REFERENCE",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 108
        ("ABX PENTRA SODIUM-E",                                         "réactifs de laboratoire", null,                  null,         null,                           null),  // 109
        ("ABX PENTRA STANDARD 1",                                       "réactifs de laboratoire", null,                  null,         null,                           null),  // 110
        ("ABX PENTRA STANDARD 2",                                       "réactifs de laboratoire", null,                  null,         null,                           null),  // 111
        ("ABX PENTRA STANDARD HS Cal",                                  "réactifs de laboratoire", null,                  null,         null,                           null),  // 112
        ("ABX PENTRA TOTAL PROTEINE CP",                                "réactifs de laboratoire", null,                  null,         null,                           null),  // 113
        ("ABX PENTRA TPU CAL",                                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 114
        ("ABX PENTRA TRIGLYCERIDES CP",                                 "réactifs de laboratoire", null,                  null,         null,                           null),  // 115
        ("ABX PENTRA TRIGLYCERIDES CP",                                 "réactifs de laboratoire", null,                  null,         null,                           null),  // 116
        ("ABX PENTRA UREA CP",                                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 117
        ("ABX PENTRA UREA CP",                                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 118
        ("ABX PENTRA URIC ACID CP",                                     "réactifs de laboratoire", null,                  null,         null,                           null),  // 119
        ("ABX PENTRA URIC ACID CP",                                     "réactifs de laboratoire", null,                  null,         null,                           null),  // 120
        ("ABX PENTRA URINARY PROTEINS CP",                              "réactifs de laboratoire", null,                  null,         null,                           null),  // 121
        ("ABX PENTRA URINE CONTROL L/H",                                "réactifs de laboratoire", null,                  null,         null,                           null),  // 122
        ("CHILLER GLYCOL 1L",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 123
        ("CUVETTE SEGM, RACK P400 (P450)",                              "réactifs de laboratoire", null,                  null,         null,                           null),  // 124
        ("KIT.MAINTENANCE MICROS",                                      "réactifs de laboratoire", null,                  null,         null,                           null),  // 125
        ("MEBFIL 100MG/5ML SUSP BUV FL/30ML",                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 126
        ("NEEDLE , REAGENT WITH PIPE GUIDING",                          "réactifs de laboratoire", null,                  null,         null,                           null),  // 127
        ("NEEDLE , SAMPLE P400 W FERRITE",                              "réactifs de laboratoire", null,                  null,         null,                           null),  // 128
        ("OMNIPAQUE 350 MGI/ML",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 129
        ("OPTICAL HALOGEN P400",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 130
        ("OPTICAL LAMP P400",                                           "réactifs de laboratoire", null,                  null,         null,                           null),  // 131
        ("REAGENT SYRINGE (1000 µL)",                                   "réactifs de laboratoire", null,                  null,         null,                           null),  // 132
        ("REDIN PLUS CAPS B/30",                                        "réactifs de laboratoire", null,                  null,         null,                           null),  // 133
        ("SAMPLE CUP-BLUE",                                             "réactifs de laboratoire", null,                  null,         null,                           null),  // 134
        ("SAMPLE SYRIGE (100 #L)",                                      "réactifs de laboratoire", null,                  null,         null,                           null),  // 135
        ("TOOL, LATEX FLUO",                                            "réactifs de laboratoire", null,                  null,         null,                           null),  // 136
        ("WHITEDIFF 1L",                                                "réactifs de laboratoire", null,                  null,         null,                           null),  // 137
    };
}
