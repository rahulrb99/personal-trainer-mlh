"""Regenerate API contracts from validated Pydantic models."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.models import CreateSession, Event, Snapshot, EventResult, CreateResult
from backend.app import app

if __name__ == "__main__":
    target = ROOT / "contracts"
    target.mkdir(exist_ok=True)
    for model in (CreateSession, Event, Snapshot, EventResult, CreateResult):
        (target / f"{model.__name__}.schema.json").write_text(json.dumps(model.model_json_schema(), indent=2) + "\n")
    (target / "openapi.json").write_text(json.dumps(app.openapi(), indent=2) + "\n")
    print("Exported schema version 1 and OpenAPI")
