import logging
import signal
import sys

from app.worker.consumer import Consumer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    stream=sys.stdout,
)

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
