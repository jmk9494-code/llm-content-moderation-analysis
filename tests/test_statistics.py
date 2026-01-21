"""
Tests for the statistics module.
"""

import pytest
import numpy as np
from src.statistics import (
    calculate_fleiss_kappa,
    calculate_pairwise_kappa,
    calculate_power_analysis,
    check_sample_adequacy,
    calculate_cohens_d,
    calculate_cohens_h,
    calculate_odds_ratio,
    bootstrap_confidence_interval,
    bootstrap_proportion_ci,
    interpret_kappa,
    interpret_effect_size
)


class TestFleissKappa:
    """Tests for Fleiss' Kappa calculation."""
    
    def test_perfect_agreement(self):
        """All raters agree perfectly."""
        # 5 subjects, 3 categories, 4 raters all choosing category 0
        matrix = np.array([
            [4, 0, 0],
            [4, 0, 0],
            [4, 0, 0],
            [4, 0, 0],
            [4, 0, 0],
        ])
        kappa = calculate_fleiss_kappa(matrix)
        assert kappa == pytest.approx(1.0, rel=0.01)
    
    def test_no_agreement(self):
        """Raters disagree completely (uniform distribution)."""
        # Each category gets equal votes - expect near 0
        matrix = np.array([
            [2, 2, 2],
            [2, 2, 2],
            [2, 2, 2],
        ])
        kappa = calculate_fleiss_kappa(matrix)
        assert kappa == pytest.approx(0.0, abs=0.1)
    
    def test_empty_matrix(self):
        """Empty matrix returns 0."""
        matrix = np.array([]).reshape(0, 3)
        kappa = calculate_fleiss_kappa(matrix)
        assert kappa == 0.0


class TestPairwiseKappa:
    """Tests for Cohen's Kappa between two raters."""
    
    def test_perfect_agreement(self):
        """Two models agree perfectly."""
        v1 = ["ALLOWED", "REMOVED", "ALLOWED", "REMOVED"]
        v2 = ["ALLOWED", "REMOVED", "ALLOWED", "REMOVED"]
        kappa = calculate_pairwise_kappa(v1, v2)
        assert kappa == 1.0
    
    def test_complete_disagreement(self):
        """Two models completely disagree."""
        v1 = ["ALLOWED", "ALLOWED", "ALLOWED", "ALLOWED"]
        v2 = ["REMOVED", "REMOVED", "REMOVED", "REMOVED"]
        kappa = calculate_pairwise_kappa(v1, v2)
        assert kappa < 0  # Worse than chance


class TestPowerAnalysis:
    """Tests for power analysis calculations."""
    
    def test_small_effect_needs_more_samples(self):
        """Smaller effect sizes need larger samples."""
        n_small = calculate_power_analysis(effect_size=0.2)
        n_large = calculate_power_analysis(effect_size=0.8)
        assert n_small > n_large
    
    def test_reasonable_sample_sizes(self):
        """Sample sizes are in reasonable range."""
        n = calculate_power_analysis(effect_size=0.5)
        assert 20 < n < 500  # Sanity check


class TestSampleAdequacy:
    """Tests for sample adequacy checks."""
    
    def test_adequate_sample(self):
        """Adequate sample is detected."""
        result = check_sample_adequacy(n_samples=100, n_categories=4)
        assert result["is_adequate"] is True
    
    def test_inadequate_sample(self):
        """Inadequate sample is detected."""
        result = check_sample_adequacy(n_samples=10, n_categories=4)
        assert result["is_adequate"] is False
        assert result["warning"] is not None


class TestEffectSizes:
    """Tests for effect size calculations."""
    
    def test_cohens_d_same_groups(self):
        """Same groups have zero effect size."""
        g1 = [1, 2, 3, 4, 5]
        g2 = [1, 2, 3, 4, 5]
        d = calculate_cohens_d(g1, g2)
        assert d == pytest.approx(0.0, abs=0.01)
    
    def test_cohens_d_different_groups(self):
        """Different groups have non-zero effect size."""
        g1 = [1, 2, 3, 4, 5]
        g2 = [10, 11, 12, 13, 14]
        d = calculate_cohens_d(g1, g2)
        assert abs(d) > 1.0  # Large effect
    
    def test_cohens_h_same_proportions(self):
        """Same proportions have zero effect size."""
        h = calculate_cohens_h(0.5, 0.5)
        assert h == 0.0
    
    def test_cohens_h_different_proportions(self):
        """Different proportions have non-zero effect size."""
        h = calculate_cohens_h(0.1, 0.9)
        assert h > 0.8  # Large effect


class TestOddsRatio:
    """Tests for odds ratio calculations."""
    
    def test_equal_groups(self):
        """Equal proportions give OR near 1."""
        result = calculate_odds_ratio(50, 100, 50, 100)
        assert result["odds_ratio"] == pytest.approx(1.0, rel=0.1)
    
    def test_different_groups(self):
        """Different proportions give OR != 1."""
        result = calculate_odds_ratio(90, 100, 10, 100)
        assert result["odds_ratio"] > 1
        assert result["significant"] is True


class TestBootstrap:
    """Tests for bootstrap confidence intervals."""
    
    def test_bootstrap_ci_contains_mean(self):
        """Bootstrap CI should contain the sample mean."""
        data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        lower, mean, upper = bootstrap_confidence_interval(data, seed=42)
        assert lower < mean < upper
        assert lower < 5.5 < upper  # True mean should be in CI
    
    def test_bootstrap_proportion(self):
        """Bootstrap proportion CI is reasonable."""
        lower, prop, upper = bootstrap_proportion_ci(50, 100, seed=42)
        assert 40 < lower < prop < upper < 60  # Near 50%


class TestInterpretations:
    """Tests for interpretation functions."""
    
    def test_kappa_interpretation(self):
        """Kappa interpretations are correct."""
        assert "perfect" in interpret_kappa(0.9).lower()
        assert "slight" in interpret_kappa(0.1).lower()
    
    def test_effect_size_interpretation(self):
        """Effect size interpretations are correct."""
        assert interpret_effect_size(0.1) == "negligible"
        assert interpret_effect_size(0.3) == "small"
        assert interpret_effect_size(0.6) == "medium"
        assert interpret_effect_size(0.9) == "large"
