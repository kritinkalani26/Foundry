"""
Stage 3 — Supplier Matching.

Strictly separated from DFM qualification: takes ProcessVerdicts (already computed)
plus ComponentRequirements, filters suppliers by hard constraints, then ranks by
a transparent weighted score.

Scoring is configurable via config/scoring.yaml — change weights without code changes.
"""

from __future__ import annotations
import os
from functools import lru_cache
from typing import Any

import yaml

from .models import (
    BoundingBox, ComponentRequirements, ProcessVerdict,
    RankedSupplier, RankedSuppliers, SupplierCapability,
    TOLERANCE_RANK,
)

_SCORING_PATH = os.path.join(os.path.dirname(__file__), "config", "scoring.yaml")


@lru_cache(maxsize=1)
def _load_scoring_config() -> dict[str, Any]:
    with open(_SCORING_PATH, "r") as f:
        return yaml.safe_load(f)


# ── Public entry point ────────────────────────────────────────────────────────

def match_suppliers(
    verdicts: list[ProcessVerdict],
    requirements: ComponentRequirements,
    bounding_box: BoundingBox,
    supplier_pool: list[SupplierCapability],
) -> RankedSuppliers:
    """
    For each viable process (manufacturable == True), filter and rank suppliers.
    Returns a RankedSuppliers with all viable matches and a gap list for
    processes that are manufacturable but have no supplier.
    """
    cfg = _load_scoring_config()
    viable_processes = [v.process for v in verdicts if v.manufacturable]

    ranked: list[RankedSupplier] = []
    no_supplier_gap: list[str] = []

    for process in viable_processes:
        candidates = [s for s in supplier_pool if s.process == process]
        passing, _ = _filter(candidates, process, requirements, bounding_box)

        if not passing:
            no_supplier_gap.append(process)
            continue

        scored = [
            _rank(supplier, requirements, cfg)
            for supplier in passing
        ]
        scored.sort(key=lambda x: x.score, reverse=True)
        ranked.extend(scored)

    # Sort overall by score descending
    ranked.sort(key=lambda x: x.score, reverse=True)

    return RankedSuppliers(ranked=ranked, no_supplier_gap=no_supplier_gap)


# ── Filter (hard constraints) ─────────────────────────────────────────────────

def _filter(
    suppliers: list[SupplierCapability],
    process: str,
    requirements: ComponentRequirements,
    bounding_box: BoundingBox,
) -> tuple[list[SupplierCapability], list[tuple[SupplierCapability, str]]]:
    passing: list[SupplierCapability] = []
    rejected: list[tuple[SupplierCapability, str]] = []

    req_tol_rank = TOLERANCE_RANK.get(requirements.tolerance_class, 0)

    for supplier in suppliers:
        reason = _hard_reject_reason(supplier, process, requirements, bounding_box, req_tol_rank)
        if reason:
            rejected.append((supplier, reason))
        else:
            passing.append(supplier)

    return passing, rejected


def _hard_reject_reason(
    supplier: SupplierCapability,
    process: str,
    requirements: ComponentRequirements,
    bounding_box: BoundingBox,
    req_tol_rank: int,
) -> str | None:
    """Return a rejection reason string, or None if supplier passes all hard filters."""

    if supplier.process != process:
        return f"Supplier does not offer process '{process}'"

    # Capacity
    if supplier.capacity_status == "full":
        return "Supplier is at full capacity"

    # Material
    mat_lower = requirements.material.lower()
    supplier_mats = [m.lower() for m in supplier.materials]
    if not any(mat_lower in sm or sm in mat_lower for sm in supplier_mats):
        return f"Supplier does not work with material '{requirements.material}'"

    # Work envelope
    if not bounding_box.fits_inside(supplier.work_envelope_mm):
        return (
            f"Part {bounding_box.x:.0f}×{bounding_box.y:.0f}×{bounding_box.z:.0f} mm "
            f"exceeds supplier work envelope "
            f"{supplier.work_envelope_mm[0]:.0f}×"
            f"{supplier.work_envelope_mm[1]:.0f}×"
            f"{supplier.work_envelope_mm[2]:.0f} mm"
        )

    # Tolerance
    sup_tol_rank = TOLERANCE_RANK.get(supplier.min_tolerance_class, 0)
    if sup_tol_rank < req_tol_rank:
        return (
            f"Supplier tolerance class '{supplier.min_tolerance_class}' "
            f"cannot meet required '{requirements.tolerance_class}'"
        )

    # ── Sheet-metal-specific checks ───────────────────────────────────────────
    if process == "sheet_metal":
        # Smallest dimension of the part is the sheet thickness
        part_t = min(bounding_box.x, bounding_box.y, bounding_box.z)
        if supplier.max_sheet_thickness_mm is not None and part_t > supplier.max_sheet_thickness_mm:
            return (
                f"Sheet thickness {part_t:.1f} mm exceeds supplier's press-brake capacity "
                f"({supplier.max_sheet_thickness_mm:.1f} mm max)"
            )

    # ── Urethane-casting-specific checks ──────────────────────────────────────
    if process == "urethane_casting":
        if not supplier.can_build_silicone_tooling:
            return "Supplier cannot build silicone molds (required for urethane casting)"
        if supplier.max_cast_part_size_mm is not None:
            if not bounding_box.fits_inside(supplier.max_cast_part_size_mm):
                return (
                    f"Part {bounding_box.x:.0f}×{bounding_box.y:.0f}×{bounding_box.z:.0f} mm "
                    f"exceeds supplier mold frame "
                    f"{supplier.max_cast_part_size_mm[0]:.0f}×"
                    f"{supplier.max_cast_part_size_mm[1]:.0f}×"
                    f"{supplier.max_cast_part_size_mm[2]:.0f} mm"
                )
        if supplier.supported_moq_range is not None:
            qty = requirements.quantity
            moq_min, moq_max = supplier.supported_moq_range
            if qty < moq_min:
                return f"Requested quantity {qty} is below supplier MOQ {moq_min}"
            if qty > moq_max:
                return (
                    f"Requested quantity {qty} exceeds supplier's urethane run limit {moq_max}. "
                    "Consider hard tooling for higher volumes."
                )

    return None


# ── Rank (soft scoring) ───────────────────────────────────────────────────────

def _rank(
    supplier: SupplierCapability,
    requirements: ComponentRequirements,
    cfg: dict,
) -> RankedSupplier:
    weights: dict[str, float] = cfg["weights"]

    # Lead-time score: lower is better
    lt_best  = cfg["lead_time_best_days"]
    lt_worst = cfg["lead_time_worst_days"]
    lt_score = _normalise_inverse(supplier.lead_time_days, lt_best, lt_worst)

    # Location score: same region → 1.0, different → 0.0
    loc_score = 1.0 if supplier.location_region == cfg.get("requester_region", "") else 0.0

    # Capacity score: available=1.0, limited=0.5, full excluded by filter
    cap_score = {"available": 1.0, "limited": 0.5, "full": 0.0}.get(
        supplier.capacity_status, 0.0
    )

    # Cost score: lower base cost → higher score
    cost_best  = cfg["cost_best_inr_per_hr"]
    cost_worst = cfg["cost_worst_inr_per_hr"]
    cost = supplier.base_cost_per_hour if supplier.base_cost_per_hour is not None else cost_worst
    cost_score = _normalise_inverse(cost, cost_best, cost_worst)

    # Certification score: more certs → higher score (capped at 1.0)
    cert_score = min(1.0, len(supplier.certifications) / 3.0)

    components = {
        "lead_time":    lt_score   * weights.get("lead_time", 0.25),
        "location":     loc_score  * weights.get("location", 0.20),
        "capacity":     cap_score  * weights.get("capacity", 0.20),
        "cost":         cost_score * weights.get("cost", 0.25),
        "certification": cert_score * weights.get("certification", 0.10),
    }
    total_score = sum(components.values())

    why = []
    if loc_score == 1.0:
        why.append(f"Same region ({supplier.location_region})")
    if supplier.capacity_status == "available":
        why.append("Capacity available")
    if supplier.lead_time_days <= cfg["lead_time_best_days"]:
        why.append(f"Fast lead time ({supplier.lead_time_days} days)")
    if supplier.certifications:
        why.append(f"Certified: {', '.join(supplier.certifications)}")

    return RankedSupplier(
        supplier=supplier,
        process=supplier.process,
        score=round(total_score, 4),
        score_components={k: round(v, 4) for k, v in components.items()},
        why_included=why or ["Passes all hard filters"],
    )


def _normalise_inverse(value: float, best: float, worst: float) -> float:
    """Linear normalisation where best → 1.0, worst → 0.0."""
    if worst == best:
        return 1.0
    clamped = max(best, min(worst, value))
    return 1.0 - (clamped - best) / (worst - best)
