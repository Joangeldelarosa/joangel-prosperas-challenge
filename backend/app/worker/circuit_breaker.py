"""Circuit Breaker pattern — per report_type failure tracking."""

import logging
import time
from enum import Enum

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class _ReportTypeCircuit:
    """State for a single report type's circuit."""

    __slots__ = ("state", "failure_count", "last_failure_time")

    def __init__(self):
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time: float = 0.0


class CircuitBreaker:
    """Tracks consecutive failures per report_type and opens the circuit when threshold is reached."""

    def __init__(self, failure_threshold: int = 3, recovery_timeout: int = 60):
        self._threshold = failure_threshold
        self._timeout = recovery_timeout
        self._circuits: dict[str, _ReportTypeCircuit] = {}

    def _get(self, report_type: str) -> _ReportTypeCircuit:
        if report_type not in self._circuits:
            self._circuits[report_type] = _ReportTypeCircuit()
        return self._circuits[report_type]

    def can_execute(self, report_type: str) -> bool:
        """Return True if the circuit allows execution for this report_type."""
        circuit = self._get(report_type)

        if circuit.state == CircuitState.CLOSED:
            return True

        if circuit.state == CircuitState.OPEN:
            elapsed = time.monotonic() - circuit.last_failure_time
            if elapsed >= self._timeout:
                circuit.state = CircuitState.HALF_OPEN
                logger.info("Circuit HALF_OPEN for report_type=%s (timeout elapsed)", report_type)
                return True
            return False

        # HALF_OPEN — allow one probe
        return True

    def time_until_half_open(self, report_type: str) -> int:
        """Seconds remaining until the circuit transitions to HALF_OPEN."""
        circuit = self._get(report_type)
        if circuit.state != CircuitState.OPEN:
            return 0
        elapsed = time.monotonic() - circuit.last_failure_time
        remaining = max(0, self._timeout - elapsed)
        return int(remaining) + 1  # +1 to ensure we've passed the boundary

    def record_success(self, report_type: str) -> None:
        """Reset failure counter and close the circuit."""
        circuit = self._get(report_type)
        if circuit.state != CircuitState.CLOSED:
            logger.info("Circuit CLOSED for report_type=%s (success)", report_type)
        circuit.state = CircuitState.CLOSED
        circuit.failure_count = 0

    def record_failure(self, report_type: str) -> None:
        """Increment failure counter. Open circuit if threshold reached."""
        circuit = self._get(report_type)
        circuit.failure_count += 1
        circuit.last_failure_time = time.monotonic()

        if circuit.failure_count >= self._threshold:
            circuit.state = CircuitState.OPEN
            logger.warning(
                "Circuit OPEN for report_type=%s (%d consecutive failures, blocking for %ds)",
                report_type,
                circuit.failure_count,
                self._timeout,
            )
        elif circuit.state == CircuitState.HALF_OPEN:
            circuit.state = CircuitState.OPEN
            logger.warning(
                "Circuit OPEN for report_type=%s (HALF_OPEN probe failed)",
                report_type,
            )
