"""
Stage 2 — Process Qualification (DFM rules).

Reads thresholds from config/rules.yaml.  The evaluator is data-driven:
adding a new rule means adding an entry to the YAML, not changing code.

No LLM is used here.  Every verdict is deterministic geometry-vs-config.
"""

from __future__ import annotations
import os
from functools import lru_cache
from typing import Any

import yaml

from .models import (
    ComponentRequirements, GeometricFeatures, ProcessVerdict, RuleResult,
    RuleStatus, ToolingInfo,
)

_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config", "rules.yaml")


@lru_cache(maxsize=1)
def _load_config() -> dict[str, Any]:
    with open(_CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)


# ── Public entry points ───────────────────────────────────────────────────────

def qualify_all(
    features: GeometricFeatures,
    requirements: ComponentRequirements | None = None,
) -> list[ProcessVerdict]:
    """Run all eight process rule-sets and return a verdict for each."""
    cfg = _load_config()
    return [
        _qualify_waterjet(features, cfg["waterjet"]),
        _qualify_laser(features, cfg["laser_cut"]),
        _qualify_fdm(features, cfg["fdm_3dprint"]),
        _qualify_sla(features, cfg["sla_3dprint"]),
        _qualify_cnc_milling(features, cfg["cnc_milling"]),
        _qualify_cnc_turning(features, cfg["cnc_turning"]),
        _qualify_sheet_metal(features, cfg["sheet_metal"]),
        _qualify_urethane_casting(features, cfg["urethane_casting"], requirements),
    ]


def qualify_process(
    features: GeometricFeatures,
    process: str,
    requirements: ComponentRequirements | None = None,
) -> ProcessVerdict:
    cfg = _load_config()
    dispatch: dict[str, Any] = {
        "waterjet":         (_qualify_waterjet,         cfg["waterjet"]),
        "laser_cut":        (_qualify_laser,            cfg["laser_cut"]),
        "fdm_3dprint":      (_qualify_fdm,              cfg["fdm_3dprint"]),
        "sla_3dprint":      (_qualify_sla,              cfg["sla_3dprint"]),
        "cnc_milling":      (_qualify_cnc_milling,      cfg["cnc_milling"]),
        "cnc_turning":      (_qualify_cnc_turning,      cfg["cnc_turning"]),
        "sheet_metal":      (_qualify_sheet_metal,      cfg["sheet_metal"]),
        "urethane_casting": (_qualify_urethane_casting, cfg["urethane_casting"]),
    }
    if process not in dispatch:
        raise ValueError(f"Unknown process: {process!r}")
    fn, process_cfg = dispatch[process]
    # urethane casting needs requirements for the economic check
    if process == "urethane_casting":
        return fn(features, process_cfg, requirements)
    return fn(features, process_cfg)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _verdict(
    process: str,
    results: list[RuleResult],
    confidence: str = "high",
) -> ProcessVerdict:
    fails = [r for r in results if r.status == "fail"]
    return ProcessVerdict(
        process=process,
        manufacturable=len(fails) == 0,
        results=results,
        blocking_reasons=[r.detail for r in fails],
        confidence=confidence,  # type: ignore[arg-type]
    )


def _rule(
    rule_id: str,
    description: str,
    status: RuleStatus,
    detail: str,
    measured: float | None = None,
    threshold: float | None = None,
) -> RuleResult:
    return RuleResult(
        rule_id=rule_id,
        description=description,
        status=status,
        detail=detail,
        measured_value=measured,
        threshold=threshold,
    )


def _check_plate_like(features: GeometricFeatures, process: str) -> RuleResult:
    if features.plate_like:
        return _rule(
            f"{process}.plate_like",
            "Part must be plate-like (2D profile) for this process",
            "pass",
            f"Part is plate-like (thickness {features.plate_thickness:.2f} mm)",
            measured=features.plate_thickness,
        )
    return _rule(
        f"{process}.plate_like",
        "Part must be plate-like (2D profile) for this process",
        "fail",
        "Part is not plate-like; this process starts from flat sheet stock. "
        f"Bounding box: {features.bounding_box.x:.1f}×"
        f"{features.bounding_box.y:.1f}×{features.bounding_box.z:.1f} mm.",
    )


def _check_sheet_thickness(
    features: GeometricFeatures, process: str,
    min_t: float, max_t: float,
) -> RuleResult:
    t = features.plate_thickness
    if t is None:
        return _rule(
            f"{process}.sheet_thickness", "Sheet thickness within cuttable range",
            "not_applicable", "Part is not plate-like; thickness check skipped.",
        )
    if t < min_t:
        return _rule(
            f"{process}.sheet_thickness", "Sheet thickness within cuttable range",
            "fail",
            f"Thickness {t:.2f} mm is below minimum {min_t:.2f} mm for {process}.",
            measured=t, threshold=min_t,
        )
    if t > max_t:
        return _rule(
            f"{process}.sheet_thickness", "Sheet thickness within cuttable range",
            "fail",
            f"Thickness {t:.2f} mm exceeds maximum {max_t:.2f} mm for {process}.",
            measured=t, threshold=max_t,
        )
    return _rule(
        f"{process}.sheet_thickness", "Sheet thickness within cuttable range",
        "pass", f"Thickness {t:.2f} mm is within [{min_t:.2f}, {max_t:.2f}] mm.", measured=t,
    )


def _check_min_slot(
    features: GeometricFeatures, process: str, min_slot: float,
) -> RuleResult:
    if not features.holes:
        return _rule(
            f"{process}.min_slot_width", "Minimum slot / hole width",
            "pass", "No holes detected; slot width check not applicable.",
        )
    min_dia = min(h.diameter for h in features.holes)
    if min_dia < min_slot:
        return _rule(
            f"{process}.min_slot_width", "Minimum slot / hole width",
            "fail",
            f"Smallest hole diameter {min_dia:.2f} mm < minimum {min_slot:.2f} mm.",
            measured=min_dia, threshold=min_slot,
        )
    return _rule(
        f"{process}.min_slot_width", "Minimum slot / hole width",
        "pass", f"Smallest hole {min_dia:.2f} mm ≥ {min_slot:.2f} mm.", measured=min_dia,
    )


# ── Waterjet ──────────────────────────────────────────────────────────────────

def _qualify_waterjet(features: GeometricFeatures, cfg: dict) -> ProcessVerdict:
    results: list[RuleResult] = []
    results.append(_check_plate_like(features, "waterjet"))
    results.append(_check_sheet_thickness(
        features, "waterjet", cfg["min_sheet_thickness_mm"], cfg["max_sheet_thickness_mm"],
    ))
    results.append(_check_min_slot(features, "waterjet", cfg["min_slot_width_mm"]))

    if features.plate_like and features.holes and features.plate_thickness:
        factor = cfg["min_hole_diameter_factor"]
        min_dia = features.plate_thickness * factor
        smallest = min(h.diameter for h in features.holes)
        status: RuleStatus = "warn" if smallest < min_dia else "pass"
        results.append(_rule(
            "waterjet.hole_dia_factor",
            "Hole diameter ≥ factor × sheet thickness",
            status,
            f"Smallest hole {smallest:.2f} mm {'<' if status == 'warn' else '≥'} "
            f"{factor}× thickness ({min_dia:.2f} mm).",
            measured=smallest, threshold=min_dia,
        ))

    if features.plate_like and features.plate_thickness:
        taper_t = cfg["taper_warn_thickness_mm"]
        if features.plate_thickness > taper_t:
            results.append(_rule(
                "waterjet.taper_warn", "Thick plate may have significant cut taper",
                "warn",
                f"Thickness {features.plate_thickness:.1f} mm > {taper_t:.1f} mm; "
                "verify taper tolerance with supplier.",
                measured=features.plate_thickness, threshold=taper_t,
            ))

    return _verdict("waterjet", results)


# ── Laser cut ─────────────────────────────────────────────────────────────────

def _qualify_laser(features: GeometricFeatures, cfg: dict) -> ProcessVerdict:
    results: list[RuleResult] = []
    results.append(_check_plate_like(features, "laser_cut"))
    results.append(_check_sheet_thickness(
        features, "laser_cut", cfg["min_sheet_thickness_mm"], cfg["max_sheet_thickness_mm"],
    ))
    results.append(_check_min_slot(features, "laser_cut", cfg["min_slot_width_mm"]))
    return _verdict("laser_cut", results)


# ── FDM 3D printing ───────────────────────────────────────────────────────────

def _qualify_fdm(features: GeometricFeatures, cfg: dict) -> ProcessVerdict:
    results: list[RuleResult] = []
    confidence = "medium"
    bb = features.bounding_box
    max_vol = cfg["max_build_volume_mm"]

    if not bb.fits_inside(tuple(max_vol)):
        results.append(_rule(
            "fdm.build_volume", "Part fits within maximum FDM build volume",
            "fail",
            f"Part {bb.x:.0f}×{bb.y:.0f}×{bb.z:.0f} mm exceeds "
            f"global FDM build volume max {max_vol[0]:.0f}×{max_vol[1]:.0f}×{max_vol[2]:.0f} mm. "
            "No standard FDM printer can accommodate this.",
            measured=max(bb.x, bb.y, bb.z), threshold=max(max_vol),
        ))
    else:
        results.append(_rule(
            "fdm.build_volume", "Part fits within maximum FDM build volume",
            "pass", f"Part {bb.x:.0f}×{bb.y:.0f}×{bb.z:.0f} mm fits.",
        ))

    wt = features.min_wall_thickness
    min_wt, warn_wt = cfg["min_wall_thickness_mm"], cfg["warn_wall_thickness_mm"]
    if wt < min_wt:
        results.append(_rule("fdm.wall_thickness", "Minimum wall thickness", "fail",
            f"Wall {wt:.2f} mm < FDM minimum {min_wt:.2f} mm.", measured=wt, threshold=min_wt))
    elif wt < warn_wt:
        results.append(_rule("fdm.wall_thickness", "Minimum wall thickness", "warn",
            f"Wall {wt:.2f} mm is thin (warn {warn_wt:.2f} mm).", measured=wt, threshold=warn_wt))
    else:
        results.append(_rule("fdm.wall_thickness", "Minimum wall thickness", "pass",
            f"Wall {wt:.2f} mm ≥ {min_wt:.2f} mm.", measured=wt))

    results.append(_rule("fdm.overhang", "Overhangs may require support material", "warn",
        f"Overhangs > {cfg['overhang_angle_warn_deg']}° from horizontal likely need supports."))

    return _verdict("fdm_3dprint", results, confidence)


# ── SLA 3D printing ───────────────────────────────────────────────────────────

def _qualify_sla(features: GeometricFeatures, cfg: dict) -> ProcessVerdict:
    results: list[RuleResult] = []
    bb = features.bounding_box
    max_vol = cfg["max_build_volume_mm"]

    if not bb.fits_inside(tuple(max_vol)):
        results.append(_rule("sla.build_volume", "Part fits within SLA build volume", "fail",
            f"Part {bb.x:.0f}×{bb.y:.0f}×{bb.z:.0f} mm exceeds "
            f"SLA max {max_vol[0]:.0f}×{max_vol[1]:.0f}×{max_vol[2]:.0f} mm.",
            measured=max(bb.x, bb.y, bb.z), threshold=max(max_vol)))
    else:
        results.append(_rule("sla.build_volume", "Part fits within SLA build volume",
            "pass", f"Part {bb.x:.0f}×{bb.y:.0f}×{bb.z:.0f} mm fits."))

    wt = features.min_wall_thickness
    min_wt, warn_wt = cfg["min_wall_thickness_mm"], cfg["warn_wall_thickness_mm"]
    if wt < min_wt:
        results.append(_rule("sla.wall_thickness", "Minimum wall thickness", "fail",
            f"Wall {wt:.2f} mm < SLA minimum {min_wt:.2f} mm.", measured=wt, threshold=min_wt))
    elif wt < warn_wt:
        results.append(_rule("sla.wall_thickness", "Minimum wall thickness", "warn",
            f"Wall {wt:.2f} mm is thin.", measured=wt, threshold=warn_wt))
    else:
        results.append(_rule("sla.wall_thickness", "Minimum wall thickness", "pass",
            f"Wall {wt:.2f} mm ≥ {min_wt:.2f} mm.", measured=wt))

    results.append(_rule("sla.overhang", "Overhangs require supports in SLA", "warn",
        f"Overhangs > {cfg['overhang_angle_warn_deg']}° need supports."))

    return _verdict("sla_3dprint", results, "medium")


# ── CNC milling ───────────────────────────────────────────────────────────────

def _qualify_cnc_milling(features: GeometricFeatures, cfg: dict) -> ProcessVerdict:
    results: list[RuleResult] = []
    confidence: str = "high"
    icr = features.min_internal_corner_radius
    min_icr = cfg["min_internal_corner_radius_mm"]

    if icr is None:
        results.append(_rule("cnc_mill.corner_radius", "Internal corner radius ≥ minimum tool radius",
            "not_applicable", "No internal corners detected."))
    elif icr == 0.0:
        results.append(_rule("cnc_mill.corner_radius", "Internal corner radius ≥ minimum tool radius",
            "fail",
            f"Sharp internal corners (radius ≈ 0 mm < minimum {min_icr:.2f} mm). Add fillets.",
            measured=0.0, threshold=min_icr))
    elif icr < min_icr:
        results.append(_rule("cnc_mill.corner_radius", "Internal corner radius ≥ minimum tool radius",
            "fail",
            f"Internal corner radius {icr:.2f} mm < minimum tool radius {min_icr:.2f} mm.",
            measured=icr, threshold=min_icr))
    else:
        results.append(_rule("cnc_mill.corner_radius", "Internal corner radius ≥ minimum tool radius",
            "pass", f"Minimum internal corner radius {icr:.2f} mm ≥ {min_icr:.2f} mm.", measured=icr))

    max_ddr = cfg["max_hole_depth_to_diameter"]
    for hole in features.holes:
        st: RuleStatus = "fail" if hole.depth_to_diameter_ratio > max_ddr else "pass"
        results.append(_rule("cnc_mill.hole_ddr", "Hole depth-to-diameter within drillable range", st,
            f"Hole ∅{hole.diameter:.2f} mm D/d={hole.depth_to_diameter_ratio:.1f} "
            f"{'>' if st == 'fail' else '≤'} {max_ddr:.1f}.",
            measured=hole.depth_to_diameter_ratio, threshold=max_ddr))

    wt = features.min_wall_thickness
    min_wt, warn_wt = cfg["min_wall_thickness_mm"], cfg["warn_wall_thickness_mm"]
    if wt < min_wt:
        results.append(_rule("cnc_mill.wall_thickness", "Minimum wall thickness", "fail",
            f"Wall {wt:.2f} mm < CNC minimum {min_wt:.2f} mm.", measured=wt, threshold=min_wt))
    elif wt < warn_wt:
        results.append(_rule("cnc_mill.wall_thickness", "Minimum wall thickness", "warn",
            f"Wall {wt:.2f} mm is thin.", measured=wt, threshold=warn_wt))
    else:
        results.append(_rule("cnc_mill.wall_thickness", "Minimum wall thickness", "pass",
            f"Wall {wt:.2f} mm ≥ {min_wt:.2f} mm.", measured=wt))

    undercut_hard_fail = cfg.get("undercut_hard_fail", False)
    if features.has_undercuts is True:
        status: RuleStatus = "fail" if undercut_hard_fail else "warn"
        results.append(_rule("cnc_mill.undercuts", "Tool accessibility (3-axis)", status,
            "Definite undercuts detected. 3-axis milling cannot reach these features."))
    elif features.has_undercuts is None:
        results.append(_rule("cnc_mill.undercuts", "Tool accessibility (3-axis)", "warn",
            f"Tool accessibility uncertain (confidence: {features.undercut_confidence}). "
            "Manual review of setup orientations recommended."))
        confidence = min(confidence, features.undercut_confidence)  # type: ignore[assignment]
    else:
        results.append(_rule("cnc_mill.undercuts", "Tool accessibility (3-axis)",
            "pass", "No undercuts detected."))

    return _verdict("cnc_milling", results, confidence)


# ── CNC turning ───────────────────────────────────────────────────────────────

def _qualify_cnc_turning(features: GeometricFeatures, cfg: dict) -> ProcessVerdict:
    results: list[RuleResult] = []
    confidence: str = "high"
    bb = features.bounding_box
    dims = sorted([bb.x, bb.y, bb.z], reverse=True)

    if dims[0] > 0 and dims[1] > 0:
        ratio = dims[0] / dims[1]
        max_ar = cfg.get("max_aspect_ratio_for_non_symmetric_warn", 3.0)
        if ratio > max_ar and not _looks_rotationally_symmetric(features):
            results.append(_rule("cnc_turn.symmetry",
                "Part should be approximately rotationally symmetric for turning", "warn",
                f"Aspect ratio {ratio:.1f} suggests non-symmetric part.", measured=ratio, threshold=max_ar))
            confidence = "medium"
        else:
            results.append(_rule("cnc_turn.symmetry", "Part is approximately rotationally symmetric",
                "pass", f"Aspect ratio {ratio:.1f}.", measured=ratio))

    icr = features.min_internal_corner_radius
    min_icr = cfg["min_internal_corner_radius_mm"]
    if icr == 0.0:
        results.append(_rule("cnc_turn.corner_radius", "Internal corner radius ≥ insert nose radius",
            "fail", f"Sharp internal corners < minimum {min_icr:.2f} mm.", measured=0.0, threshold=min_icr))
    elif icr is not None and icr < min_icr:
        results.append(_rule("cnc_turn.corner_radius", "Internal corner radius ≥ insert nose radius",
            "fail", f"Corner radius {icr:.2f} mm < {min_icr:.2f} mm.", measured=icr, threshold=min_icr))
    else:
        results.append(_rule("cnc_turn.corner_radius", "Internal corner radius ≥ insert nose radius",
            "pass" if icr else "not_applicable",
            f"Corner radius {icr:.2f} mm ≥ {min_icr:.2f} mm." if icr else "No internal corners detected.",
            measured=icr))

    max_ddr = cfg["max_hole_depth_to_diameter"]
    for hole in features.holes:
        if hole.depth_to_diameter_ratio > max_ddr:
            results.append(_rule("cnc_turn.hole_ddr", "Hole depth-to-diameter within boring range", "fail",
                f"Hole ∅{hole.diameter:.2f} mm D/d={hole.depth_to_diameter_ratio:.1f} > {max_ddr:.1f}.",
                measured=hole.depth_to_diameter_ratio, threshold=max_ddr))

    wt = features.min_wall_thickness
    min_wt, warn_wt = cfg["min_wall_thickness_mm"], cfg["warn_wall_thickness_mm"]
    if wt < min_wt:
        results.append(_rule("cnc_turn.wall_thickness", "Minimum wall thickness", "fail",
            f"Wall {wt:.2f} mm < turning minimum {min_wt:.2f} mm.", measured=wt, threshold=min_wt))
    elif wt < warn_wt:
        results.append(_rule("cnc_turn.wall_thickness", "Minimum wall thickness", "warn",
            f"Wall {wt:.2f} mm is thin.", measured=wt, threshold=warn_wt))
    else:
        results.append(_rule("cnc_turn.wall_thickness", "Minimum wall thickness", "pass",
            f"Wall {wt:.2f} mm ≥ {min_wt:.2f} mm.", measured=wt))

    return _verdict("cnc_turning", results, confidence)


# ── Sheet metal (FORMING) ─────────────────────────────────────────────────────

def _qualify_sheet_metal(features: GeometricFeatures, cfg: dict) -> ProcessVerdict:
    """
    Sheet metal DFM rules.

    Important limitation: a generic solid STEP file cannot represent bend lines,
    flat patterns, or flange geometry.  Rules that require this information
    (bend radius, hole-to-bend distance, flange length) are marked not_applicable
    and note what export format IS needed.  Parts exported from SolidWorks / Inventor
    as sheet-metal bodies (with bend features) would allow these checks.
    """
    results: list[RuleResult] = []

    # ── Plate-like check ──────────────────────────────────────────────────────
    results.append(_check_plate_like(features, "sheet_metal"))

    # ── Sheet thickness ───────────────────────────────────────────────────────
    results.append(_check_sheet_thickness(
        features, "sheet_metal",
        cfg["min_sheet_thickness_mm"], cfg["max_sheet_thickness_mm"],
    ))

    # ── Material allow-list ───────────────────────────────────────────────────
    # (material not in GeometricFeatures — checked at matching time; emit not_applicable)
    results.append(_rule(
        "sheet_metal.material",
        "Material is compatible with sheet metal fabrication",
        "not_applicable",
        "Material compatibility is checked during supplier matching using the "
        "component requirements, not from geometry.",
    ))

    # ── Minimum hole diameter ≥ factor × thickness ────────────────────────────
    if features.plate_like and features.plate_thickness and features.holes:
        factor = cfg["min_hole_diameter_factor"]
        min_dia = features.plate_thickness * factor
        smallest = min(h.diameter for h in features.holes)
        st: RuleStatus = "fail" if smallest < min_dia else "pass"
        results.append(_rule(
            "sheet_metal.hole_diameter",
            "Minimum hole diameter ≥ sheet thickness (punching constraint)",
            st,
            f"Smallest hole ∅{smallest:.2f} mm {'<' if st == 'fail' else '≥'} "
            f"{factor}× thickness {min_dia:.2f} mm.",
            measured=smallest, threshold=min_dia,
        ))
    elif features.plate_like:
        results.append(_rule("sheet_metal.hole_diameter",
            "Minimum hole diameter ≥ sheet thickness", "not_applicable",
            "No holes detected."))

    # ── Bend-specific rules ───────────────────────────────────────────────────
    # These require flat pattern / sheet-metal feature body geometry.
    # A generic STEP solid does not encode bend lines, so we emit not_applicable
    # rather than a fake pass.
    for rule_id, desc in [
        ("sheet_metal.bend_radius",
         "Minimum bend radius ≥ factor × sheet thickness (too tight → cracking)"),
        ("sheet_metal.hole_to_bend",
         "Hole-to-bend distance ≥ factor × sheet thickness (prevents distortion)"),
        ("sheet_metal.flange_length",
         "Flange length ≥ factor × sheet thickness (press-brake formability)"),
    ]:
        results.append(_rule(
            rule_id, desc, "not_applicable",
            "Cannot determine from a generic solid STEP file. Export as a sheet-metal "
            "feature body (SolidWorks/Inventor) for precise bend-aware DFM.",
        ))

    # ── Note: flat pattern is a laser/waterjet job ────────────────────────────
    results.append(_rule(
        "sheet_metal.flat_pattern_note",
        "Flat-pattern cutting step",
        "pass",
        "The flat profile can typically be cut via laser or waterjet "
        "(see those process verdicts). Sheet-metal supplier will confirm and bend.",
    ))

    return _verdict("sheet_metal", results, confidence="medium")


# ── Urethane casting (TOOLED) ─────────────────────────────────────────────────

def _qualify_urethane_casting(
    features: GeometricFeatures,
    cfg: dict,
    requirements: ComponentRequirements | None = None,
) -> ProcessVerdict:
    """
    Urethane casting (soft-tooling) DFM rules.

    Silicone molds are more forgiving than hard tooling:
    - Undercuts: silicone peels off flexibly → warn only (not fail)
    - Draft: recommended but not mandatory → warn only
    - Wall thickness minimum is lower than hard tooling but not zero

    Limitation: draft angle and undercut detection from arbitrary BREP is best-effort.
    Confidence stays at "medium" pending OCC feature extraction.
    """
    results: list[RuleResult] = []
    confidence = "medium"

    # ── Build volume ──────────────────────────────────────────────────────────
    bb = features.bounding_box
    max_vol = cfg["max_build_volume_mm"]
    if not bb.fits_inside(tuple(max_vol)):
        results.append(_rule(
            "urethane.build_volume", "Part fits within mold frame size",
            "fail",
            f"Part {bb.x:.0f}×{bb.y:.0f}×{bb.z:.0f} mm exceeds mold frame "
            f"{max_vol[0]:.0f}×{max_vol[1]:.0f}×{max_vol[2]:.0f} mm.",
            measured=max(bb.x, bb.y, bb.z), threshold=max(max_vol),
        ))
    else:
        results.append(_rule("urethane.build_volume", "Part fits within mold frame size",
            "pass", f"Part {bb.x:.0f}×{bb.y:.0f}×{bb.z:.0f} mm fits."))

    # ── Wall thickness ────────────────────────────────────────────────────────
    wt = features.min_wall_thickness
    min_wt = cfg["min_wall_thickness_mm"]
    warn_wt = cfg["warn_wall_thickness_mm"]
    if wt < min_wt:
        results.append(_rule("urethane.wall_thickness", "Minimum wall thickness", "fail",
            f"Wall {wt:.2f} mm < urethane casting minimum {min_wt:.2f} mm. "
            "Very thin walls may not fill completely.",
            measured=wt, threshold=min_wt))
    elif wt < warn_wt:
        results.append(_rule("urethane.wall_thickness", "Minimum wall thickness", "warn",
            f"Wall {wt:.2f} mm is thin (warn threshold {warn_wt:.2f} mm). "
            "Consider thickening to improve fill.",
            measured=wt, threshold=warn_wt))
    else:
        results.append(_rule("urethane.wall_thickness", "Minimum wall thickness", "pass",
            f"Wall {wt:.2f} mm ≥ {min_wt:.2f} mm.", measured=wt))

    # ── Draft ─────────────────────────────────────────────────────────────────
    # Draft detection from generic BREP is unreliable; always warn.
    results.append(_rule(
        "urethane.draft",
        "Draft angle recommended for easy mold release",
        "warn",
        f"Draft ≥ {cfg['draft_angle_warn_deg']}° on vertical walls is recommended "
        "to aid silicone mold release. Detection from generic STEP is heuristic — "
        "verify in CAD before tooling.",
    ))

    # ── Undercuts ─────────────────────────────────────────────────────────────
    # Silicone molds flex during demolding, so mild undercuts are acceptable.
    # Warn rather than fail; confidence stays low.
    if features.has_undercuts is True:
        results.append(_rule(
            "urethane.undercuts", "Undercuts (silicone mold flexibility)",
            "warn",
            "Undercuts detected. Silicone molds can accommodate mild undercuts by "
            "flexing during demolding. Verify severity with tooling supplier.",
        ))
    elif features.has_undercuts is None:
        results.append(_rule(
            "urethane.undercuts", "Undercuts (silicone mold flexibility)",
            "warn",
            f"Undercut presence is uncertain (confidence: {features.undercut_confidence}). "
            "Silicone molds handle mild undercuts; review complex geometry with supplier.",
        ))
        confidence = "low"
    else:
        results.append(_rule("urethane.undercuts", "Undercuts",
            "pass", "No undercuts detected."))

    verdict = _verdict("urethane_casting", results, confidence)

    # ── Tooling info (TOOLED-category metadata) ───────────────────────────────
    quantity = requirements.quantity if requirements else 1
    eco_max = cfg.get("economic_max_quantity", 50)
    economic = quantity <= eco_max
    verdict.tooling_info = ToolingInfo(
        requires_tooling=True,
        estimated_tooling_lead_time_days=cfg.get("tooling_lead_time_days_typical", 7),
        min_order_quantity=1,
        tooling_cost_signal=cfg.get("tooling_cost_signal_inr", "₹5,000 – ₹25,000"),
        economic_at_requested_quantity=economic,
        notes=(
            f"Silicone mold cast from a master pattern. Tooling lead time ≈ "
            f"{cfg.get('tooling_lead_time_days_typical', 7)} days. MOQ ≥ 1. "
            f"Economic up to ~{eco_max} parts per run."
            + (
                f" At {quantity} units, per-part cost becomes high relative to tooling "
                f"amortisation. Hard tooling may eventually be more cost-effective at "
                f"sustained volumes above ~{eco_max} units."
                if not economic else ""
            )
        ),
    )
    return verdict


# ── Private helpers ───────────────────────────────────────────────────────────

def _looks_rotationally_symmetric(features: GeometricFeatures) -> bool:
    fc = features.face_classification
    return fc.total > 0 and (fc.cylindrical / fc.total) > 0.4
