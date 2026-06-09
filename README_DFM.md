# DFM Engine — Design for Manufacturability & Supplier Matching

Backend module for Foundry's fabrication pipeline. Accepts STEP files, evaluates
manufacturability per process, matches qualified suppliers, and generates a
plain-English summary via Claude.

---

## Install

### Python environment

Python 3.11+ required.

```bash
pip install pyyaml anthropic
```

### pythonocc-core (OpenCASCADE bindings)

**pip wheels are unreliable — use conda:**

```bash
conda install -c conda-forge pythonocc-core
```

This installs the OpenCASCADE geometry kernel used for STEP parsing and feature
extraction. Without it, Stages 2–4 (rules, matching, explanation) still work and
are unit-testable using mocked geometry.

### Environment variable

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # for Stage 4 (explanation)
```

---

## Usage

```python
from dfm_engine import analyze_component, analyze_assembly
from dfm_engine.models import ComponentRequirements, SupplierCapability

requirements = ComponentRequirements(
    material="aluminium",
    tolerance_class="medium",  # rough | medium | fine | precision
    quantity=10,
)

# Load your supplier pool from the database
suppliers: list[SupplierCapability] = load_suppliers_from_db()

# Single component
analysis = analyze_component("path/to/part.step", requirements, suppliers)
print(analysis.explanation)
print(analysis.manufacturable_by())   # ["cnc_milling", "fdm_3dprint"]

# Whole assembly
from dfm_engine import analyze_assembly
rollup = analyze_assembly(
    [("part1.step", req1), ("part2.step", req2)],
    suppliers,
)
print(f"{rollup.manufacturable_count}/{rollup.total_components} parts manufacturable")
print("Network gaps (no supplier):", rollup.network_gap_components)
```

---

## Architecture

Four strictly-separated stages. Data flows one direction only.

```
STEP file ──▶ [1. Feature Extraction] ──▶ GeometricFeatures
                                                │
                                                ▼
                            [2. Process Qualification] ──▶ ProcessVerdicts
                                     (deterministic)
                                                │
                                                ▼
                component requirements ──▶ [3. Supplier Matching] ──▶ RankedSuppliers
                                                │
                                                ▼
                                [4. LLM Explanation] ──▶ explanation: str
```

| Module | Input | Output | LLM? |
|---|---|---|---|
| `extraction.py` | STEP file path | `GeometricFeatures` | No |
| `rules.py` | `GeometricFeatures` | `list[ProcessVerdict]` | **Never** |
| `matching.py` | `ProcessVerdicts` + requirements | `RankedSuppliers` | No |
| `explain.py` | `ComponentAnalysis` | `str` | Yes (Claude) |

**Critical:** the LLM (Stage 4) receives only structured findings and is
instructed never to contradict them. If a verdict says `manufacturable: False`,
the explanation says so — the model cannot argue otherwise.

---

## Rule configuration

DFM thresholds live in `dfm_engine/config/rules.yaml`. No code changes needed
to tune them:

```yaml
cnc_milling:
  min_internal_corner_radius_mm: 1.0   # change this to update the rule
  max_hole_depth_to_diameter: 10.0
  min_wall_thickness_mm: 0.75
  ...
```

Supplier ranking weights are in `dfm_engine/config/scoring.yaml`:

```yaml
weights:
  lead_time: 0.25
  location: 0.20
  capacity: 0.20
  cost: 0.25
  certification: 0.10
```

---

## Known limitations (be honest with users)

### Wall thickness (Stage 1)
Approximated by ray-casting inward from the bounding-box face centres.
- **Reliable for:** thin-walled shells, plates, brackets.
- **Unreliable for:** complex hollow parts, parts with internal pockets not visible
  from the bounding-box faces.
- Confidence reported as `"medium"` for all parts (not `"high"`).
- TODO: replace with medial-axis or section-based analysis for better accuracy.

### Undercut / tool-accessibility (Stage 1)
3-axis heuristic only: checks face normal Z-components and freeform-face presence.
- Reports `None` (uncertain) for non-trivial shapes, not a definitive answer.
- For parts with freeform or conical faces, confidence = `"low"`.
- TODO: implement silhouette-curve analysis or voxel-based machining simulation
  for reliable 5-axis undercut detection.

### Bounding box (Stage 1)
Axis-aligned bounding box (AABB). For diagonal parts, this overestimates size
and may incorrectly reject suppliers with sufficient work envelopes.
- TODO: replace with oriented bounding box (OBB) using PCA on vertex positions.

### CNC turning symmetry
Detected via face-type ratio heuristic (cylindrical face fraction > 40%).
Will miss eccentric or off-axis turned features.

### Overhang detection (FDM/SLA)
Rule fires as a `warn` for all parts; no per-face angle analysis is performed.
Slicers (Cura, PrusaSlicer) give definitive support estimates — treat this as
a reminder, not a verdict.

---

## Adding a new rule

1. Add the threshold to `dfm_engine/config/rules.yaml` under the relevant process.
2. In `dfm_engine/rules.py`, add a `_rule(...)` call in the appropriate `_qualify_*`
   function, referencing the new config key.
3. Add a unit test in `tests/test_rules.py` covering pass and fail cases.

---

## Plugging into the Foundry Build-It flow

TODO: expose as a FastAPI endpoint or call via `subprocess` from the Next.js
`analyze-assembly` route (similar to how `step-to-obj.js` is called via
`spawnSync`). The `ComponentAnalysis` dataclass is JSON-serializable via
`dataclasses.asdict()`.

Example integration sketch (Python FastAPI):

```python
from fastapi import FastAPI, UploadFile
from dfm_engine import analyze_component
from dfm_engine.models import ComponentRequirements
import tempfile, shutil

app = FastAPI()

@app.post("/api/dfm-analyze")
async def dfm_analyze(file: UploadFile, material: str, tolerance: str, qty: int):
    with tempfile.NamedTemporaryFile(suffix=".step", delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    requirements = ComponentRequirements(material=material, tolerance_class=tolerance, quantity=qty)
    suppliers = load_suppliers()  # from your DB
    analysis = analyze_component(tmp_path, requirements, suppliers)
    return dataclasses.asdict(analysis)
```

---

## Running tests

```bash
# Unit tests only (no OCC needed)
pytest tests/test_rules.py tests/test_matching.py tests/test_explain.py -v

# Integration tests (requires pythonocc-core + fixture STEP files)
pytest tests/integration/ -v
```
