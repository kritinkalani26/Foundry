"""Shared fixtures for the DFM engine test suite."""

import pytest
from dfm_engine.models import (
    BoundingBox, ComponentRequirements, FaceClassification,
    GeometricFeatures, HoleFeature, SupplierCapability,
)


def make_features(
    *,
    x=100.0, y=80.0, z=50.0,
    volume=400_000.0,
    surface_area=50_000.0,
    min_wall_thickness=3.0,
    min_wall_thickness_confidence="medium",
    holes=None,
    min_internal_corner_radius=2.0,
    plate_like=False,
    plate_thickness=None,
    has_undercuts=False,
    undercut_confidence="high",
    face_planar=8, face_cylindrical=4, face_conical=0, face_freeform=0,
) -> GeometricFeatures:
    return GeometricFeatures(
        bounding_box=BoundingBox(x=x, y=y, z=z),
        volume=volume,
        surface_area=surface_area,
        min_wall_thickness=min_wall_thickness,
        min_wall_thickness_confidence=min_wall_thickness_confidence,
        holes=holes or [],
        min_internal_corner_radius=min_internal_corner_radius,
        face_classification=FaceClassification(
            planar=face_planar,
            cylindrical=face_cylindrical,
            conical=face_conical,
            freeform=face_freeform,
        ),
        plate_like=plate_like,
        plate_thickness=plate_thickness,
        has_undercuts=has_undercuts,
        undercut_confidence=undercut_confidence,
    )


def make_flat_plate(thickness=3.0, holes=None) -> GeometricFeatures:
    """A sheet-metal-style plate, good for waterjet / laser / sheet metal."""
    return make_features(
        x=200.0, y=150.0, z=thickness,
        min_wall_thickness=thickness,
        plate_like=True,
        plate_thickness=thickness,
        holes=holes,
        face_planar=6, face_cylindrical=2, face_conical=0, face_freeform=0,
        has_undercuts=False,
        undercut_confidence="high",
    )


def make_machinable_block() -> GeometricFeatures:
    """A solid block with good corner radii — passes CNC milling."""
    return make_features(
        x=80.0, y=60.0, z=40.0,
        min_wall_thickness=5.0,
        min_internal_corner_radius=2.0,
        holes=[HoleFeature(diameter=8.0, depth=20.0, axis=(0, 0, 1), depth_to_diameter_ratio=2.5)],
    )


def make_sharp_corner_block() -> GeometricFeatures:
    """A block with sharp internal corners — fails CNC milling."""
    return make_features(
        x=80.0, y=60.0, z=40.0,
        min_wall_thickness=5.0,
        min_internal_corner_radius=0.0,  # sharp
    )


def make_oversized_part() -> GeometricFeatures:
    """A part too large for any standard printer."""
    return make_features(x=600.0, y=600.0, z=600.0, min_wall_thickness=10.0)


@pytest.fixture
def flat_plate():
    return make_flat_plate()

@pytest.fixture
def machinable_block():
    return make_machinable_block()

@pytest.fixture
def sharp_corner_block():
    return make_sharp_corner_block()

@pytest.fixture
def oversized_part():
    return make_oversized_part()

@pytest.fixture
def standard_requirements():
    return ComponentRequirements(material="aluminium", tolerance_class="medium", quantity=10)

@pytest.fixture
def sample_suppliers():
    return [
        SupplierCapability(
            supplier_id="sup-001",
            process="waterjet",
            materials=["steel", "aluminium", "titanium"],
            work_envelope_mm=(2000.0, 1500.0, 200.0),
            min_tolerance_class="medium",
            certifications=["ISO9001"],
            capacity_status="available",
            location_region="India",
            lead_time_days=5,
            base_cost_per_hour=800.0,
        ),
        SupplierCapability(
            supplier_id="sup-002",
            process="laser_cut",
            materials=["steel", "aluminium", "acrylic"],
            work_envelope_mm=(1500.0, 1000.0, 25.0),
            min_tolerance_class="fine",
            certifications=["ISO9001", "CE"],
            capacity_status="available",
            location_region="India",
            lead_time_days=3,
            base_cost_per_hour=600.0,
        ),
        SupplierCapability(
            supplier_id="sup-003",
            process="cnc_milling",
            materials=["aluminium", "steel", "brass"],
            work_envelope_mm=(500.0, 400.0, 300.0),
            min_tolerance_class="fine",
            certifications=["ISO9001"],
            capacity_status="limited",
            location_region="India",
            lead_time_days=10,
            base_cost_per_hour=1200.0,
        ),
        SupplierCapability(
            supplier_id="sup-004",
            process="fdm_3dprint",
            materials=["PLA", "ABS", "PETG", "nylon"],
            work_envelope_mm=(350.0, 350.0, 400.0),
            min_tolerance_class="rough",
            certifications=[],
            capacity_status="available",
            location_region="India",
            lead_time_days=2,
            base_cost_per_hour=400.0,
        ),
        SupplierCapability(
            supplier_id="sup-005-full",
            process="cnc_milling",
            materials=["aluminium"],
            work_envelope_mm=(500.0, 400.0, 300.0),
            min_tolerance_class="precision",
            certifications=["ISO9001", "AS9100"],
            capacity_status="full",   # should be excluded by filter
            location_region="USA",
            lead_time_days=7,
            base_cost_per_hour=2000.0,
        ),
    ]
