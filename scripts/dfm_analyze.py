#!/usr/bin/env python3
"""
DFM analysis script — called as a child process from the Next.js API route.
Reads assembly analysis JSON from stdin, writes DFM results JSON to stdout.

Works WITHOUT pythonocc-core: geometry is inferred heuristically from the
AI-suggested manufacturing process. When OCC is installed, Stage 1 can be
swapped in and confidence will improve to "high".
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dfm_engine.models import (
    BoundingBox, ComponentRequirements, FaceClassification,
    GeometricFeatures, HoleFeature, SupplierCapability,
)
from dfm_engine.rules import qualify_all
from dfm_engine.matching import match_suppliers

# ── AI process → DFM process names ───────────────────────────────────────────
PROCESS_MAP: dict[str, list[str]] = {
    "3D Print":        ["fdm_3dprint", "sla_3dprint"],
    "CNC Mill":        ["cnc_milling"],
    "Laser Cut":       ["laser_cut", "waterjet"],
    "Lathe":           ["cnc_turning"],
    "Sheet Metal":     ["sheet_metal"],
    "Urethane":        ["urethane_casting"],
    "Manual/Purchase": [],
}

# ── Heuristic geometry per process ────────────────────────────────────────────
# Confidence is always "low" here — real OCC extraction would give "medium"/"high".
def infer_features(process: str) -> GeometricFeatures:
    if process == "Laser Cut":
        return GeometricFeatures(
            bounding_box=BoundingBox(x=150.0, y=100.0, z=3.0),
            volume=45_000.0, surface_area=30_000.0,
            min_wall_thickness=3.0, min_wall_thickness_confidence="low",
            holes=[], min_internal_corner_radius=None,
            face_classification=FaceClassification(planar=6, cylindrical=2, conical=0, freeform=0),
            plate_like=True, plate_thickness=3.0,
            has_undercuts=False, undercut_confidence="high",
        )
    if process == "3D Print":
        return GeometricFeatures(
            bounding_box=BoundingBox(x=80.0, y=60.0, z=50.0),
            volume=200_000.0, surface_area=25_000.0,
            min_wall_thickness=2.0, min_wall_thickness_confidence="low",
            holes=[], min_internal_corner_radius=2.0,
            face_classification=FaceClassification(planar=4, cylindrical=2, conical=0, freeform=2),
            plate_like=False, plate_thickness=None,
            has_undercuts=None, undercut_confidence="low",
        )
    if process == "CNC Mill":
        return GeometricFeatures(
            bounding_box=BoundingBox(x=100.0, y=80.0, z=40.0),
            volume=320_000.0, surface_area=40_000.0,
            min_wall_thickness=3.0, min_wall_thickness_confidence="low",
            holes=[HoleFeature(diameter=8.0, depth=20.0, axis=(0, 0, 1), depth_to_diameter_ratio=2.5)],
            min_internal_corner_radius=2.0,
            face_classification=FaceClassification(planar=8, cylindrical=4, conical=0, freeform=0),
            plate_like=False, plate_thickness=None,
            has_undercuts=None, undercut_confidence="medium",
        )
    if process == "Lathe":
        return GeometricFeatures(
            bounding_box=BoundingBox(x=80.0, y=20.0, z=20.0),
            volume=25_000.0, surface_area=8_000.0,
            min_wall_thickness=3.0, min_wall_thickness_confidence="low",
            holes=[], min_internal_corner_radius=1.0,
            face_classification=FaceClassification(planar=2, cylindrical=8, conical=0, freeform=0),
            plate_like=False, plate_thickness=None,
            has_undercuts=False, undercut_confidence="high",
        )
    if process == "Sheet Metal":
        return GeometricFeatures(
            bounding_box=BoundingBox(x=200.0, y=150.0, z=2.0),
            volume=60_000.0, surface_area=60_000.0,
            min_wall_thickness=2.0, min_wall_thickness_confidence="low",
            holes=[], min_internal_corner_radius=None,
            face_classification=FaceClassification(planar=6, cylindrical=0, conical=0, freeform=0),
            plate_like=True, plate_thickness=2.0,
            has_undercuts=False, undercut_confidence="high",
        )
    if process == "Urethane":
        return GeometricFeatures(
            bounding_box=BoundingBox(x=120.0, y=80.0, z=60.0),
            volume=576_000.0, surface_area=50_000.0,
            min_wall_thickness=2.5, min_wall_thickness_confidence="low",
            holes=[], min_internal_corner_radius=None,
            face_classification=FaceClassification(planar=4, cylindrical=2, conical=0, freeform=4),
            plate_like=False, plate_thickness=None,
            has_undercuts=None, undercut_confidence="low",
        )
    # Fallback / unknown
    return GeometricFeatures(
        bounding_box=BoundingBox(x=80.0, y=80.0, z=80.0),
        volume=512_000.0, surface_area=38_400.0,
        min_wall_thickness=4.0, min_wall_thickness_confidence="low",
        holes=[], min_internal_corner_radius=2.0,
        face_classification=FaceClassification(planar=6, cylindrical=2, conical=0, freeform=0),
        plate_like=False, plate_thickness=None,
        has_undercuts=None, undercut_confidence="low",
    )


# ── Sample supplier pool (used when DB is unavailable) ────────────────────────
SAMPLE_SUPPLIERS = [
    SupplierCapability(
        supplier_id="fdm-mumbai-01", process="fdm_3dprint",
        materials=["PLA", "ABS", "PETG", "nylon", "TPU"],
        work_envelope_mm=(350.0, 350.0, 400.0),
        min_tolerance_class="rough", certifications=[],
        capacity_status="available", location_region="India",
        lead_time_days=2, base_cost_per_hour=400.0,
    ),
    SupplierCapability(
        supplier_id="sla-bangalore-01", process="sla_3dprint",
        materials=["resin", "ABS-like resin", "flexible resin"],
        work_envelope_mm=(300.0, 300.0, 350.0),
        min_tolerance_class="medium", certifications=["ISO9001"],
        capacity_status="available", location_region="India",
        lead_time_days=3, base_cost_per_hour=600.0,
    ),
    SupplierCapability(
        supplier_id="laser-delhi-01", process="laser_cut",
        materials=["steel", "aluminium", "acrylic", "wood", "brass"],
        work_envelope_mm=(1500.0, 1000.0, 25.0),
        min_tolerance_class="fine", certifications=["ISO9001"],
        capacity_status="available", location_region="India",
        lead_time_days=3, base_cost_per_hour=700.0,
    ),
    SupplierCapability(
        supplier_id="waterjet-chennai-01", process="waterjet",
        materials=["steel", "aluminium", "titanium", "stone", "glass"],
        work_envelope_mm=(2000.0, 1500.0, 150.0),
        min_tolerance_class="medium", certifications=[],
        capacity_status="available", location_region="India",
        lead_time_days=5, base_cost_per_hour=900.0,
    ),
    SupplierCapability(
        supplier_id="cnc-pune-01", process="cnc_milling",
        materials=["aluminium", "steel", "brass", "copper", "nylon"],
        work_envelope_mm=(500.0, 400.0, 300.0),
        min_tolerance_class="fine", certifications=["ISO9001"],
        capacity_status="available", location_region="India",
        lead_time_days=7, base_cost_per_hour=1200.0,
    ),
    SupplierCapability(
        supplier_id="cnc-hyderabad-01", process="cnc_milling",
        materials=["aluminium", "steel", "stainless steel"],
        work_envelope_mm=(800.0, 600.0, 400.0),
        min_tolerance_class="precision", certifications=["ISO9001", "AS9100"],
        capacity_status="limited", location_region="India",
        lead_time_days=10, base_cost_per_hour=1800.0,
    ),
    SupplierCapability(
        supplier_id="lathe-mumbai-01", process="cnc_turning",
        materials=["aluminium", "steel", "brass", "copper", "titanium"],
        work_envelope_mm=(300.0, 300.0, 600.0),
        min_tolerance_class="fine", certifications=["ISO9001"],
        capacity_status="available", location_region="India",
        lead_time_days=5, base_cost_per_hour=1000.0,
    ),
    # Sheet metal suppliers
    SupplierCapability(
        supplier_id="sheetmetal-pune-01", process="sheet_metal",
        materials=["steel", "stainless steel", "aluminium", "mild steel",
                   "cold rolled steel", "galvanized"],
        work_envelope_mm=(2000.0, 1500.0, 12.0),
        min_tolerance_class="medium", certifications=["ISO9001"],
        capacity_status="available", location_region="India",
        lead_time_days=5, base_cost_per_hour=800.0,
        max_sheet_thickness_mm=10.0,
        max_bend_length_mm=1500.0,
        press_brake_tonnage=100.0,
        welding_capable=True,
        forming_operations=["bending", "punching", "shearing", "welding"],
    ),
    SupplierCapability(
        supplier_id="sheetmetal-delhi-01", process="sheet_metal",
        materials=["steel", "aluminium", "stainless steel", "brass", "copper"],
        work_envelope_mm=(3000.0, 2000.0, 12.0),
        min_tolerance_class="fine", certifications=["ISO9001", "CE"],
        capacity_status="available", location_region="India",
        lead_time_days=7, base_cost_per_hour=950.0,
        max_sheet_thickness_mm=12.0,
        max_bend_length_mm=2000.0,
        press_brake_tonnage=160.0,
        welding_capable=True,
        forming_operations=["bending", "punching", "shearing", "welding", "powder_coating"],
    ),
    # Urethane casting suppliers
    SupplierCapability(
        supplier_id="urethane-bangalore-01", process="urethane_casting",
        materials=["polyurethane", "PU", "urethane", "PU resin",
                   "rigid urethane", "flexible urethane"],
        work_envelope_mm=(400.0, 400.0, 300.0),
        min_tolerance_class="medium", certifications=[],
        capacity_status="available", location_region="India",
        lead_time_days=10, base_cost_per_hour=None,
        can_build_silicone_tooling=True,
        max_cast_part_size_mm=(350.0, 350.0, 250.0),
        supported_moq_range=(1, 50),
        typical_tooling_lead_time_days=7,
    ),
]


def analyse_part(part: dict) -> dict:
    process      = part.get("process", "3D Print")
    material     = part.get("material", "aluminium")
    dfm_processes = PROCESS_MAP.get(process, [])

    if not dfm_processes:
        return {
            "partName": part["partName"],
            "suggestedProcess": process,
            "skipped": True,
            "skipReason": "Manual/Purchase parts are not manufactured — no DFM check needed.",
        }

    features = infer_features(process)
    all_verdicts = qualify_all(features)

    # Only surface verdicts for the processes the AI suggested
    relevant_verdicts = [v for v in all_verdicts if v.process in dfm_processes]
    primary_verdict   = relevant_verdicts[0] if relevant_verdicts else None

    requirements = ComponentRequirements(
        material=material,
        tolerance_class="medium",
        quantity=1,
    )

    ranked = match_suppliers(relevant_verdicts, requirements, features.bounding_box, SAMPLE_SUPPLIERS)

    warnings = []
    blocking = []
    if primary_verdict:
        blocking = primary_verdict.blocking_reasons
        warnings = [r.detail for r in primary_verdict.results if r.status == "warn"]

    return {
        "partName":         part["partName"],
        "suggestedProcess": process,
        "dfmProcesses":     dfm_processes,
        "manufacturable":   primary_verdict.manufacturable if primary_verdict else False,
        "confidence":       primary_verdict.confidence if primary_verdict else "low",
        "blockingReasons":  blocking,
        "warnings":         warnings,
        "suppliersCount":   len(ranked.ranked),
        "topSupplier":      (
            {
                "id":       ranked.ranked[0].supplier.supplier_id,
                "process":  ranked.ranked[0].process,
                "leadDays": ranked.ranked[0].supplier.lead_time_days,
                "region":   ranked.ranked[0].supplier.location_region,
                "score":    ranked.ranked[0].score,
            }
            if ranked.ranked else None
        ),
        "networkGap":       len(ranked.no_supplier_gap) > 0,
        "geometryNote":     (
            "Geometry inferred from process type — upload to OCC analyser for precise DFM."
        ),
    }


def main():
    raw  = sys.stdin.buffer.read()
    data = json.loads(raw)
    parts: list[dict] = data.get("parts", [])

    results = [analyse_part(p) for p in parts]

    total          = len(results)
    manufacturable = sum(1 for r in results if r.get("manufacturable", False))
    skipped        = sum(1 for r in results if r.get("skipped", False))

    output = {
        "summary": {
            "total":          total,
            "manufacturable": manufacturable,
            "skipped":        skipped,
            "issues":         total - manufacturable - skipped,
        },
        "parts": results,
    }
    sys.stdout.write(json.dumps(output))


if __name__ == "__main__":
    main()
