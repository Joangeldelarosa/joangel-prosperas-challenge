"""Unit tests for CircuitBreaker pattern."""

import time
from unittest.mock import patch

from app.worker.circuit_breaker import CircuitBreaker, CircuitState


class TestCircuitBreaker:
    def test_initial_state_is_closed(self):
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
        assert cb.can_execute("engagement_analytics") is True

    def test_stays_closed_below_threshold(self):
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
        cb.record_failure("test_type")
        cb.record_failure("test_type")
        assert cb.can_execute("test_type") is True

    def test_opens_at_threshold(self):
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
        cb.record_failure("test_type")
        cb.record_failure("test_type")
        cb.record_failure("test_type")
        assert cb.can_execute("test_type") is False

    def test_success_resets_failures(self):
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
        cb.record_failure("test_type")
        cb.record_failure("test_type")
        cb.record_success("test_type")
        # Failures reset — should need 3 more to open
        cb.record_failure("test_type")
        cb.record_failure("test_type")
        assert cb.can_execute("test_type") is True

    def test_half_open_after_timeout(self):
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=1)
        cb.record_failure("test_type")
        cb.record_failure("test_type")
        assert cb.can_execute("test_type") is False
        time.sleep(1.1)
        assert cb.can_execute("test_type") is True

    def test_half_open_success_closes(self):
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=1)
        cb.record_failure("test_type")
        cb.record_failure("test_type")
        time.sleep(1.1)
        cb.can_execute("test_type")  # transitions to HALF_OPEN
        cb.record_success("test_type")
        assert cb.can_execute("test_type") is True

    def test_half_open_failure_reopens(self):
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=1)
        cb.record_failure("test_type")
        cb.record_failure("test_type")
        time.sleep(1.1)
        cb.can_execute("test_type")  # transitions to HALF_OPEN
        cb.record_failure("test_type")
        assert cb.can_execute("test_type") is False

    def test_independent_per_report_type(self):
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=60)
        cb.record_failure("type_a")
        cb.record_failure("type_a")
        assert cb.can_execute("type_a") is False
        assert cb.can_execute("type_b") is True

    def test_time_until_half_open(self):
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=30)
        cb.record_failure("test_type")
        cb.record_failure("test_type")
        remaining = cb.time_until_half_open("test_type")
        assert remaining > 0
        assert remaining <= 31

    def test_time_until_half_open_when_closed(self):
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=30)
        assert cb.time_until_half_open("test_type") == 0
