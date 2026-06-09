"""
Stage 4 — LLM Explanation.

Translates structured Stage-2/3 findings into human-readable summaries via the
Claude API.  The LLM sees only the deterministic outputs and is instructed never
to override them.  All verdicts come from the rules engine — the model explains,
it does not adjudicate.
"""

from __future__ import annotations
import json
import os
from dataclasses import asdict
from typing import Any

from .models import (
    ComponentAnalysis, GeometricFeatures, ProcessVerdict, RankedSuppliers,
    PROCESS_CATEGORY, ProcessCategory,
)


def explain_component(analysis: ComponentAnalysis) -> str:
    """
    Call Claude to produce a plain-English summary of the DFM findings.
    Returns the explanation string.  On API error, returns a fallback message
    so the rest of the pipeline is not blocked.
    """
    try:
        import anthropic
    except ImportError:
        return _fallback_explanation(analysis)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback_explanation(analysis)

    client = anthropic.Anthropic(api_key=api_key)
    prompt = _build_prompt(analysis)

    try:
        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception as exc:
        return f"[Explanation unavailable: {exc}]\n\n{_fallback_explanation(analysis)}"


def _build_prompt(analysis: ComponentAnalysis) -> str:
    """
    Build a prompt that gives Claude the structured findings and instructs it to
    explain only what is in them.  The LLM must never override a deterministic
    verdict — if manufacturable is False, the explanation must say so.
    """
    # Serialise only what the model needs — keep prompt tight
    verdicts_summary = _serialise_verdicts(analysis.verdicts)
    suppliers_summary = _serialise_suppliers(analysis.suppliers)
    features_summary = _serialise_features(analysis.features)

    has_tooled = any(
        PROCESS_CATEGORY.get(v.process) == ProcessCategory.TOOLED
        for v in analysis.verdicts
        if v.manufacturable
    )
    tooled_note = ""
    if has_tooled:
        tooled_note = """
TOOLED PROCESS NOTE (urethane casting):
- If urethane casting passes, explain that it uses a SILICONE mold (not a steel die).
- Describe silicone molds as "soft tooling" — fast to make (≈1 week), low cost, great for
  prototypes and small runs (up to ~50 parts).
- Include the indicative tooling cost signal and lead time if provided in the tooling_info.
- Do NOT mention die casting, injection molding, or compression molding as alternatives
  available on Foundry — those are not currently offered.
"""

    return f"""You are a manufacturing engineer assistant for Foundry, an Indian fabrication marketplace.
Your job is to explain DFM (Design for Manufacturability) findings to the part's designer.

IMPORTANT RULES:
1. You MUST base your explanation solely on the structured findings below. Do not invent constraints.
2. You MUST NOT contradict any verdict. If manufacturable is false, say so clearly.
3. Be concise (3-6 sentences per process), friendly, and actionable.
4. Recommend specific design changes where the structured data gives a measured failure.
5. If a process passes, confirm it and note any warnings.
6. Do not mention the internal rule IDs (e.g. "cnc_mill.corner_radius") — use plain language.
{tooled_note}
--- PART GEOMETRY ---
{features_summary}

--- DFM VERDICTS (deterministic, do not override) ---
{verdicts_summary}

--- SUPPLIER MATCHING ---
{suppliers_summary}

Write a clear summary for the designer covering:
1. Which processes are viable and why.
2. Which processes have failures and exactly what needs to change (cite measured vs. required values).
3. Top 1-2 recommended supplier(s) if any matched, and why they ranked highest.
4. Any network gaps (viable processes with no available supplier).
5. For TOOLED processes: explain the tooling model (silicone mold), cost signal, lead time, and
   whether the requested quantity is economically viable.

Keep the tone professional but approachable. Use bullet points for failure reasons."""


def _serialise_verdicts(verdicts: list[ProcessVerdict]) -> str:
    lines: list[str] = []
    for v in verdicts:
        lines.append(f"\nProcess: {v.process}")
        lines.append(f"  Manufacturable: {v.manufacturable}")
        lines.append(f"  Confidence: {v.confidence}")
        if v.blocking_reasons:
            lines.append(f"  Blocking failures:")
            for r in v.blocking_reasons:
                lines.append(f"    - {r}")
        warns = [r for r in v.results if r.status == "warn"]
        if warns:
            lines.append(f"  Warnings:")
            for w in warns:
                lines.append(f"    - {w.detail}")
        if v.tooling_info is not None:
            ti = v.tooling_info
            lines.append(f"  Tooling info (soft tooling):")
            lines.append(f"    Lead time: {ti.estimated_tooling_lead_time_days} days")
            lines.append(f"    MOQ: {ti.min_order_quantity}")
            lines.append(f"    Cost signal: {ti.tooling_cost_signal}")
            lines.append(f"    Economic at requested quantity: {ti.economic_at_requested_quantity}")
            lines.append(f"    Notes: {ti.notes}")
    return "\n".join(lines)


def _serialise_suppliers(suppliers: RankedSuppliers) -> str:
    lines: list[str] = []
    if suppliers.no_supplier_gap:
        lines.append(f"Network gaps (no supplier available): {', '.join(suppliers.no_supplier_gap)}")
    if not suppliers.ranked:
        lines.append("No suppliers matched.")
    else:
        lines.append(f"Top {min(3, len(suppliers.ranked))} ranked suppliers:")
        for rs in suppliers.ranked[:3]:
            lines.append(
                f"  - {rs.supplier.supplier_id} | process={rs.process} | "
                f"score={rs.score:.2f} | lead={rs.supplier.lead_time_days}d | "
                f"region={rs.supplier.location_region} | {', '.join(rs.why_included)}"
            )
    return "\n".join(lines)


def _serialise_features(features: GeometricFeatures) -> str:
    bb = features.bounding_box
    return (
        f"Bounding box: {bb.x:.1f}×{bb.y:.1f}×{bb.z:.1f} mm  |  "
        f"Volume: {features.volume:.1f} mm³  |  "
        f"Min wall: {features.min_wall_thickness:.2f} mm ({features.min_wall_thickness_confidence} confidence)  |  "
        f"Plate-like: {features.plate_like}"
        + (f" (t={features.plate_thickness:.2f} mm)" if features.plate_thickness else "")
        + f"  |  Holes: {len(features.holes)}"
        + (f"  |  Min internal radius: {features.min_internal_corner_radius:.2f} mm"
           if features.min_internal_corner_radius is not None else "")
    )


def _fallback_explanation(analysis: ComponentAnalysis) -> str:
    """Plain-text summary when the API is unavailable."""
    viable = [v.process for v in analysis.verdicts if v.manufacturable]
    blocked = [(v.process, v.blocking_reasons) for v in analysis.verdicts if not v.manufacturable]
    lines = [f"DFM Summary for {os.path.basename(analysis.step_path)}"]
    if viable:
        lines.append(f"Viable processes: {', '.join(viable)}")
    for proc, reasons in blocked:
        lines.append(f"{proc}: NOT manufacturable — {'; '.join(reasons)}")
    if analysis.suppliers.no_supplier_gap:
        lines.append(f"No suppliers found for: {', '.join(analysis.suppliers.no_supplier_gap)}")
    return "\n".join(lines)
