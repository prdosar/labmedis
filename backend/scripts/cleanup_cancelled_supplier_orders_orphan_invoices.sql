-- Nettoyage des factures fournisseurs + écritures compta orphelines liées à des
-- commandes annulées (SupplierOrderStatus.Annulée = 4). Idempotent : soft-delete
-- uniquement ce qui ne l'est pas encore.
--
-- Discipline transactionnelle : BEGIN sans COMMIT. Contrôle le AVANT/APRÈS,
-- puis tape `COMMIT;` (ou `ROLLBACK;` si tu changes d'avis).
--
-- Usage :
--   docker cp backend/scripts/cleanup_cancelled_supplier_orders_orphan_invoices.sql labmedis-postgres:/tmp/
--   docker exec -it labmedis-postgres psql -U labmedis -d labmedis -f /tmp/cleanup_cancelled_supplier_orders_orphan_invoices.sql

\pset pager off

BEGIN;

-- ── AVANT ────────────────────────────────────────────────────────────────────
\echo '=== AVANT nettoyage ==='

SELECT
    i."Id"                AS invoice_id,
    i."InvoiceReference"  AS ref,
    i."TotalAmountXof"    AS ttc_xof,
    i."IsDeleted"         AS deja_supprime
FROM supplier_invoices i
JOIN supplier_orders o ON o."Id" = i."SupplierOrderId"
WHERE o."Status" = 4
  AND NOT i."IsDeleted";

SELECT
    je."Id"          AS entry_id,
    je."SourceType"  AS src,
    je."SourceId"    AS src_id,
    je."Reference"   AS ref,
    (SELECT COUNT(*) FROM journal_lines jl WHERE jl."JournalEntryId" = je."Id" AND NOT jl."IsDeleted") AS nb_lignes_actives
FROM journal_entries je
JOIN supplier_invoices i ON i."Id" = je."SourceId"
JOIN supplier_orders o   ON o."Id" = i."SupplierOrderId"
WHERE o."Status" = 4
  AND je."SourceType" IN ('SupplierInvoice', 'SupplierAdvance', 'SupplierInvoicePayment')
  AND NOT je."IsDeleted";

-- ── SOFT-DELETE ──────────────────────────────────────────────────────────────

-- 1. Lignes d'écritures (les enfants d'abord — le HasQueryFilter ne cascade pas)
UPDATE journal_lines
SET "IsDeleted" = TRUE,
    "UpdatedAt" = NOW()
WHERE NOT "IsDeleted"
  AND "JournalEntryId" IN (
      SELECT je."Id"
      FROM journal_entries je
      JOIN supplier_invoices i ON i."Id" = je."SourceId"
      JOIN supplier_orders o   ON o."Id" = i."SupplierOrderId"
      WHERE o."Status" = 4
        AND je."SourceType" IN ('SupplierInvoice', 'SupplierAdvance', 'SupplierInvoicePayment')
  );

-- 2. Écritures compta
UPDATE journal_entries
SET "IsDeleted" = TRUE,
    "UpdatedAt" = NOW()
WHERE NOT "IsDeleted"
  AND "SourceType" IN ('SupplierInvoice', 'SupplierAdvance', 'SupplierInvoicePayment')
  AND "SourceId" IN (
      SELECT i."Id" FROM supplier_invoices i
      JOIN supplier_orders o ON o."Id" = i."SupplierOrderId"
      WHERE o."Status" = 4
  );

-- 3. Règlements (probablement 0 dans ton cas, mais idempotent)
UPDATE supplier_invoice_payments
SET "IsDeleted" = TRUE,
    "UpdatedAt" = NOW()
WHERE NOT "IsDeleted"
  AND "SupplierInvoiceId" IN (
      SELECT i."Id" FROM supplier_invoices i
      JOIN supplier_orders o ON o."Id" = i."SupplierOrderId"
      WHERE o."Status" = 4
  );

-- 4. Factures elles-mêmes
UPDATE supplier_invoices
SET "IsDeleted" = TRUE,
    "UpdatedAt" = NOW()
WHERE NOT "IsDeleted"
  AND "SupplierOrderId" IN (
      SELECT "Id" FROM supplier_orders WHERE "Status" = 4
  );

-- ── APRÈS ────────────────────────────────────────────────────────────────────
\echo ''
\echo '=== APRÈS nettoyage (transaction en cours, non commit) ==='

SELECT
    COUNT(*) AS factures_actives_sur_bc_annules
FROM supplier_invoices i
JOIN supplier_orders o ON o."Id" = i."SupplierOrderId"
WHERE o."Status" = 4
  AND NOT i."IsDeleted";

SELECT
    COUNT(*) AS ecritures_actives_orphelines
FROM journal_entries je
JOIN supplier_invoices i ON i."Id" = je."SourceId"
JOIN supplier_orders o   ON o."Id" = i."SupplierOrderId"
WHERE o."Status" = 4
  AND je."SourceType" IN ('SupplierInvoice', 'SupplierAdvance', 'SupplierInvoicePayment')
  AND NOT je."IsDeleted";

\echo ''
\echo '>>> Si les deux compteurs valent 0, tape :   COMMIT;'
\echo '>>> Sinon pour tout annuler :                ROLLBACK;'
