"""Canonical client-tool argument schemas; not a second tool execution engine."""
from pydantic import Field

from backend.models import Action, StrictModel


class GetSessionState(StrictModel):
    pass


class GetExerciseGuidance(StrictModel):
    exercise_id: str = Field(min_length=1, description="Catalog exercise ID returned by the authoritative current snapshot; never an instance ID.")


class SubmitWorkoutAction(StrictModel):
    action: Action
    exercise_instance_id: str | None = Field(description="Current instance_id; null only for end_session or retry_deferred.")
    set_index: int | None = Field(ge=1, description="Current 1-based set index; null for session-level actions.")


TOOL_MODELS = {
    "get_session_state": (GetSessionState, "Fetch authoritative state before a workout action. Read-only."),
    "get_exercise_guidance": (GetExerciseGuidance, "Fetch curated catalog setup, cues, muscles and common mistakes. Read-only; no observed-form claims."),
    "submit_workout_action": (SubmitWorkoutAction, "Submit one explicit user-requested action and wait for success. Never retry against a new target after rejection."),
}


def tool_specifications() -> list[dict]:
    tools = []
    for name, (model, description) in TOOL_MODELS.items():
        schema = model.model_json_schema()
        definitions = schema.pop("$defs", {})
        for value in schema["properties"].values():
            reference = value.pop("$ref", None)
            if reference:
                value.update(definitions[reference.rsplit("/", 1)[1]])
        tools.append(dict(name=name, description=description, parameters=schema, wait_for_response=True))
    return tools
