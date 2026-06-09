"""
Integration tests for Stage 1 (Feature Extraction with OpenCASCADE).

These tests are skipped if pythonocc-core is not installed.
Place real STEP files in tests/fixtures/ to run them.

To run integration tests:
    conda activate your-env  # must have pythonocc-core
    pytest tests/integration/ -v
"""

import os
import pytest

try:
    from OCC.Core.STEPControl import STEPControl_Reader
    OCC_AVAILABLE = True
except ImportError:
    OCC_AVAILABLE = False

pytestmark = pytest.mark.skipif(
    not OCC_AVAILABLE,
    reason="pythonocc-core not installed — skipping OCC integration tests",
)

FIXTURES = os.path.join(os.path.dirname(__file__), "..", "fixtures")


def fixture_path(name: str) -> str:
    return os.path.join(FIXTURES, name)


def fixture_exists(name: str) -> bool:
    return os.path.isfile(fixture_path(name))


@pytest.mark.skipif(not fixture_exists("flat_plate.step"), reason="flat_plate.step not in fixtures/")
def test_flat_plate_extraction():
    from dfm_engine.extraction import OCCFeatureExtractor
    extractor = OCCFeatureExtractor()
    features = extractor.extract(fixture_path("flat_plate.step"))

    assert features.plate_like, "Expected flat plate to be detected as plate-like"
    assert features.plate_thickness is not None
    assert features.bounding_box.z < features.bounding_box.x * 0.15


@pytest.mark.skipif(not fixture_exists("machinable_block.step"), reason="machinable_block.step not in fixtures/")
def test_machinable_block_extraction():
    from dfm_engine.extraction import OCCFeatureExtractor
    extractor = OCCFeatureExtractor()
    features = extractor.extract(fixture_path("machinable_block.step"))

    assert not features.plate_like
    assert features.volume > 0
    assert features.surface_area > 0
    assert features.min_wall_thickness > 0


@pytest.mark.skipif(not fixture_exists("shaft.step"), reason="shaft.step not in fixtures/")
def test_shaft_extraction_has_cylindrical_faces():
    from dfm_engine.extraction import OCCFeatureExtractor
    extractor = OCCFeatureExtractor()
    features = extractor.extract(fixture_path("shaft.step"))

    assert features.face_classification.cylindrical > 0
    assert features.face_classification.total > 0


@pytest.mark.skipif(not fixture_exists("assembly.step"), reason="assembly.step not in fixtures/")
def test_full_pipeline_on_assembly_component():
    """Full pipeline smoke-test: extract → qualify → match → explain (mocked)."""
    from unittest.mock import MagicMock
    from dfm_engine import analyze_component
    from dfm_engine.models import ComponentRequirements, SupplierCapability

    requirements = ComponentRequirements(
        material="aluminium", tolerance_class="medium", quantity=5
    )
    suppliers = [
        SupplierCapability(
            supplier_id="test-sup",
            process="cnc_milling",
            materials=["aluminium"],
            work_envelope_mm=(500.0, 500.0, 500.0),
            min_tolerance_class="medium",
            certifications=[],
            capacity_status="available",
            location_region="India",
            lead_time_days=7,
        )
    ]

    analysis = analyze_component(
        fixture_path("assembly.step"),
        requirements,
        suppliers,
        explain=False,  # skip LLM in integration test
    )

    assert analysis.features is not None
    assert len(analysis.verdicts) == 8
    assert analysis.suppliers is not None
