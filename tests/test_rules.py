"""
Unit tests for Stage 2 (DFM rules).
No OpenCASCADE required — uses mocked GeometricFeatures from conftest.
"""

import pytest
from dfm_engine.models import HoleFeature
from dfm_engine.rules import qualify_all, qualify_process
from tests.conftest import make_features, make_flat_plate, make_machinable_block


# ── Waterjet ──────────────────────────────────────────────────────────────────

class TestWaterjet:
    def test_flat_plate_passes(self, flat_plate):
        verdict = qualify_process(flat_plate, "waterjet")
        assert verdict.manufacturable
        assert not verdict.blocking_reasons

    def test_3d_part_fails(self, machinable_block):
        verdict = qualify_process(machinable_block, "waterjet")
        assert not verdict.manufacturable
        assert any("plate-like" in r.lower() for r in verdict.blocking_reasons)

    def test_too_thick_plate_fails(self):
        thick = make_flat_plate(thickness=250.0)
        verdict = qualify_process(thick, "waterjet")
        assert not verdict.manufacturable
        assert any("200" in r for r in verdict.blocking_reasons)

    def test_too_thin_plate_fails(self):
        thin = make_flat_plate(thickness=0.3)
        verdict = qualify_process(thin, "waterjet")
        assert not verdict.manufacturable


# ── Laser cut ─────────────────────────────────────────────────────────────────

class TestLaserCut:
    def test_flat_plate_passes(self, flat_plate):
        verdict = qualify_process(flat_plate, "laser_cut")
        assert verdict.manufacturable

    def test_3d_part_fails(self, machinable_block):
        verdict = qualify_process(machinable_block, "laser_cut")
        assert not verdict.manufacturable

    def test_exceeds_thickness_fails(self):
        thick = make_flat_plate(thickness=30.0)
        verdict = qualify_process(thick, "laser_cut")
        assert not verdict.manufacturable
        assert any("25" in r for r in verdict.blocking_reasons)


# ── FDM 3D printing ───────────────────────────────────────────────────────────

class TestFDM:
    def test_normal_part_passes(self, machinable_block):
        verdict = qualify_process(machinable_block, "fdm_3dprint")
        assert verdict.manufacturable

    def test_oversized_fails(self, oversized_part):
        verdict = qualify_process(oversized_part, "fdm_3dprint")
        assert not verdict.manufacturable
        assert any("build volume" in r.lower() for r in verdict.blocking_reasons)

    def test_thin_wall_fails(self):
        thin = make_features(min_wall_thickness=0.5)
        verdict = qualify_process(thin, "fdm_3dprint")
        assert not verdict.manufacturable
        assert any("1.2" in r for r in verdict.blocking_reasons)

    def test_overhang_always_warns(self, machinable_block):
        verdict = qualify_process(machinable_block, "fdm_3dprint")
        warn_ids = {r.rule_id for r in verdict.results if r.status == "warn"}
        assert "fdm.overhang" in warn_ids

    def test_warn_wall_does_not_fail(self):
        borderline = make_features(min_wall_thickness=1.3)  # between 1.2 and 1.5
        verdict = qualify_process(borderline, "fdm_3dprint")
        assert verdict.manufacturable
        warn_ids = {r.rule_id for r in verdict.results if r.status == "warn"}
        assert "fdm.wall_thickness" in warn_ids


# ── CNC Milling ───────────────────────────────────────────────────────────────

class TestCNCMilling:
    def test_machinable_block_passes(self, machinable_block):
        verdict = qualify_process(machinable_block, "cnc_milling")
        assert verdict.manufacturable

    def test_sharp_internal_corner_fails(self, sharp_corner_block):
        verdict = qualify_process(sharp_corner_block, "cnc_milling")
        assert not verdict.manufacturable
        assert any("corner" in r.lower() for r in verdict.blocking_reasons)

    def test_measured_value_cited(self, sharp_corner_block):
        verdict = qualify_process(sharp_corner_block, "cnc_milling")
        corner_rules = [r for r in verdict.results if r.rule_id == "cnc_mill.corner_radius"]
        assert corner_rules
        rule = corner_rules[0]
        assert rule.measured_value is not None
        assert rule.threshold is not None

    def test_deep_hole_fails(self):
        deep_hole = make_features(
            holes=[HoleFeature(diameter=5.0, depth=60.0, axis=(0, 0, 1), depth_to_diameter_ratio=12.0)]
        )
        verdict = qualify_process(deep_hole, "cnc_milling")
        assert not verdict.manufacturable
        assert any("D/d" in r or "depth" in r.lower() for r in verdict.blocking_reasons)

    def test_uncertain_undercut_emits_warn_not_fail(self):
        uncertain = make_features(has_undercuts=None, undercut_confidence="low")
        verdict = qualify_process(uncertain, "cnc_milling")
        # Should not hard-fail (undercut_hard_fail=false in config)
        undercut_rules = [r for r in verdict.results if r.rule_id == "cnc_mill.undercuts"]
        assert undercut_rules
        assert undercut_rules[0].status == "warn"


# ── CNC Turning ───────────────────────────────────────────────────────────────

class TestCNCTurning:
    def test_cylindrical_dominant_passes(self):
        shaft = make_features(
            x=100.0, y=20.0, z=20.0,
            face_planar=2, face_cylindrical=8,
            min_internal_corner_radius=1.0,
        )
        verdict = qualify_process(shaft, "cnc_turning")
        assert verdict.manufacturable

    def test_all_processes_returned(self, machinable_block):
        verdicts = qualify_all(machinable_block)
        processes = {v.process for v in verdicts}
        expected = {
            "fdm_3dprint", "sla_3dprint", "cnc_milling", "cnc_turning",
            "waterjet", "laser_cut", "sheet_metal", "urethane_casting",
        }
        assert processes == expected

    def test_no_fail_means_manufacturable(self, machinable_block):
        verdicts = qualify_all(machinable_block)
        for v in verdicts:
            fail_rules = [r for r in v.results if r.status == "fail"]
            assert v.manufacturable == (len(fail_rules) == 0), (
                f"{v.process}: manufacturable={v.manufacturable} but fail_rules={fail_rules}"
            )


# ── Sheet metal ───────────────────────────────────────────────────────────────

class TestSheetMetal:
    def test_flat_plate_passes(self, flat_plate):
        verdict = qualify_process(flat_plate, "sheet_metal")
        assert verdict.manufacturable

    def test_3d_part_fails(self, machinable_block):
        verdict = qualify_process(machinable_block, "sheet_metal")
        assert not verdict.manufacturable
        assert any("plate-like" in r.lower() for r in verdict.blocking_reasons)

    def test_too_thick_fails(self):
        thick = make_flat_plate(thickness=15.0)
        verdict = qualify_process(thick, "sheet_metal")
        assert not verdict.manufacturable
        assert any("12" in r for r in verdict.blocking_reasons)

    def test_too_thin_fails(self):
        thin = make_flat_plate(thickness=0.1)
        verdict = qualify_process(thin, "sheet_metal")
        assert not verdict.manufacturable

    def test_hole_smaller_than_thickness_fails(self):
        plate_with_tiny_hole = make_flat_plate(
            thickness=3.0,
            holes=[HoleFeature(diameter=2.0, depth=3.0, axis=(0, 0, 1), depth_to_diameter_ratio=1.5)],
        )
        verdict = qualify_process(plate_with_tiny_hole, "sheet_metal")
        assert not verdict.manufacturable
        assert any("hole" in r.lower() or "diameter" in r.lower() for r in verdict.blocking_reasons)

    def test_no_tooling_info(self, flat_plate):
        verdict = qualify_process(flat_plate, "sheet_metal")
        assert verdict.tooling_info is None

    def test_confidence_is_medium(self, flat_plate):
        verdict = qualify_process(flat_plate, "sheet_metal")
        assert verdict.confidence == "medium"


# ── Urethane casting ──────────────────────────────────────────────────────────

class TestUrethane:
    def test_normal_part_passes(self, machinable_block):
        verdict = qualify_process(machinable_block, "urethane_casting")
        assert verdict.manufacturable

    def test_oversized_fails(self, oversized_part):
        verdict = qualify_process(oversized_part, "urethane_casting")
        assert not verdict.manufacturable
        assert any("mold frame" in r.lower() or "build volume" in r.lower() for r in verdict.blocking_reasons)

    def test_thin_wall_fails(self):
        thin = make_features(min_wall_thickness=0.4)
        verdict = qualify_process(thin, "urethane_casting")
        assert not verdict.manufacturable
        assert any("0.8" in r for r in verdict.blocking_reasons)

    def test_tooling_info_populated(self, machinable_block):
        verdict = qualify_process(machinable_block, "urethane_casting")
        assert verdict.tooling_info is not None
        ti = verdict.tooling_info
        assert ti.requires_tooling is True
        assert ti.estimated_tooling_lead_time_days is not None
        assert ti.tooling_cost_signal is not None

    def test_economic_at_small_quantity(self, machinable_block):
        from dfm_engine.models import ComponentRequirements
        req = ComponentRequirements(material="polyurethane", tolerance_class="medium", quantity=10)
        verdict = qualify_process(machinable_block, "urethane_casting", req)
        assert verdict.tooling_info is not None
        assert verdict.tooling_info.economic_at_requested_quantity is True

    def test_uneconomic_at_large_quantity(self, machinable_block):
        from dfm_engine.models import ComponentRequirements
        req = ComponentRequirements(material="polyurethane", tolerance_class="medium", quantity=200)
        verdict = qualify_process(machinable_block, "urethane_casting", req)
        assert verdict.tooling_info is not None
        assert verdict.tooling_info.economic_at_requested_quantity is False

    def test_undercut_is_warn_not_fail(self):
        with_undercuts = make_features(has_undercuts=True, undercut_confidence="high")
        verdict = qualify_process(with_undercuts, "urethane_casting")
        assert verdict.manufacturable
        undercut_rules = [r for r in verdict.results if r.rule_id == "urethane.undercuts"]
        assert undercut_rules
        assert undercut_rules[0].status == "warn"

    def test_confidence_is_at_most_medium(self, machinable_block):
        verdict = qualify_process(machinable_block, "urethane_casting")
        assert verdict.confidence in ("medium", "low")
