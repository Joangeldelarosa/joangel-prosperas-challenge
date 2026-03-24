"""WebSocket endpoint for real-time job status updates."""

import asyncio
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.services.job_service import job_service

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections per user."""

    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(user_id, []).append(ws)
        logger.info("WebSocket connected for user_id=%s (total: %d)", user_id, len(self._connections[user_id]))

    def disconnect(self, user_id: str, ws: WebSocket) -> None:
        conns = self._connections.get(user_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._connections.pop(user_id, None)
        logger.info("WebSocket disconnected for user_id=%s", user_id)

    async def send_job_update(self, ws: WebSocket, job_data: dict) -> None:
        try:
            await ws.send_json({"type": "job_update", "job": job_data})
        except Exception:
            pass


manager = ConnectionManager()


@router.websocket("/ws/jobs")
async def websocket_jobs(ws: WebSocket, token: str = Query(...)):
    """WebSocket endpoint that pushes job status changes to connected clients."""
    # Authenticate
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await ws.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await ws.close(code=4001, reason="Invalid token")
        return

    await manager.connect(user_id, ws)

    # Track last known state of each job to detect changes
    last_known: dict[str, str] = {}

    try:
        while True:
            # Poll DynamoDB for user's jobs and detect changes
            try:
                result = job_service.list_jobs(user_id, page=1, per_page=100)
                for job in result["jobs"]:
                    job_dict = job.to_dict()
                    job_id = job_dict["job_id"]
                    current_status = job_dict["status"]
                    previous_status = last_known.get(job_id)

                    if previous_status is None:
                        # New job — send it so the frontend adds it to the list
                        last_known[job_id] = current_status
                        await manager.send_job_update(ws, job_dict)
                        logger.info(
                            "Pushed new job_id=%s with status=%s",
                            job_id, current_status,
                        )
                    elif current_status != previous_status:
                        # Status changed — push update
                        last_known[job_id] = current_status
                        await manager.send_job_update(ws, job_dict)
                        logger.info(
                            "Pushed update for job_id=%s: %s -> %s",
                            job_id, previous_status, current_status,
                        )

            except Exception:
                logger.exception("Error polling jobs for WebSocket user_id=%s", user_id)

            # Wait 2 seconds before next check
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, ws)
