"""
dfm_engine — DFM Qualification & Supplier Matching for Foundry.

Public API:
    analyze_component(step_path, requirements, supplier_pool, explain=True)
    analyze_assembly(components, supplier_pool, explain=True)

Stages are kept strictly separate:
    1. extraction.py — geometry → GeometricFeatures
    2. rules.py      — features → ProcessVerdicts (deterministic, no LLM)
    3. matching.py   — verdicts + requirements → RankedSuppliers
    4. explain.py    — structured findings → human-readable text (LLM)
"""

from __future__ import annotations

from .models import (
    AssemblyRollup, BoundingBox, ComponentAnalysis, ComponentRequirements,
    FaceClassification, GeometricFeatures, HoleFeature,
    PROCESS_CATEGORY, ProcessCategory, ProcessVerdict,
    RankedSupplier, RankedSuppliers, RuleResult,
    SupplierCapability, ToolingInfo,
)
from .extraction import FeatureExtractor, OCCFeatureExtractor
from .rules import qualify_all, qualify_process
from .matching import match_suppliers
from .explain import explain_component


def analyze_component(
    step_path: str,
    requirements: ComponentRequirements,
    supplier_pool: list[SupplierCapability],
    *,
    extractor: FeatureExtractor | None = None,
    explain: bool = True,
) -> ComponentAnalysis:
    """
    Full pipeline for one component: extract → qualify → match → explain.

    Args:
        step_path:     Path to the STEP file.
        requirements:  Material, tolerance, quantity, etc.
        supplier_pool: All suppliers to consider (pre-loaded from DB or fixture).
        extractor:     Override the feature extractor (useful for testing).
        explain:       Whether to call Claude for the explanation (adds latency).

    Returns:
        ComponentAnalysis — JSON-serializable, consumed by the order flow and
        the Build-It feature.
    """
    feat_extractor = extractor or OCCFeatureExtractor()
    features  = feat_extractor.extract(step_path)
    verdicts  = qualify_all(features)
    suppliers = match_suppliers(verdicts, requirements, features.bounding_box, supplier_pool)

    analysis = ComponentAnalysis(
        step_path=step_path,
        requirements=requirements,
        features=features,
        verdicts=verdicts,
        suppliers=suppliers,
        explanation=None,
    )

    if explain:
        analysis.explanation = explain_component(analysis)

    return analysis


def analyze_assembly(
    components: list[tuple[str, ComponentRequirements]],
    supplier_pool: list[SupplierCapability],
    *,
    extractor: FeatureExtractor | None = None,
    explain: bool = True,
) -> AssemblyRollup:
    """
    Run analyze_component for each (step_path, requirements) pair and return
    an assembly-level rollup.

    network_gap_components lists step paths where at least one viable process
    has no supplier match — a real signal for marketplace coverage gaps.
    """
    results: list[ComponentAnalysis] = []
    for step_path, req in components:
        result = analyze_component(
            step_path, req, supplier_pool,
            extractor=extractor, explain=explain,
        )
        results.append(result)

    manufacturable_count = sum(1 for r in results if r.manufacturable_by())
    gap_paths = [
        r.step_path for r in results if r.suppliers.no_supplier_gap
    ]

    return AssemblyRollup(
        total_components=len(results),
        manufacturable_count=manufacturable_count,
        network_gap_components=gap_paths,
        components=results,
    )


__all__ = [
    "analyze_component",
    "analyze_assembly",
    # models
    "ComponentAnalysis",
    "ComponentRequirements",
    "AssemblyRollup",
    "GeometricFeatures",
    "BoundingBox",
    "HoleFeature",
    "FaceClassification",
    "PROCESS_CATEGORY",
    "ProcessCategory",
    "ProcessVerdict",
    "RuleResult",
    "RankedSupplier",
    "RankedSuppliers",
    "SupplierCapability",
    "ToolingInfo",
    # interfaces
    "FeatureExtractor",
    "OCCFeatureExtractor",
    # rules
    "qualify_all",
    "qualify_process",
]
