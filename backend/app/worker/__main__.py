import logging
import signal

from app.core.logging_config import setup_logging
from app.worker.consumer import Consumer

setup_logging()

logger = logging.getLogger("app.worker")


def main() -> None:
    consumer = Consumer()

    def _shutdown(signum, _frame):
        sig_name = signal.Signals(signum).name
        logger.info("Received %s — shutting down gracefully", sig_name)
        consumer.stop()

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    logger.info("Worker starting")
    consumer.start()
    logger.info("Worker exited")


if __name__ == "__main__":
    main()
