import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import create_app


@pytest.fixture
def google_client(tmp_path, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client")

    def handler(request: httpx.Request) -> httpx.Response:
        token = request.url.params.get("id_token")
        if token == "valid-google-id-token-value":
            return httpx.Response(200, json={
                "aud": "test-google-client",
                "sub": "google-user-1",
                "email": "rahul@example.com",
                "email_verified": "true",
                "name": "Rahul",
            })
        if token == "unverified-google-id-token-value":
            return httpx.Response(200, json={
                "aud": "test-google-client",
                "sub": "google-user-2",
                "email": "unverified@example.com",
                "email_verified": "false",
                "name": "Unverified",
            })
        return httpx.Response(400, json={"error": "invalid_token"})

    app = create_app(str(tmp_path / "auth.sqlite3"), google_transport=httpx.MockTransport(handler))
    with TestClient(app) as client:
        yield client


def test_google_sign_in_saves_and_restores_name_and_plan(google_client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client")
    created = google_client.post("/auth/google", json={"id_token": "valid-google-id-token-value"})
    assert created.status_code == 200
    token = created.json()["access_token"]
    profile = created.json()["profile"]
    assert profile["name"] == "Rahul"
    assert profile["email"] == "rahul@example.com"
    assert profile["plan"] is None
    headers = {"Authorization": f"Bearer {token}"}
    saved = google_client.put("/profile", headers=headers, json={
        "name": "Rahul B",
        "preferences": {"name": "Rahul B", "mode": "strict", "excluded_exercise_ids": [], "coaching": "standard"},
        "muscle_group_ids": ["chest", "back"],
        "plan": [{"exercise_id": "chest-press", "sets": 3, "reps": 10, "weight_lb": 50}],
    })
    assert saved.status_code == 200
    assert saved.json()["name"] == "Rahul B"
    assert saved.json()["plan"][0]["exercise_id"] == "chest-press"
    again = google_client.post("/auth/google", json={"id_token": "valid-google-id-token-value"})
    assert again.status_code == 200
    assert again.json()["profile"]["name"] == "Rahul B"
    assert again.json()["profile"]["muscle_group_ids"] == ["chest", "back"]
    assert again.json()["profile"]["plan"][0]["sets"] == 3
    restored = google_client.get("/profile", headers={"Authorization": f"Bearer {again.json()['access_token']}"})
    assert restored.status_code == 200
    assert restored.json()["plan"][0]["weight_lb"] == 50
    stale = google_client.get("/profile", headers=headers)
    assert stale.status_code == 401


def test_google_sign_in_rejects_bad_tokens(google_client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client")
    assert google_client.post("/auth/google", json={"id_token": "invalid-google-id-token-value"}).status_code == 401
    assert google_client.post("/auth/google", json={"id_token": "unverified-google-id-token-value"}).status_code == 401
    assert google_client.get("/profile").status_code == 401


def test_missing_google_configuration(tmp_path, monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    with TestClient(create_app(str(tmp_path / "no-google.sqlite3"))) as client:
        assert client.get("/health").json()["google_auth_configured"] is False
        assert client.post("/auth/google", json={"id_token": "valid-google-id-token-value"}).status_code == 503
