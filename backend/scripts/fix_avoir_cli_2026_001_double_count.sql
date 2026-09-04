-- ============================================================
-- Correction : double-comptage sur AVOIR-CLI-2026-001
--
-- Bug : CustomerCreditNoteService.CreateAsync appelait à la fois
--   DbContext.CustomerCreditNoteLines.Add(line)  ET  creditNote.AddLine(line).
-- La fixup EF (via PropertyAccessMode.Field sur _lines) insérait déjà
-- la ligne dans _lines lors du Add, puis AddLine l'ajoutait une 2e fois.
-- Résultat : ComputeTotals() sommait la même ligne 2× → totaux doublés.
--
-- Cas concret : AVOIR-CLI-2026-001 (client TEDIS PHARMA TOGO, facture
-- CMD-2026-004-FAC, 36 × 1 450 XOF, TVA 0%).
--   Attendu :  LineTotalTtc = 52 200 ; TotalAmountTtc = 52 200.
--   Observé : LineTotalTtc = 52 200 (OK) ; TotalAmountTtc = 104 400 (2×).
-- Effet en cascade : ApplyToInvoiceAsync a enregistré un InvoicePayment
-- de 104 400 XOF au lieu de 52 200 → AmountPaid de la facture surévalué.
--
-- Ce script :
--   1. Vérifie la signature du bug (stocké == 2 × somme des lignes)
--   2. Recalcule TotalAmountHt / TotalTva / TotalAmountTtc à partir des lignes
--   3. Corrige le paiement lié (Reference = 'AVOIR-CLI-2026-001')
--   4. Recompute AmountPaid + Status de la facture d'origine
--   5. Affiche AVANT / APRES pour vérification manuelle avant COMMIT
--
-- Usage :
--   psql -U labmedis -d labmedis -f fix_avoir_cli_2026_001_double_count.sql
--   ↳ inspecter la sortie, puis COMMIT ou ROLLBACK manuellement.
-- ============================================================

BEGIN;

\echo ''
\echo '========== AVANT CORRECTION =========='

\echo ''
\echo '-- Avoir client :'
SELECT "Id", "Reference", "TotalAmountHt", "TotalTva", "TotalAmountTtc", "Status"
  FROM customer_credit_notes
 WHERE "Reference" = 'AVOIR-CLI-2026-001';

\echo ''
\echo '-- Ligne(s) de l''avoir :'
SELECT ccnl."Id", ccnl."QuantityReturned", ccnl."UnitPriceHt",
       ccnl."LineTotalHt", ccnl."LineTva", ccnl."LineTotalTtc"
  FROM customer_credit_note_lines ccnl
  JOIN customer_credit_notes ccn ON ccn."Id" = ccnl."CustomerCreditNoteId"
 WHERE ccn."Reference" = 'AVOIR-CLI-2026-001'
   AND ccnl."IsDeleted" = false;

\echo ''
\echo '-- Paiement lié (issu de la déduction sur facture) :'
SELECT "Id", "InvoiceId", "Amount", "PaymentMethod", "Reference", "PaymentDate"
  FROM invoice_payments
 WHERE "Reference" = 'AVOIR-CLI-2026-001'
   AND "IsDeleted" = false;

\echo ''
\echo '-- Facture d''origine :'
SELECT "Id", "Reference", "TotalTtc", "AmountPaid",
       ("TotalTtc" - "AmountPaid") AS "BalanceDue", "Status"
  FROM invoices
 WHERE "Reference" = 'CMD-2026-004-FAC';


-- ============================================================
-- Garde-fou : n'appliquer que si la signature du double-count est présente
-- ============================================================
DO $$
DECLARE
  v_credit_id  BIGINT;
  v_stored_ttc NUMERIC;
  v_lines_ttc  NUMERIC;
BEGIN
  SELECT "Id", "TotalAmountTtc" INTO v_credit_id, v_stored_ttc
    FROM customer_credit_notes
   WHERE "Reference" = 'AVOIR-CLI-2026-001';

  IF v_credit_id IS NULL THEN
    RAISE EXCEPTION 'Avoir AVOIR-CLI-2026-001 introuvable — abandon.';
  END IF;

  SELECT COALESCE(SUM("LineTotalTtc"), 0) INTO v_lines_ttc
    FROM customer_credit_note_lines
   WHERE "CustomerCreditNoteId" = v_credit_id
     AND "IsDeleted" = false;

  IF v_stored_ttc = v_lines_ttc THEN
    RAISE EXCEPTION 'Totaux déjà cohérents (stocké=%, lignes=%) — script déjà appliqué ? Abandon.',
      v_stored_ttc, v_lines_ttc;
  END IF;

  IF v_stored_ttc <> v_lines_ttc * 2 THEN
    RAISE EXCEPTION 'Signature du double-comptage absente (stocké=%, lignes×2=%) — abandon par sécurité.',
      v_stored_ttc, v_lines_ttc * 2;
  END IF;

  RAISE NOTICE 'Signature du bug confirmée : TotalAmountTtc stocké % = 2 × somme des lignes %', v_stored_ttc, v_lines_ttc;
END $$;


-- ============================================================
-- 1) Recalculer les totaux de l'avoir à partir des lignes
-- ============================================================
UPDATE customer_credit_notes ccn
   SET "TotalAmountHt"  = COALESCE((
         SELECT SUM("LineTotalHt")
           FROM customer_credit_note_lines
          WHERE "CustomerCreditNoteId" = ccn."Id" AND "IsDeleted" = false), 0),
       "TotalTva"       = COALESCE((
         SELECT SUM("LineTva")
           FROM customer_credit_note_lines
          WHERE "CustomerCreditNoteId" = ccn."Id" AND "IsDeleted" = false), 0),
       "TotalAmountTtc" = COALESCE((
         SELECT SUM("LineTotalTtc")
           FROM customer_credit_note_lines
          WHERE "CustomerCreditNoteId" = ccn."Id" AND "IsDeleted" = false), 0),
       "UpdatedAt"      = (NOW() AT TIME ZONE 'UTC')
 WHERE ccn."Reference" = 'AVOIR-CLI-2026-001';


-- ============================================================
-- 2) Corriger le paiement enregistré lors de la déduction sur facture
--    Nouveau montant = TotalAmountTtc de l'avoir désormais corrigé.
-- ============================================================
UPDATE invoice_payments ip
   SET "Amount"    = ccn."TotalAmountTtc",
       "UpdatedAt" = (NOW() AT TIME ZONE 'UTC')
  FROM customer_credit_notes ccn
 WHERE ip."Reference" = 'AVOIR-CLI-2026-001'
   AND ip."PaymentMethod" = 'Avoir client'
   AND ip."IsDeleted" = false
   AND ccn."Reference" = 'AVOIR-CLI-2026-001';


-- ============================================================
-- 3) Recomputer AmountPaid + Status de la facture d'origine
--    AmountPaid = somme des paiements non supprimés.
--    Status : Paid si AmountPaid >= TotalTtc, PartiallyPaid si > 0, sinon Issued.
--    On ne touche pas aux factures en Draft / Cancelled.
-- ============================================================
UPDATE invoices i
   SET "AmountPaid" = COALESCE((
         SELECT SUM("Amount")
           FROM invoice_payments
          WHERE "InvoiceId" = i."Id" AND "IsDeleted" = false), 0),
       "UpdatedAt"  = (NOW() AT TIME ZONE 'UTC')
 WHERE i."Reference" = 'CMD-2026-004-FAC';

UPDATE invoices i
   SET "Status" = CASE
                    WHEN i."AmountPaid" >= i."TotalTtc" THEN 'Paid'
                    WHEN i."AmountPaid" > 0             THEN 'PartiallyPaid'
                    ELSE 'Issued'
                  END,
       "UpdatedAt" = (NOW() AT TIME ZONE 'UTC')
 WHERE i."Reference" = 'CMD-2026-004-FAC'
   AND i."Status" NOT IN ('Draft', 'Cancelled');


\echo ''
\echo '========== APRES CORRECTION (avant COMMIT) =========='

\echo ''
\echo '-- Avoir client :'
SELECT "Id", "Reference", "TotalAmountHt", "TotalTva", "TotalAmountTtc", "Status"
  FROM customer_credit_notes
 WHERE "Reference" = 'AVOIR-CLI-2026-001';

\echo ''
\echo '-- Paiement lié :'
SELECT "Id", "InvoiceId", "Amount", "PaymentMethod", "Reference"
  FROM invoice_payments
 WHERE "Reference" = 'AVOIR-CLI-2026-001'
   AND "IsDeleted" = false;

\echo ''
\echo '-- Facture d''origine :'
SELECT "Id", "Reference", "TotalTtc", "AmountPaid",
       ("TotalTtc" - "AmountPaid") AS "BalanceDue", "Status"
  FROM invoices
 WHERE "Reference" = 'CMD-2026-004-FAC';

\echo ''
\echo '=> Vérifiez que TotalAmountTtc = somme des lignes,'
\echo '   que Amount du paiement = TotalAmountTtc de l''avoir,'
\echo '   et que AmountPaid = somme des paiements non supprimés.'
\echo '   Puis : COMMIT;   (ou ROLLBACK; si anomalie)'
\echo ''
