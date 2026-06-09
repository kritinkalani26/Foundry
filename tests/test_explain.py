"""
Unit tests for Stage 4 (LLM Explanation).

Uses a mocked Anthropic client to verify:
  1. The prompt contains the structured findings.
  2. The LLM explanation is never called with verdicts it can override.
  3. The fallback works when the API is unavailable.
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from dfm_engine.models import ComponentRequirements
from dfm_engine.explain import explain_component, _build_prompt
from dfm_engine.rules import qualify_all
from dfm_engine.matching import match_suppliers
from tests.conftest import (
    make_flat_plate, make_machinable_block, make_sharp_corner_block,
)


def _make_analysis(features, requirements, suppliers):
    """Build a ComponentAnalysis without running the full pipeline."""
    from dfm_engine.models import ComponentAnalysis
    verdicts = qualify_all(features)
    ranked   = match_suppliers(verdicts, requirements, features.bounding_box, suppliers)
    return ComponentAnalysis(
        step_path="test/part.step",
        requirements=requirements,
        features=features,
        verdicts=verdicts,
        suppliers=ranked,
    )


class TestPromptContentsStructuredData:
    """The prompt must include every deterministic finding."""

    def test_prompt_contains_blocking_reasons(self, sharp_corner_block, standard_requirements, sample_suppliers):
        analysis = _make_analysis(sharp_corner_block, standard_requirements, sample_suppliers)
        prompt = _build_prompt(analysis)

        # The sharp-corner failure must appear in the prompt
        assert "corner" in prompt.lower() or "radius" in prompt.lower()

    def test_prompt_contains_process_names(self, machinable_block, standard_requirements, sample_suppliers):
        analysis = _make_analysis(machinable_block, standard_requirements, sample_suppliers)
        prompt = _build_prompt(analysis)
        for proc in ["fdm_3dprint", "sla_3dprint", "cnc_milling", "cnc_turning", "waterjet", "laser_cut"]:
            assert proc in prompt, f"Expected process '{proc}' in prompt"

    def test_prompt_instructs_no_override(self, machinable_block, standard_requirements, sample_suppliers):
        analysis = _make_analysis(machinable_block, standard_requirements, sample_suppliers)
        prompt = _build_prompt(analysis)
        # Must contain the hard instruction
        assert "do not override" in prompt.lower() or "never override" in prompt.lower() or \
               "do not contradict" in prompt.lower()

    def test_prompt_includes_manufacturable_false_when_fails(self, sharp_corner_block, standard_requirements, sample_suppliers):
        analysis = _make_analysis(sharp_corner_block, standard_requirements, sample_suppliers)
        prompt = _build_prompt(analysis)
        assert "false" in prompt.lower() or "not manufacturable" in prompt.lower() or "fail" in prompt.lower()


class TestLLMNeverOverridesVerdict:
    """
    The explanation layer must not be given an opportunity to contradict
    deterministic verdicts.  We assert the prompt is ground truth.
    """

    def test_failed_verdict_reflected_in_prompt(self, sharp_corner_block, standard_requirements, sample_suppliers):
        analysis = _make_analysis(sharp_corner_block, standard_requirements, sample_suppliers)
        cnc_verdict = next(v for v in analysis.verdicts if v.process == "cnc_milling")
        assert not cnc_verdict.manufacturable  # deterministic

        prompt = _build_prompt(analysis)
        # The prompt must honestly represent this as not manufacturable
        assert "Manufacturable: False" in prompt

    def test_passed_verdict_reflected_in_prompt(self, machinable_block, standard_requirements, sample_suppliers):
        analysis = _make_analysis(machinable_block, standard_requirements, sample_suppliers)
        fdm_verdict = next(v for v in analysis.verdicts if v.process == "fdm_3dprint")
        assert fdm_verdict.manufacturable

        prompt = _build_prompt(analysis)
        assert "Manufacturable: True" in prompt


class TestAPIUnavailableFallback:
    def test_fallback_when_no_api_key(self, machinable_block, standard_requirements, sample_suppliers, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        analysis = _make_analysis(machinable_block, standard_requirements, sample_suppliers)
        result = explain_component(analysis)
        # Should not raise; should return a plain-text summary
        assert isinstance(result, str)
        assert len(result) > 0

    def test_fallback_when_anthropic_not_installed(self, machinable_block, standard_requirements, sample_suppliers):
        analysis = _make_analysis(machinable_block, standard_requirements, sample_suppliers)
        with patch.dict("sys.modules", {"anthropic": None}):
            result = explain_component(analysis)
        assert isinstance(result, str)

    def test_mocked_api_call(self, machinable_block, standard_requirements, sample_suppliers, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
        analysis = _make_analysis(machinable_block, standard_requirements, sample_suppliers)

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Mock explanation from Claude.")]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        mock_anthropic = MagicMock()
        mock_anthropic.Anthropic.return_value = mock_client

        with patch.dict("sys.modules", {"anthropic": mock_anthropic}):
            result = explain_component(analysis)

        assert result == "Mock explanation from Claude."
        # Verify structured data was passed to the API
        call_args = mock_client.messages.create.call_args
        prompt_sent = call_args.kwargs["messages"][0]["content"]
        assert "cnc_milling" in prompt_sent
        assert "Manufacturable" in prompt_sent
