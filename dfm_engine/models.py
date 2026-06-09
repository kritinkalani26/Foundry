"""Shared dataclasses for the DFM pipeline. All lengths in mm, volumes in mm³."""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Literal


# ── Process taxonomy ──────────────────────────────────────────────────────────

class ProcessCategory(Enum):
    DIRECT  = "direct"   # 3D print, CNC, waterjet, laser — no mold/tooling
    FORMING = "forming"  # sheet metal — cutting + bending from flat stock
    TOOLED  = "tooled"   # urethane casting (now); die/injection/compression (later)


ProcessName = Literal[
    # DIRECT
    "fdm_3dprint", "sla_3dprint",
    "cnc_milling", "cnc_turning",
    "waterjet", "laser_cut",
    # FORMING
    "sheet_metal",
    # TOOLED  — add future hard-tooled processes here when offered
    "urethane_casting",
]

PROCESS_CATEGORY: dict[str, ProcessCategory] = {
    "fdm_3dprint":      ProcessCategory.DIRECT,
    "sla_3dprint":      ProcessCategory.DIRECT,
    "cnc_milling":      ProcessCategory.DIRECT,
    "cnc_turning":      ProcessCategory.DIRECT,
    "waterjet":         ProcessCategory.DIRECT,
    "laser_cut":        ProcessCategory.DIRECT,
    "sheet_metal":      ProcessCategory.FORMING,
    "urethane_casting": ProcessCategory.TOOLED,
    # Extension point: register new TOOLED processes here.
    # "die_casting":       ProcessCategory.TOOLED,       # TODO — not offered yet
    # "injection_molding": ProcessCategory.TOOLED,       # TODO — not offered yet
    # "compression_molding": ProcessCategory.TOOLED,     # TODO — not offered yet
}


# ── Stage 1 output ────────────────────────────────────────────────────────────

@dataclass
class BoundingBox:
    x: float  # mm
    y: float  # mm
    z: float  # mm

    def fits_inside(self, envelope: tuple[float, float, float]) -> bool:
        """True if this box fits (in any axis permutation) inside the given envelope."""
        dims = sorted([self.x, self.y, self.z])
        env  = sorted(envelope)
        return all(d <= e for d, e in zip(dims, env))


@dataclass
class HoleFeature:
    diameter: float
    depth: float
    axis: tuple[float, float, float]
    depth_to_diameter_ratio: float


@dataclass
class FaceClassification:
    planar: int
    cylindrical: int
    conical: int
    freeform: int

    @property
    def total(self) -> int:
        return self.planar + self.cylindrical + self.conical + self.freeform

    @property
    def fraction_planar(self) -> float:
        return self.planar / self.total if self.total else 0.0


@dataclass
class GeometricFeatures:
    bounding_box: BoundingBox
    volume: float
    surface_area: float
    min_wall_thickness: float
    min_wall_thickness_confidence: Literal["high", "medium", "low"]
    holes: list[HoleFeature]
    min_internal_corner_radius: float | None
    face_classification: FaceClassification
    plate_like: bool
    plate_thickness: float | None
    has_undercuts: bool | None              # None = uncertain
    undercut_confidence: Literal["high", "medium", "low"]


# ── Stage 2 output ────────────────────────────────────────────────────────────

RuleStatus = Literal["pass", "fail", "warn", "not_applicable"]


@dataclass
class RuleResult:
    rule_id: str
    description: str
    status: RuleStatus
    detail: str
    measured_value: float | None
    threshold: float | None


@dataclass
class ToolingInfo:
    """Carried by TOOLED-category verdicts. Designed to also represent future
    hard-tooled processes — add higher thresholds for those via config."""
    requires_tooling: bool
    estimated_tooling_lead_time_days: int | None
    min_order_quantity: int | None
    tooling_cost_signal: str | None          # indicative range, not a hard quote
    economic_at_requested_quantity: bool
    notes: str


@dataclass
class ProcessVerdict:
    process: str                             # one of ProcessName
    manufacturable: bool
    results: list[RuleResult]
    blocking_reasons: list[str]
    confidence: Literal["high", "medium", "low"]
    tooling_info: ToolingInfo | None = None  # set for TOOLED processes, None otherwise


# ── Stage 3 input / output ────────────────────────────────────────────────────

TOLERANCE_RANK: dict[str, int] = {
    "rough": 0,
    "medium": 1,
    "fine": 2,
    "precision": 3,
}


@dataclass
class ComponentRequirements:
    material: str
    tolerance_class: Literal["rough", "medium", "fine", "precision"]
    quantity: int
    preferred_processes: list[str] | None = None


@dataclass
class SupplierCapability:
    # ── Core fields (all processes) ───────────────────────────────────────────
    supplier_id: str
    process: str
    materials: list[str]
    work_envelope_mm: tuple[float, float, float]
    min_tolerance_class: str
    certifications: list[str]
    capacity_status: Literal["available", "limited", "full"]
    location_region: str
    lead_time_days: int
    base_cost_per_hour: float | None = None

    # ── Sheet metal (FORMING) fields ──────────────────────────────────────────
    max_sheet_thickness_mm: float | None = None
    max_bend_length_mm: float | None = None
    press_brake_tonnage: float | None = None
    welding_capable: bool = False
    forming_operations: list[str] = field(default_factory=list)
    # e.g. ["bending", "punching", "shearing", "welding", "powder_coating"]

    # ── Urethane casting (TOOLED) fields ──────────────────────────────────────
    can_build_silicone_tooling: bool = False
    max_cast_part_size_mm: tuple[float, float, float] | None = None
    supported_moq_range: tuple[int, int] | None = None  # (min, max) inclusive
    typical_tooling_lead_time_days: int | None = None
    # materials field covers PU resin types / shore hardness ranges

    # Extension point: add hard-tooled fields here when those processes are offered.
    # e.g. clamp_force_tons, shot_size_cc, mold_cavity_count for injection molding.


@dataclass
class RankedSupplier:
    supplier: SupplierCapability
    process: str
    score: float
    score_components: dict[str, float]
    why_included: list[str]


@dataclass
class RankedSuppliers:
    ranked: list[RankedSupplier]
    no_supplier_gap: list[str]


# ── Final output ──────────────────────────────────────────────────────────────

@dataclass
class ComponentAnalysis:
    step_path: str
    requirements: ComponentRequirements
    features: GeometricFeatures
    verdicts: list[ProcessVerdict]
    suppliers: RankedSuppliers
    explanation: str | None = None

    def manufacturable_by(self) -> list[str]:
        return [v.process for v in self.verdicts if v.manufacturable]

    def tooled_verdicts(self) -> list[ProcessVerdict]:
        return [v for v in self.verdicts
                if PROCESS_CATEGORY.get(v.process) == ProcessCategory.TOOLED]


@dataclass
class AssemblyRollup:
    total_components: int
    manufacturable_count: int
    network_gap_components: list[str]
    components: list[ComponentAnalysis]
    tooled_components: list[str] = field(default_factory=list)
    longest_lead_time_days: int | None = None
    longest_lead_time_component: str | None = None
