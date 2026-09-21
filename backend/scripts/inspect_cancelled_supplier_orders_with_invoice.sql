-- Diagnostic : commandes fournisseurs annulées ayant généré une facture ET/OU des écritures compta encore actives.
-- À exécuter en READ-ONLY avant tout nettoyage. Ne modifie rien.
--
-- SupplierOrderStatus.Annulée = 4 (cf. backend/src/LabMedis.Domain/Enums/SupplierOrderStatus.cs)
--
-- Usage prod : docker exec -it labmedis-postgres psql -U labmedis -d labmedis -f /tmp/inspect_cancelled_supplier_orders_with_invoice.sql
-- (copier d'abord : docker cp backend/scripts/inspect_cancelled_supplier_orders_with_invoice.sql labmedis-postgres:/tmp/)

\pset pager off

-- 1. Vue d'ensemble : combien de commandes annulées ont encore une facture active ?
SELECT
    COUNT(*) AS nb_commandes_annulees_avec_facture_active
FROM supplier_orders o
JOIN supplier_invoices i ON i."SupplierOrderId" = o."Id" AND NOT i."IsDeleted"
WHERE o."Status" = 4;

-- 2. Détail par commande : montants, règlements, avances
SELECT
    o."Id"                    AS order_id,
    o."Reference"             AS bc_ref,
    s."Name"                  AS fournisseur,
    o."CreatedAt"::date       AS bc_date,
    o."UpdatedAt"::date       AS annulee_le,
    i."Id"                    AS invoice_id,
    i."InvoiceReference"      AS facture_ref,
    i."TotalAmountXof"        AS facture_ttc_xof,
    i."AdvanceAmountXof"      AS avance_xof,
    i."AmountPaid"            AS regle_xof,
    (i."TotalAmountXof" - i."DiscountAmountXof" - i."AdvanceAmountXof" - i."AmountPaid") AS solde_du_xof,
    (SELECT COUNT(*) FROM supplier_invoice_payments p WHERE p."SupplierInvoiceId" = i."Id" AND NOT p."IsDeleted") AS nb_reglements
FROM supplier_orders o
JOIN suppliers s          ON s."Id" = o."SupplierId"
JOIN supplier_invoices i  ON i."SupplierOrderId" = o."Id" AND NOT i."IsDeleted"
WHERE o."Status" = 4
ORDER BY o."UpdatedAt" DESC;

-- 3. Écritures comptables orphelines (JournalEntry) associées à ces factures
SELECT
    o."Id"                    AS order_id,
    o."Reference"             AS bc_ref,
    i."InvoiceReference"      AS facture_ref,
    je."Id"                   AS journal_entry_id,
    je."JournalCode"          AS journal,
    je."SourceType"           AS source_type,
    je."EntryDate"::date      AS ecriture_date,
    je."Reference"            AS ecriture_ref,
    (SELECT COALESCE(SUM(jl."DebitAmount"), 0) FROM journal_lines jl WHERE jl."JournalEntryId" = je."Id" AND NOT jl."IsDeleted") AS total_debit,
    (SELECT COALESCE(SUM(jl."CreditAmount"), 0) FROM journal_lines jl WHERE jl."JournalEntryId" = je."Id" AND NOT jl."IsDeleted") AS total_credit
FROM supplier_orders o
JOIN supplier_invoices i ON i."SupplierOrderId" = o."Id" AND NOT i."IsDeleted"
JOIN journal_entries je  ON je."SourceId" = i."Id"
                        AND je."SourceType" IN ('SupplierInvoice', 'SupplierAdvance', 'SupplierInvoicePayment')
                        AND NOT je."IsDeleted"
WHERE o."Status" = 4
ORDER BY o."Id", je."EntryDate";

-- 4. Impact global sur la balance fournisseur : total encore imputé aux sous-comptes fournisseurs
--    à cause de ces écritures orphelines.
SELECT
    ca."Code"                       AS sous_compte_fournisseur,
    ca."Name"                       AS libelle,
    COUNT(DISTINCT je."Id")         AS nb_ecritures_orphelines,
    COALESCE(SUM(jl."DebitAmount"), 0)  AS total_debit_orphelin_xof,
    COALESCE(SUM(jl."CreditAmount"), 0) AS total_credit_orphelin_xof,
    COALESCE(SUM(jl."CreditAmount") - SUM(jl."DebitAmount"), 0) AS solde_fournisseur_fantome
FROM supplier_orders o
JOIN supplier_invoices i ON i."SupplierOrderId" = o."Id" AND NOT i."IsDeleted"
JOIN journal_entries je  ON je."SourceId" = i."Id"
                        AND je."SourceType" IN ('SupplierInvoice', 'SupplierAdvance', 'SupplierInvoicePayment')
                        AND NOT je."IsDeleted"
JOIN journal_lines jl    ON jl."JournalEntryId" = je."Id" AND NOT jl."IsDeleted"
JOIN chart_accounts ca   ON ca."Id" = jl."AccountId"
WHERE o."Status" = 4
  AND ca."Code" LIKE '4011%'
GROUP BY ca."Code", ca."Name"
ORDER BY ca."Code";
