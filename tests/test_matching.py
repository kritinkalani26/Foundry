"""
Unit tests for Stage 3 (Supplier Matching).
No OpenCASCADE or API calls required.
"""

import pytest
from dfm_engine.models import (
    BoundingBox, ComponentRequirements, SupplierCapability,
)
from dfm_engine.matching import match_suppliers, _filter
from dfm_engine.rules import qualify_all
from tests.conftest import (
    make_flat_plate, make_machinable_block, make_oversized_part,
    make_features,
)


class TestHardFilter:
    def test_full_capacity_excluded(self, sample_suppliers, standard_requirements, flat_plate):
        bb = flat_plate.bounding_box
        verdicts = qualify_all(flat_plate)
        result = match_suppliers(verdicts, standard_requirements, bb, sample_suppliers)
        supplier_ids = {rs.supplier.supplier_id for rs in result.ranked}
        assert "sup-005-full" not in supplier_ids

    def test_wrong_material_excluded(self, standard_requirements, machinable_block):
        supplier_titanium_only = SupplierCapability(
            supplier_id="titanium-only",
            process="cnc_milling",
            materials=["titanium"],
            work_envelope_mm=(500.0, 400.0, 300.0),
            min_tolerance_class="fine",
            certifications=[],
            capacity_status="available",
            location_region="India",
            lead_time_days=5,
        )
        bb = machinable_block.bounding_box
        verdicts = qualify_all(machinable_block)
        result = match_suppliers(verdicts, standard_requirements, bb, [supplier_titanium_only])
        assert all(rs.supplier.supplier_id != "titanium-only" for rs in result.ranked)

    def test_envelope_too_small_excluded(self, standard_requirements, machinable_block):
        small_shop = SupplierCapability(
            supplier_id="small-shop",
            process="cnc_milling",
            materials=["aluminium"],
            work_envelope_mm=(10.0, 10.0, 10.0),  # part won't fit
            min_tolerance_class="medium",
            certifications=[],
            capacity_status="available",
            location_region="India",
            lead_time_days=5,
        )
        bb = machinable_block.bounding_box
        verdicts = qualify_all(machinable_block)
        result = match_suppliers(verdicts, standard_requirements, bb, [small_shop])
        assert all(rs.supplier.supplier_id != "small-shop" for rs in result.ranked)

    def test_insufficient_tolerance_excluded(self, sample_suppliers):
        requirements = ComponentRequirements(
            material="aluminium", tolerance_class="precision", quantity=1
        )
        features = make_machinable_block()
        bb = features.bounding_box
        verdicts = qualify_all(features)
        result = match_suppliers(verdicts, requirements, bb, sample_suppliers)
        # sup-003 has "fine" tolerance — should be excluded for "precision" requirement
        supplier_ids = {rs.supplier.supplier_id for rs in result.ranked}
        assert "sup-003" not in supplier_ids


class TestRanking:
    def test_available_ranked_above_limited(self, standard_requirements):
        available = SupplierCapability(
            supplier_id="avail",
            process="cnc_milling",
            materials=["aluminium"],
            work_envelope_mm=(500.0, 400.0, 300.0),
            min_tolerance_class="medium",
            certifications=[],
            capacity_status="available",
            location_region="India",
            lead_time_days=5,
        )
        limited = SupplierCapability(
            supplier_id="lim",
            process="cnc_milling",
            materials=["aluminium"],
            work_envelope_mm=(500.0, 400.0, 300.0),
            min_tolerance_class="medium",
            certifications=[],
            capacity_status="limited",
            location_region="India",
            lead_time_days=5,
        )
        features = make_machinable_block()
        verdicts = qualify_all(features)
        result = match_suppliers(verdicts, standard_requirements, features.bounding_box,
                                 [available, limited])
        avail_rank = next(i for i, rs in enumerate(result.ranked) if rs.supplier.supplier_id == "avail")
        lim_rank   = next(i for i, rs in enumerate(result.ranked) if rs.supplier.supplier_id == "lim")
        assert avail_rank < lim_rank

    def test_score_components_present(self, sample_suppliers, standard_requirements):
        features = make_machinable_block()
        verdicts = qualify_all(features)
        result = match_suppliers(verdicts, standard_requirements, features.bounding_box, sample_suppliers)
        for rs in result.ranked:
            assert "lead_time" in rs.score_components
            assert "location" in rs.score_components
            assert "capacity" in rs.score_components
            assert "cost" in rs.score_components
            assert "certification" in rs.score_components

    def test_scores_sum_correctly(self, sample_suppliers, standard_requirements):
        features = make_machinable_block()
        verdicts = qualify_all(features)
        result = match_suppliers(verdicts, standard_requirements, features.bounding_box, sample_suppliers)
        for rs in result.ranked:
            assert abs(sum(rs.score_components.values()) - rs.score) < 1e-3


class TestNetworkGap:
    def test_no_supplier_for_viable_process(self, standard_requirements):
        """Waterjet passes DFM but no waterjet supplier in the pool."""
        features = make_flat_plate()
        verdicts = qualify_all(features)
        # Only provide a CNC milling supplier — no waterjet or laser
        cnc_only = [SupplierCapability(
            supplier_id="cnc-only",
            process="cnc_milling",
            materials=["aluminium"],
            work_envelope_mm=(500.0, 400.0, 300.0),
            min_tolerance_class="medium",
            certifications=[],
            capacity_status="available",
            location_region="India",
            lead_time_days=5,
        )]
        result = match_suppliers(verdicts, standard_requirements, features.bounding_box, cnc_only)
        # Waterjet and laser_cut pass DFM for a flat plate but have no supplier
        assert "waterjet" in result.no_supplier_gap or "laser_cut" in result.no_supplier_gap

    def test_oversized_has_no_fdm_supplier(self, sample_suppliers, standard_requirements):
        """An oversized part fails FDM DFM — not a gap, just a DFM failure."""
        features = make_oversized_part()
        verdicts = qualify_all(features)
        result = match_suppliers(verdicts, standard_requirements, features.bounding_box, sample_suppliers)
        # fdm_3dprint should fail DFM, so it won't appear in gap (gap = manufacturable but no supplier)
        assert "fdm_3dprint" not in result.no_supplier_gap
