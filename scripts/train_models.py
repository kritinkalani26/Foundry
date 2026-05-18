#!/usr/bin/env python3
"""
Foundry ML Pricing Models — Training Script
============================================
Trains one GradientBoostingRegressor per equipment type using synthetic data
calibrated against real Indian makerspace market rates (sourced from 3Ding,
Makenica, IndiaMART, local makerspaces in Indore/Kota/Nagpur/Patna).

Outputs: src/lib/models/{equipment}.json
Run:     python scripts/train_models.py
"""

import numpy as np
import json
import os
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_percentage_error, r2_score

np.random.seed(42)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "models")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── SERIALIZER ─────────────────────────────────────────────────────────────

def serialize_tree(tree_obj):
    """Convert sklearn DecisionTree internals → compact nested JSON dict."""
    cl = tree_obj.children_left
    cr = tree_obj.children_right
    feat = tree_obj.feature
    thr = tree_obj.threshold
    val = tree_obj.value

    def build(nid):
        if cl[nid] == -1:
            return {"v": round(float(val[nid, 0, 0]), 6)}
        return {
            "f": int(feat[nid]),
            "t": round(float(thr[nid]), 6),
            "l": build(cl[nid]),
            "r": build(cr[nid]),
        }

    return build(0)


def train_and_export(name, X, y, feature_names):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.20, random_state=42)

    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.07,
        min_samples_leaf=4,
        subsample=0.85,
        random_state=42,
    )
    model.fit(X_tr, y_tr)

    y_pred = model.predict(X_te)
    mape = mean_absolute_percentage_error(np.exp(y_te), np.exp(y_pred))
    r2   = r2_score(y_te, y_pred)

    trees = [serialize_tree(est[0].tree_) for est in model.estimators_]

    payload = {
        "equipment":    name,
        "features":     feature_names,
        "init_value":   round(float(model.init_.constant_[0, 0]), 6),
        "learning_rate": model.learning_rate,
        "trees":        trees,
    }

    path = os.path.join(OUTPUT_DIR, f"{name}.json")
    with open(path, "w") as fh:
        json.dump(payload, fh, separators=(",", ":"))

    kb = os.path.getsize(path) / 1024
    print(f"  [{name}]  MAPE={mape:.1%}  R²={r2:.3f}  size={kb:.0f}KB")
    return model


# ─── DATA GENERATORS ────────────────────────────────────────────────────────
# All prices in INR, trained on log(price) for better relative error behaviour.
# Pricing benchmarks used:
#   3D printing  – 3Ding.in, Makenica, local Indore shops (₹4–14/cm³ material)
#   Laser cut    – FabLab Indore, Kolkata Makerspace (₹150–800/job)
#   CNC mill     – IndiaMART listings Pune/Surat (₹300–800/hr)
#   Lathe        – IndiaMART (₹200–600/hr)
#   Water jet    – Faridabad/Rajkot shops (₹800–2500/hr)
#   Soldering    – Lamington Rd Mumbai, SP Road Bangalore (₹5–20/component)
#   Vinyl cut    – Signage shops across India (₹50–200/sqft)
#   PCB fab      – JLCPCB India partner rates + 1.8× local margin

def gen_3d_printer(n=500):
    rows = []
    for _ in range(n):
        volume   = float(np.clip(np.random.lognormal(2.6, 1.3), 2.0, 500.0))
        infill   = np.random.choice([0.15, 0.20, 0.30, 0.50, 0.80], p=[0.08, 0.14, 0.46, 0.22, 0.10])
        layer    = np.random.choice([0.10, 0.20, 0.30], p=[0.18, 0.62, 0.20])
        mat      = np.random.choice([0, 1, 2, 3], p=[0.50, 0.18, 0.24, 0.08])  # PLA ABS PETG Resin
        tri      = float(np.clip(np.random.lognormal(9.5, 1.6), 500.0, 700000.0))
        qty      = np.random.choice([1, 2, 3, 5, 10], p=[0.55, 0.18, 0.14, 0.09, 0.04])

        mat_rate = [4.8, 5.6, 7.0, 14.5][mat]
        eff_vol  = volume * infill
        mat_cost = eff_vol * mat_rate

        speed    = 8.0 * (layer / 0.2) * (0.35 if mat == 3 else 1.0)
        hrs      = max(0.25, eff_vol / speed)
        time_cost = hrs * 68.0  # ₹68/hr machine rate (electricity+depreciation)

        cmplx_bonus = 1.0 + 0.12 * min(2.0, max(0.0, np.log10(tri / 20000 + 0.1)))
        support      = 1.25 if (mat == 3 or tri > 120000) else 1.0

        per_unit = (mat_cost + time_cost) * cmplx_bonus * support
        total    = per_unit * qty * (0.90 if qty >= 5 else 1.0)
        noise    = np.random.uniform(0.80, 1.32)
        price    = max(85.0, total * noise * 1.12)  # 12% platform fee

        rows.append([
            np.log(volume + 1),
            infill,
            layer,
            float(mat),
            np.log(tri + 1) / 13.5,
            float(qty),
            np.log(price),
        ])

    arr = np.array(rows)
    feats = ["log_volume_cm3", "infill", "layer_height_mm",
             "material_code", "log_complexity_norm", "quantity"]
    return arr[:, :6], arr[:, 6], feats


def gen_laser_cutter(n=450):
    # Material codes: 0=wood, 1=acrylic, 2=mdf, 3=leather, 4=cardboard, 5=fabric
    rows = []
    for _ in range(n):
        w      = float(np.random.uniform(50, 900))   # mm
        h      = float(np.random.uniform(50, 600))
        thick  = float(np.random.choice([2, 3, 4, 5, 6, 8, 10, 12]))
        mat    = np.random.choice([0, 1, 2, 3, 4, 5], p=[0.30, 0.28, 0.18, 0.08, 0.10, 0.06])
        qty    = np.random.choice([1, 2, 5, 10, 20], p=[0.40, 0.25, 0.18, 0.12, 0.05])
        cuts   = float(np.random.randint(1, 15))  # distinct cut paths

        area_cm2 = (w * h) / 100.0
        perim_cm = (2 * (w + h) + cuts * np.random.uniform(50, 300)) / 10.0

        # Area rates (INR/cm²) and cut rates (INR/cm)
        area_r = [1.6, 2.8, 1.3, 2.2, 0.8, 1.8][mat]
        cut_r  = [0.7, 1.1, 0.6, 0.9, 0.4, 0.8][mat]
        thick_pen = 1.0 + 0.08 * max(0, thick - 3)  # thicker = harder to cut

        job_base  = 80.0  # setup cost
        per_unit  = (area_cm2 * area_r + perim_cm * cut_r) * thick_pen + job_base
        total     = per_unit * qty * (0.88 if qty >= 10 else (0.94 if qty >= 5 else 1.0))
        noise     = np.random.uniform(0.78, 1.30)
        price     = max(150.0, total * noise * 1.10)

        rows.append([
            np.log(area_cm2 + 1),
            np.log(perim_cm + 1),
            float(mat),
            float(thick),
            float(qty),
            np.log(price),
        ])

    arr = np.array(rows)
    feats = ["log_area_cm2", "log_perimeter_cm", "material_code", "thickness_mm", "quantity"]
    return arr[:, :5], arr[:, 5], feats


def gen_cnc_mill(n=400):
    # Material codes: 0=wood, 1=plastic, 2=aluminum, 3=steel/SS
    rows = []
    for _ in range(n):
        vol      = float(np.clip(np.random.lognormal(3.5, 1.5), 5.0, 5000.0))  # stock cm³
        mat      = np.random.choice([0, 1, 2, 3], p=[0.30, 0.25, 0.32, 0.13])
        cmplx    = float(np.random.randint(1, 6))  # 1=simple pocket, 5=5-axis complex
        setups   = float(np.random.choice([1, 2, 3], p=[0.6, 0.3, 0.1]))

        # Hourly rate by material (machine wear, speed, tooling)
        hr_rate  = [320.0, 280.0, 580.0, 820.0][mat]
        # Machining time (hours): bigger+harder+complex = more time
        hrs      = (vol / 80.0) * (cmplx / 2.5) * ([1.0, 0.9, 1.6, 2.2][mat])
        hrs      = max(0.5, min(hrs, 20.0))

        setup_cost = setups * [200.0, 180.0, 350.0, 500.0][mat]
        total      = hrs * hr_rate + setup_cost
        noise      = np.random.uniform(0.82, 1.25)
        price      = max(400.0, total * noise * 1.12)

        rows.append([
            np.log(vol + 1),
            float(mat),
            cmplx,
            setups,
            np.log(price),
        ])

    arr = np.array(rows)
    feats = ["log_stock_vol_cm3", "material_code", "complexity_1_5", "num_setups"]
    return arr[:, :4], arr[:, 4], feats


def gen_lathe(n=380):
    # Material codes: 0=mild_steel, 1=aluminum, 2=brass, 3=plastic
    rows = []
    for _ in range(n):
        dia_mm   = float(np.random.uniform(10, 300))
        len_mm   = float(np.random.uniform(20, 600))
        mat      = np.random.choice([0, 1, 2, 3], p=[0.38, 0.30, 0.18, 0.14])
        is_prec  = float(np.random.choice([0, 1], p=[0.65, 0.35]))  # tight tolerance
        ops      = float(np.random.randint(1, 6))  # turning/facing/boring/threading/grooving

        hr_rate  = [380.0, 300.0, 340.0, 240.0][mat]
        # Larger diameter + longer part + more ops = more time
        hrs      = (dia_mm / 50.0) * (len_mm / 100.0) * (ops / 2.0) * (1.4 if is_prec else 1.0)
        hrs      = max(0.25, min(hrs, 12.0))

        price    = max(200.0, hrs * hr_rate * np.random.uniform(0.80, 1.28) * 1.10)

        rows.append([
            np.log(dia_mm + 1),
            np.log(len_mm + 1),
            float(mat),
            is_prec,
            ops,
            np.log(price),
        ])

    arr = np.array(rows)
    feats = ["log_diameter_mm", "log_length_mm", "material_code", "is_precision", "num_operations"]
    return arr[:, :5], arr[:, 5], feats


def gen_water_jet(n=350):
    # Material codes: 0=mild_steel, 1=stainless, 2=aluminum, 3=stone/marble, 4=glass
    rows = []
    for _ in range(n):
        cut_len_mm = float(np.random.uniform(100, 8000))
        area_cm2   = float(np.random.uniform(20, 2000))
        mat        = np.random.choice([0, 1, 2, 3, 4], p=[0.30, 0.22, 0.25, 0.14, 0.09])
        thick_mm   = float(np.random.choice([3, 5, 6, 8, 10, 12, 15, 20, 25]))
        qty        = np.random.choice([1, 2, 3, 5], p=[0.55, 0.22, 0.14, 0.09])

        # Cut speed drops with thickness and hardness
        speed_mm_min = [400, 180, 350, 80, 60][mat] / (1.0 + 0.10 * (thick_mm - 5))
        speed_mm_min = max(20.0, speed_mm_min)

        cut_min   = cut_len_mm / speed_mm_min
        hr_rate   = [900.0, 1200.0, 850.0, 1100.0, 1400.0][mat]
        thick_pen = 1.0 + 0.06 * max(0, thick_mm - 6)

        per_unit  = (cut_min / 60.0) * hr_rate * thick_pen + 300.0  # setup
        total     = per_unit * qty * (0.92 if qty >= 3 else 1.0)
        noise     = np.random.uniform(0.80, 1.26)
        price     = max(500.0, total * noise * 1.12)

        rows.append([
            np.log(cut_len_mm + 1),
            np.log(area_cm2 + 1),
            float(mat),
            float(thick_mm),
            float(qty),
            np.log(price),
        ])

    arr = np.array(rows)
    feats = ["log_cut_length_mm", "log_area_cm2", "material_code", "thickness_mm", "quantity"]
    return arr[:, :5], arr[:, 5], feats


def gen_soldering(n=400):
    # Soldering / PCB assembly
    rows = []
    for _ in range(n):
        tht        = float(np.random.randint(0, 80))    # through-hole components
        smd        = float(np.random.randint(0, 200))   # SMD components
        board_cm2  = float(np.random.uniform(4, 400))
        is_dbl     = float(np.random.choice([0, 1], p=[0.55, 0.45]))
        bga_count  = float(np.random.choice([0, 0, 0, 1, 2, 3], p=[0.60, 0.15, 0.10, 0.08, 0.05, 0.02]))
        qty_boards = np.random.choice([1, 2, 5, 10, 25], p=[0.35, 0.25, 0.22, 0.12, 0.06])

        # Component pricing: THT ₹12, SMD ₹6, BGA ₹250 (rework complexity)
        comp_cost  = tht * 12.0 + smd * 6.0 + bga_count * 250.0
        setup      = 200.0 + board_cm2 * 0.5
        double_pen = 1.45 if is_dbl else 1.0

        per_board  = (comp_cost + setup) * double_pen
        total      = per_board * qty_boards * (0.82 if qty_boards >= 10 else (0.90 if qty_boards >= 5 else 1.0))
        noise      = np.random.uniform(0.80, 1.28)
        price      = max(200.0, total * noise * 1.12)

        rows.append([
            tht,
            smd,
            np.log(board_cm2 + 1),
            is_dbl,
            bga_count,
            float(qty_boards),
            np.log(price),
        ])

    arr = np.array(rows)
    feats = ["tht_count", "smd_count", "log_board_area_cm2", "is_double_sided", "bga_count", "qty_boards"]
    return arr[:, :6], arr[:, 6], feats


def gen_vinyl_cutter(n=380):
    # Material codes: 0=standard_vinyl, 1=htv_transfer, 2=chrome_reflective, 3=glitter
    rows = []
    for _ in range(n):
        w_mm    = float(np.random.uniform(50, 1200))
        h_mm    = float(np.random.uniform(50, 800))
        mat     = np.random.choice([0, 1, 2, 3], p=[0.45, 0.30, 0.15, 0.10])
        colors  = float(np.random.randint(1, 6))
        qty     = np.random.choice([1, 2, 5, 10, 25, 50], p=[0.30, 0.22, 0.20, 0.15, 0.08, 0.05])

        area_cm2   = (w_mm * h_mm) / 100.0
        mat_rate   = [1.8, 2.4, 3.5, 2.8][mat]  # INR/cm²
        color_fee  = (colors - 1) * 60.0         # layering cost per extra color
        setup      = 80.0

        per_unit  = area_cm2 * mat_rate + color_fee + setup
        total     = per_unit * qty * (0.80 if qty >= 25 else (0.88 if qty >= 10 else (0.94 if qty >= 5 else 1.0)))
        noise     = np.random.uniform(0.78, 1.30)
        price     = max(80.0, total * noise * 1.10)

        rows.append([
            np.log(area_cm2 + 1),
            float(mat),
            colors,
            float(qty),
            np.log(price),
        ])

    arr = np.array(rows)
    feats = ["log_area_cm2", "material_code", "color_count", "quantity"]
    return arr[:, :4], arr[:, 4], feats


def gen_pcb_fabrication(n=450):
    # PCB bare board fabrication (like JLCPCB but local Indian pricing)
    rows = []
    for _ in range(n):
        w_mm     = float(np.random.uniform(20, 250))
        h_mm     = float(np.random.uniform(20, 200))
        layers   = float(np.random.choice([1, 2, 4, 6, 8], p=[0.08, 0.55, 0.26, 0.07, 0.04]))
        qty      = np.random.choice([5, 10, 20, 50, 100, 500], p=[0.20, 0.25, 0.24, 0.16, 0.10, 0.05])
        min_trc  = float(np.random.choice([0.1, 0.127, 0.15, 0.2, 0.3], p=[0.05, 0.12, 0.25, 0.38, 0.20]))  # mm
        surface  = float(np.random.choice([0, 1, 2], p=[0.45, 0.38, 0.17]))  # HASL, ENIG, OSP

        area_cm2 = (w_mm * h_mm) / 100.0
        # Base price per cm² scales with layers and surface finish
        layer_mult   = {1: 0.8, 2: 1.0, 4: 2.2, 6: 3.8, 8: 5.5}[int(layers)]
        surface_add  = [0.0, 25.0, 12.0][int(surface)]  # ENIG is expensive
        fine_trace   = 1.0 + max(0, (0.15 - min_trc) * 20)  # penalty for fine traces

        base_per_board = area_cm2 * 0.9 * layer_mult * fine_trace + surface_add + 40.0  # tooling
        qty_discount   = max(0.55, 1.0 - 0.004 * (qty - 5))
        total          = base_per_board * qty * qty_discount
        noise          = np.random.uniform(0.82, 1.22)
        price          = max(200.0, total * noise * 1.15)

        rows.append([
            np.log(area_cm2 + 1),
            float(layers),
            float(qty),
            min_trc,
            float(surface),
            np.log(price),
        ])

    arr = np.array(rows)
    feats = ["log_area_cm2", "layers", "quantity", "min_trace_mm", "surface_finish_code"]
    return arr[:, :5], arr[:, 5], feats


# ─── MAIN ───────────────────────────────────────────────────────────────────

DATASETS = [
    ("3d-printer",    gen_3d_printer),
    ("laser-cutter",  gen_laser_cutter),
    ("cnc-mill",      gen_cnc_mill),
    ("lathe",         gen_lathe),
    ("water-jet",     gen_water_jet),
    ("soldering",     gen_soldering),
    ("vinyl-cutter",  gen_vinyl_cutter),
    ("pcb-fabrication", gen_pcb_fabrication),
]

print("Foundry — ML Pricing Model Training")
print("=" * 50)
for name, gen_fn in DATASETS:
    X, y, feats = gen_fn()
    train_and_export(name, X, y, feats)

print("\nDone. Model files written to src/lib/models/")
