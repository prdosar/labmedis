-- ============================================================
-- Inventaire d'ouverture LabMedis — 01/09/2026
-- Source : "Inverntaire du 01-09-2026.xlsx"
--
-- 3 entrées en stock groupées par fournisseur :
--   INV-OUV-20260901-2 : France Lait (SupplierId=2) — 9 lots
--   INV-OUV-20260901-3 : Effermol (SupplierId=3) — 1 lot (sans n° lot)
--   INV-OUV-20260901-4 : Pharma / MSD (SupplierId=4) — 22 lots
--
-- NB : ROMPALGINE lot G305 (exp. juin-26) marqué «Périmés» dans l'Excel
--      — inclus pour traçabilité, QuantityRemaining = 516
-- NB : Lait infantile 1er âge lot LKU2 sans quantité → ignoré
-- ============================================================

DO $$
DECLARE
  p_fl    BIGINT;        -- purchase France Lait
  p_ef    BIGINT;        -- purchase Effermol
  p_ph    BIGINT;        -- purchase Pharma / MSD
  pl      BIGINT;
  ref     CONSTANT TEXT        := 'INV-OUV-20260901';
  d_inv   CONSTANT DATE        := '2026-09-01';
  ts_inv  CONSTANT TIMESTAMPTZ := '2026-09-01 00:00:00+00';
BEGIN

  IF EXISTS (SELECT 1 FROM purchases WHERE "Reference" LIKE 'INV-OUV-20260901%') THEN
    RAISE EXCEPTION 'Inventaire d''ouverture du 01/09/2026 déjà chargé.';
  END IF;

  -- ================================================================
  -- PURCHASE 1 : France Lait (SupplierId = 2)
  -- ================================================================
  INSERT INTO purchases (
    "Reference", "PurchaseDate", "ArrivalDate", "SupplierId",
    "PurchaseCurrency", "ExchangeRateToXof", "ContainerReference",
    "Notes", "CreatedAt", "UpdatedAt", "IsDeleted", "SupplierOrderId", "TransportMode"
  ) VALUES (
    'INV-OUV-20260901-2', d_inv, d_inv, 2,
    'XOF', 1, NULL, 'Inventaire d''ouverture au 01/09/2026',
    ts_inv, ts_inv, false, NULL, ''
  ) RETURNING "Id" INTO p_fl;

  -- ProductId=12 : Céréales blé biscuité, lot 25331C1, exp nov-27
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_fl,12,'25331C1','2027-11-30',1,852,0,0,0,0,0,0,0,852,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (12,1,pl,'Adjustment',852,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=14 : Céréales blé fruits, lot 26041D2, exp févr-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_fl,14,'26041D2','2028-02-29',1,816,0,0,0,0,0,0,0,816,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (14,1,pl,'Adjustment',816,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=13 : Céréales blé miel, lot 26069D1, exp mars-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_fl,13,'26069D1','2028-03-31',1,1056,0,0,0,0,0,0,0,1056,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (13,1,pl,'Adjustment',1056,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=15 : Céréales riz fruits, lot 26028D1, exp janv-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_fl,15,'26028D1','2028-01-31',1,492,0,0,0,0,0,0,0,492,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (15,1,pl,'Adjustment',492,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=16 : Céréales riz miel, lot 25318C1, exp nov-27
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_fl,16,'25318C1','2027-11-30',1,540,0,0,0,0,0,0,0,540,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (16,1,pl,'Adjustment',540,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=17 : Céréales diastasés, lot 26021D1, exp janv-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_fl,17,'26021D1','2028-01-31',1,192,0,0,0,0,0,0,0,192,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (17,1,pl,'Adjustment',192,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=1 : Lait infantile 1er âge 400g, lot LKUZ, exp mars-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_fl,1,'LKUZ','2028-03-31',1,4380,0,0,0,0,0,0,0,4380,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (1,1,pl,'Adjustment',4380,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=6 : Lait croissance 900g, lot LKUI, exp févr-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_fl,6,'LKUI','2028-02-29',1,102,0,0,0,0,0,0,0,102,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (6,1,pl,'Adjustment',102,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=11 : France lait confort 2e âge 400g, lot LRD2, exp juil-27
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_fl,11,'LRD2','2027-07-31',1,24,0,0,0,0,0,0,0,24,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (11,1,pl,'Adjustment',24,ts_inv,ref,ts_inv,ts_inv,false);

  -- ================================================================
  -- PURCHASE 2 : Effermol (SupplierId = 3)
  -- ================================================================
  INSERT INTO purchases (
    "Reference","PurchaseDate","ArrivalDate","SupplierId",
    "PurchaseCurrency","ExchangeRateToXof","ContainerReference",
    "Notes","CreatedAt","UpdatedAt","IsDeleted","SupplierOrderId","TransportMode"
  ) VALUES (
    'INV-OUV-20260901-3', d_inv, d_inv, 3,
    'XOF', 1, NULL, 'Inventaire d''ouverture au 01/09/2026',
    ts_inv, ts_inv, false, NULL, ''
  ) RETURNING "Id" INTO p_ef;

  -- ProductId=28 : EFFERMOL 1G INJ Fl/100ML — sans n° lot ni péremption
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ef,28,'',NULL,1,47846,0,0,0,0,0,0,0,47846,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (28,1,pl,'Adjustment',47846,ts_inv,ref,ts_inv,ts_inv,false);

  -- ================================================================
  -- PURCHASE 3 : Pharma / MSD (SupplierId = 4)
  -- ================================================================
  INSERT INTO purchases (
    "Reference","PurchaseDate","ArrivalDate","SupplierId",
    "PurchaseCurrency","ExchangeRateToXof","ContainerReference",
    "Notes","CreatedAt","UpdatedAt","IsDeleted","SupplierOrderId","TransportMode"
  ) VALUES (
    'INV-OUV-20260901-4', d_inv, d_inv, 4,
    'XOF', 1, NULL, 'Inventaire d''ouverture au 01/09/2026',
    ts_inv, ts_inv, false, NULL, ''
  ) RETURNING "Id" INTO p_ph;

  -- ProductId=38 : CETRADOL GEL 325/37.5mg, lot G196, exp déc-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,38,'G196','2028-12-31',1,2016,0,0,0,0,0,0,0,2016,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (38,1,pl,'Adjustment',2016,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=38 : CETRADOL GEL, lot G197, exp déc-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,38,'G197','2028-12-31',1,11508,0,0,0,0,0,0,0,11508,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (38,1,pl,'Adjustment',11508,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=38 : CETRADOL GEL, lot G198, exp déc-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,38,'G198','2028-12-31',1,12936,0,0,0,0,0,0,0,12936,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (38,1,pl,'Adjustment',12936,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=40 : GRIPEX Adulte, lot G779, exp nov-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,40,'G779','2028-11-30',1,672,0,0,0,0,0,0,0,672,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (40,1,pl,'Adjustment',672,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=40 : GRIPEX Adulte, lot G790, exp nov-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,40,'G790','2028-11-30',1,2496,0,0,0,0,0,0,0,2496,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (40,1,pl,'Adjustment',2496,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=41 : GRIPEX Enfant, lot G672, exp mars-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,41,'G672','2028-03-31',1,4896,0,0,0,0,0,0,0,4896,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (41,1,pl,'Adjustment',4896,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=41 : GRIPEX Enfant, lot G687, exp oct-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,41,'G687','2028-10-31',1,288,0,0,0,0,0,0,0,288,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (41,1,pl,'Adjustment',288,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=35 : ALLERGICA 10MG, lot X106, exp janv-29
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,35,'X106','2029-01-31',1,2106,0,0,0,0,0,0,0,2106,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (35,1,pl,'Adjustment',2106,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=39 : DEBRICOL CPR 100mg, lot G249, exp févr-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,39,'G249','2028-02-29',1,3348,0,0,0,0,0,0,0,3348,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (39,1,pl,'Adjustment',3348,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=39 : DEBRICOL CPR 100mg, lot G251, exp mai-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,39,'G251','2028-05-31',1,4968,0,0,0,0,0,0,0,4968,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (39,1,pl,'Adjustment',4968,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=39 : DEBRICOL CPR 100mg, lot G253, exp oct-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,39,'G253','2028-10-31',1,288,0,0,0,0,0,0,0,288,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (39,1,pl,'Adjustment',288,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=53 : LODEPINE 5MG Gel, lot G223, exp juil-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,53,'G223','2028-07-31',1,1440,0,0,0,0,0,0,0,1440,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (53,1,pl,'Adjustment',1440,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=54 : COPRED ODT 20MG, lot G235, exp oct-27
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,54,'G235','2027-10-31',1,1944,0,0,0,0,0,0,0,1944,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (54,1,pl,'Adjustment',1944,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=45 : TAMIZOL 500MG, lot G480, exp janv-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,45,'G480','2028-01-31',1,4452,0,0,0,0,0,0,0,4452,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (45,1,pl,'Adjustment',4452,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=44 : RUGDAL Gel 40mg, lot G169, exp juil-27
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,44,'G169','2027-07-31',1,2496,0,0,0,0,0,0,0,2496,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (44,1,pl,'Adjustment',2496,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=44 : RUGDAL Gel 40mg, lot G173, exp oct-27
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,44,'G173','2027-10-31',1,288,0,0,0,0,0,0,0,288,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (44,1,pl,'Adjustment',288,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=51 : TRANSITON Adulte, lot GA622, exp nov-27
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,51,'GA622','2027-11-30',1,870,0,0,0,0,0,0,0,870,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (51,1,pl,'Adjustment',870,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=52 : TRANSITON Enfant, lot G245, exp oct-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,52,'G245','2028-10-31',1,930,0,0,0,0,0,0,0,930,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (52,1,pl,'Adjustment',930,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=43 : ROMPALGINE CPR, lot G360, exp juin-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,43,'G360','2028-06-30',1,3108,0,0,0,0,0,0,0,3108,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (43,1,pl,'Adjustment',3108,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=43 : ROMPALGINE CPR, lot G305, exp juin-26 *** PÉRIMÉS (marqué dans l'Excel) ***
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,43,'G305','2026-06-30',1,516,0,0,0,0,0,0,0,516,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (43,1,pl,'Adjustment',516,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=42 : OFLODIS CPR 200mg, lot G289, exp mars-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,42,'G289','2028-03-31',1,4200,0,0,0,0,0,0,0,4200,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (42,1,pl,'Adjustment',4200,ts_inv,ref,ts_inv,ts_inv,false);

  -- ProductId=42 : OFLODIS CPR 200mg, lot G297, exp nov-28
  INSERT INTO purchase_lines (
    "PurchaseId","ProductId","LotNumber","ExpirationDate","Quantity","QuantityRemaining",
    "UnitPurchasePrice","UnitPurchasePriceXof","UnitCostPriceXof",
    "TargetSellingPriceHt","CalculatedSellingPriceHt","MarginRate",
    "QuantityLostCartons","UnitsPerCarton","CreatedAt","UpdatedAt","IsDeleted"
  ) VALUES (p_ph,42,'G297','2028-11-30',1,300,0,0,0,0,0,0,0,300,ts_inv,ts_inv,false)
  RETURNING "Id" INTO pl;
  INSERT INTO stock_movements ("ProductId","WarehouseId","PurchaseLineId","MovementType","Quantity","MovementDate","Reference","CreatedAt","UpdatedAt","IsDeleted")
  VALUES (42,1,pl,'Adjustment',300,ts_inv,ref,ts_inv,ts_inv,false);

  RAISE NOTICE 'Inventaire d''ouverture du 01/09/2026 chargé : 3 achats, 32 lots, % unités.',
    (852+816+1056+492+540+192+4380+102+24+47846+2016+11508+12936+672+2496+4896+288+2106+3348+4968+288+1440+1944+4452+2496+288+870+930+3108+516+4200+300);

END $$;
