import asyncio
import json
import os
from contextlib import asynccontextmanager, suppress
from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict

from backend.models import CreateResult, CreateSession, Event, EventResult, Snapshot
from backend.store import Store, StoreError

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "catalog/demo.json").read_text())
security = HTTPBearer(auto_error=False)


def bearer(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Session token required")
    return credentials.credentials


def create_app(database: str | None = None) -> FastAPI:
    store = Store(database or os.environ.get("SPOTTER_DATABASE", str(ROOT / "backend/data/spotter.sqlite3")), CATALOG)

    async def tick():
        while True:
            await asyncio.to_thread(store.expire_due)
            await asyncio.sleep(0.5)

    @asynccontextmanager
    async def lifespan(app):
        worker = asyncio.create_task(tick())
        try:
            yield
        finally:
            worker.cancel()
            with suppress(asyncio.CancelledError):
                await worker

    app = FastAPI(title="Spotter workout API", version="1.0.0", lifespan=lifespan)
    app.state.store = store
    app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("SPOTTER_CORS_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081").split(","), allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])

    @app.exception_handler(StoreError)
    async def store_error(_, exc: StoreError):
        return JSONResponse(status_code=exc.status, content={"message": exc.message, "snapshot": exc.snapshot})

    @app.get("/health")
    def health():
        return {"status": "ok", "schema_version": 1, "voice_configured": bool(os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_AGENT_ID"))}

    @app.get("/catalog")
    def catalog():
        return CATALOG

    @app.post("/sessions", status_code=201, response_model=CreateResult)
    def create(request: CreateSession):
        return store.create(request)

    @app.get("/sessions/{session_id}", response_model=Snapshot)
    def get(session_id: str, token: str = Depends(bearer)):
        return store.get(session_id, token)

    @app.post("/sessions/{session_id}/events", response_model=EventResult)
    def post_event(session_id: str, event: Event, token: str = Depends(bearer)):
        return store.event(session_id, token, event)

    @app.get("/sessions/{session_id}/summary")
    def get_summary(session_id: str, token: str = Depends(bearer)):
        return store.summary(session_id, token)

    @app.websocket("/sessions/{session_id}/stream")
    async def stream(websocket: WebSocket, session_id: str):
        await websocket.accept()
        try:
            auth = await asyncio.wait_for(websocket.receive_json(), timeout=5)
            token = auth.get("access_token", "") if isinstance(auth, dict) else ""
            if not isinstance(token, str):
                token = ""
            version = 0
            while True:
                state = await asyncio.to_thread(store.get, session_id, token)
                if state["version"] > version:
                    await websocket.send_json({"type": "snapshot", "snapshot": state})
                    version = state["version"]
                try:
                    message = await asyncio.wait_for(websocket.receive_text(), timeout=0.5)
                    if message == "ping":
                        await websocket.send_json({"type": "pong"})
                except asyncio.TimeoutError:
                    pass
        except (WebSocketDisconnect, RuntimeError):
            return
        except (StoreError, asyncio.TimeoutError, ValueError):
            with suppress(RuntimeError):
                await websocket.close(code=1008)

    class VoiceRequest(BaseModel):
        model_config = ConfigDict(extra="forbid")
        session_id: str

    @app.post("/voice/token")
    async def voice_token(request: VoiceRequest, token: str = Depends(bearer)):
        await asyncio.to_thread(store.get, request.session_id, token)
        key, agent = os.environ.get("ELEVENLABS_API_KEY"), os.environ.get("ELEVENLABS_AGENT_ID")
        if not key or not agent:
            raise HTTPException(503, "Voice is not configured. Set backend ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.")
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                result = await client.get("https://api.elevenlabs.io/v1/convai/conversation/token", params={"agent_id": agent}, headers={"xi-api-key": key})
                result.raise_for_status()
                body = result.json()
                return {"conversation_token": body["token"]}
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            raise HTTPException(502, "Unable to authorize the voice session. Check agent configuration.") from exc

    return app


app = create_app()
