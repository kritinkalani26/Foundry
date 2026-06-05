#!/usr/bin/env python3
"""
Foundry — Transaction Data Exporter
=====================================
Reads accepted quotes from the Foundry database and writes
CSV files to data/foundry_exports/ so retrain_models.py can
use them as Tier-1 (highest quality) training data.

Each accepted order with a STL analysis = one real price datapoint.

Run: python scripts/export_foundry_data.py
Requires: DATABASE_URL in .env (same as the app)
"""

import csv
import logging
import os
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

load_dotenv(Path(__file__).parent.parent / ".env")

DB_URL  = os.getenv("DATABASE_URL")
OUT_DIR = Path(__file__).parent.parent / "data" / "foundry_exports"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Material enum → feature code (must match ml-predictor.ts)
MATERIAL_CODE = {"PLA": 0, "ABS": 1, "PETG": 2, "RESIN": 3}


def export_3d_printer(cur) -> int:
    """
    Export accepted 3D print orders.
    Features: volume_cm3, infill, layer_height_mm, material_code, triangle_count, quantity
    """
    cur.execute("""
        SELECT
            s.volume_cm3,
            o.infill_density   AS infill,
            o.layer_height     AS layer_height_mm,
            o.material         AS material,
            s.triangle_count,
            o.quantity,
            q.price            AS price_inr
        FROM "Order" o
        JOIN "STLAnalysis" s  ON s.id = o.stl_analysis_id
        JOIN "Quote"       q  ON q.id = o.accepted_quote_id
        WHERE o.accepted_quote_id IS NOT NULL
          AND o.stl_analysis_id IS NOT NULL
          AND o.material IN ('PLA','ABS','PETG','RESIN')
          AND q.price > 0
        ORDER BY o.created_at DESC
    """)
    rows = cur.fetchall()

    path = OUT_DIR / "3d-printer.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["volume_cm3", "infill", "layer_height_mm", "material_code",
                    "triangle_count", "quantity", "price_inr", "source"])
        for r in rows:
            w.writerow([
                r["volume_cm3"],
                r["infill"],
                r["layer_height_mm"],
                MATERIAL_CODE.get(r["material"], 0),
                r["triangle_count"],
                r["quantity"],
                r["price_inr"],
                "foundry_quote",
            ])
    log.info("  3d-printer: %d rows → %s", len(rows), path)
    return len(rows)


def export_price_datapoints(cur) -> dict[str, int]:
    """
    Export from the PriceDataPoint table (populated by the app for
    non-STL orders placed via the assembly analyzer flow).
    """
    counts: dict[str, int] = {}
    cur.execute("""
        SELECT equipment, features, price_inr, source
        FROM "PriceDataPoint"
        ORDER BY created_at DESC
    """)
    rows_by_equip: dict[str, list] = {}
    for r in cur.fetchall():
        rows_by_equip.setdefault(r["equipment"], []).append(r)

    for equip, rows in rows_by_equip.items():
        if not rows:
            continue
        # Collect all feature keys from first row's JSON
        import json
        sample_feats = json.loads(rows[0]["features"]) if isinstance(rows[0]["features"], str) \
            else rows[0]["features"]
        feat_keys = list(sample_feats.keys())
        path = OUT_DIR / f"{equip}.csv"

        # Append if file already exists (e.g. from export_3d_printer above)
        file_exists = path.exists()
        with open(path, "a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            if not file_exists:
                w.writerow(feat_keys + ["price_inr", "source"])
            for r in rows:
                feats = json.loads(r["features"]) if isinstance(r["features"], str) else r["features"]
                w.writerow([feats.get(k, "") for k in feat_keys] + [r["price_inr"], r["source"]])

        counts[equip] = len(rows)
        log.info("  %s (PriceDataPoint): %d rows → %s", equip, len(rows), path)

    return counts


def main():
    if not DB_URL:
        log.error("DATABASE_URL not set. Add it to .env")
        sys.exit(1)

    log.info("Foundry — Transaction Data Exporter")
    log.info("=" * 52)
    log.info("Connecting to database …")

    conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    cur  = conn.cursor()

    n_3d = export_3d_printer(cur)
    dp   = export_price_datapoints(cur)

    cur.close()
    conn.close()

    total = n_3d + sum(dp.values())
    log.info("")
    log.info("Exported %d total datapoints to %s", total, OUT_DIR)
    log.info("Run scripts/retrain_models.py to rebuild the ML models.")


if __name__ == "__main__":
    main()
