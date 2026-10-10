import hashlib
import json
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Iterator

from backend.engine import TransitionError, expire_rest, new_session, summary, transition, utc_now
from backend.models import CreateSession, Event


class StoreError(Exception):
    def __init__(self, message: str, status: int, snapshot: dict | None = None):
        self.message, self.status, self.snapshot = message, status, snapshot


class Store:
    def __init__(self, path: str, catalog: dict):
        self.path, self.catalog = path, catalog
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, state TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS events (session_id TEXT NOT NULL, event_id TEXT NOT NULL, request TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(session_id,event_id));
            """)

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        db = sqlite3.connect(self.path, timeout=10)
        db.execute("PRAGMA busy_timeout=10000")
        try:
            with db:
                yield db
        finally:
            db.close()

    def create(self, request: CreateSession) -> dict:
        try:
            state = new_session(request, self.catalog, utc_now())
        except TransitionError as exc:
            raise StoreError(str(exc), 422) from exc
        token = secrets.token_urlsafe(32)
        with self.connect() as db:
            db.execute("INSERT INTO sessions VALUES (?,?,?)", (state["session_id"], self.digest(token), json.dumps(state)))
        return {"snapshot": state, "access_token": token}

    @staticmethod
    def digest(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def load(self, db: sqlite3.Connection, session_id: str, token: str) -> dict:
        row = db.execute("SELECT token_hash,state FROM sessions WHERE id=?", (session_id,)).fetchone()
        if not row or not secrets.compare_digest(row[0], self.digest(token)):
            raise StoreError("Session not found or token invalid", 401)
        return json.loads(row[1])

    @staticmethod
    def save(db: sqlite3.Connection, state: dict) -> None:
        db.execute("UPDATE sessions SET state=? WHERE id=?", (json.dumps(state), state["session_id"]))

    def get(self, session_id: str, token: str, now: datetime | None = None) -> dict:
        now = now or utc_now()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            state = self.load(db, session_id, token)
            if expire_rest(state, now):
                self.save(db, state)
            state["server_time"] = now.isoformat()
            return state

    def event(self, session_id: str, token: str, event: Event, now: datetime | None = None) -> dict:
        now = now or utc_now()
        request = event.model_dump_json()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            state = self.load(db, session_id, token)
            previous = db.execute("SELECT request,result FROM events WHERE session_id=? AND event_id=?", (session_id, str(event.event_id))).fetchone()
            if previous:
                if previous[0] != request:
                    raise StoreError("Event ID was already used with different content", 409, state)
                return {"snapshot": json.loads(previous[1]), "replayed": True}
            if expire_rest(state, now):
                self.save(db, state)
            if state["version"] != event.expected_version:
                # Commit the server timer transition even when rejecting stale input.
                db.commit()
                raise StoreError("Session changed. Refresh and choose your action again.", 409, state)
            try:
                state = transition(state, event, self.catalog, now)
            except TransitionError as exc:
                raise StoreError(str(exc), 422, state) from exc
            self.save(db, state)
            db.execute("INSERT INTO events VALUES (?,?,?,?)", (session_id, str(event.event_id), request, json.dumps(state)))
            return {"snapshot": state, "replayed": False}

    def summary(self, session_id: str, token: str) -> dict:
        return summary(self.get(session_id, token))

    def expire_due(self) -> None:
        now = utc_now()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            for row in db.execute("SELECT state FROM sessions").fetchall():
                state = json.loads(row[0])
                if expire_rest(state, now):
                    self.save(db, state)
