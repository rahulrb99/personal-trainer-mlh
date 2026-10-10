from datetime import datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Action(StrEnum):
    CLAIM = "equipment_claimed"
    TAKEN = "equipment_taken"
    COMPLETE = "set_completed"
    SKIP = "skip_exercise"
    RETRY = "retry_deferred"
    ACCEPT = "alternative_accepted"
    DECLINE = "alternative_declined"
    END = "end_session"


class Preferences(StrictModel):
    name: str = Field(default="You", min_length=1, max_length=60)
    mode: Literal["strict", "alternatives"] = "strict"
    excluded_exercise_ids: list[str] = Field(default_factory=list, max_length=30)
    coaching: Literal["quiet", "standard", "teach"] = "standard"


class CreateSession(StrictModel):
    routine_id: str = "full-body"
    preferences: Preferences = Field(default_factory=Preferences)
    demo_mode: bool = False


class Event(StrictModel):
    event_id: UUID
    expected_version: int = Field(ge=1, strict=True)
    source: Literal["phone", "watch", "web", "voice"]
    type: Action
    exercise_instance_id: str | None = None
    set_index: int | None = Field(default=None, ge=1, strict=True)
    payload: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_target(self):
        if self.type in {Action.CLAIM, Action.TAKEN, Action.COMPLETE, Action.SKIP, Action.ACCEPT, Action.DECLINE} and not self.exercise_instance_id:
            raise ValueError("This action requires an exercise_instance_id")
        if self.type == Action.COMPLETE and self.set_index is None:
            raise ValueError("Set completion requires a 1-based set_index")
        if self.payload:
            raise ValueError("No payload fields are supported in schema version 1")
        return self


class Exercise(StrictModel):
    id: str
    name: str
    equipment: str
    location: str
    muscles: str
    sets: int = Field(gt=0)
    reps: int = Field(gt=0)
    rest_seconds: int = Field(gt=0)
    setup: str
    cue: str
    mistake: str
    alternatives: list[str]


class ExerciseInstance(Exercise):
    instance_id: str
    original_exercise_id: str
    completed_sets: int = Field(ge=0)


class Snapshot(StrictModel):
    schema_version: Literal[1]
    session_id: str
    version: int = Field(ge=1)
    server_time: datetime
    created_at: datetime
    ended_at: datetime | None
    phase: Literal["awaiting_equipment", "awaiting_alternative_confirmation", "exercising", "resting", "blocked", "completed", "ended"]
    preferences: Preferences
    demo_mode: bool
    current: ExerciseInstance | None
    set_index: int = Field(ge=1)
    rest_deadline: datetime | None
    queue: list[ExerciseInstance]
    deferred: list[ExerciseInstance]
    completed: list[ExerciseInstance]
    skipped: list[ExerciseInstance]
    pending_alternative: Exercise | None
    last_decision: str


class CreateResult(StrictModel):
    snapshot: Snapshot
    access_token: str


class EventResult(StrictModel):
    snapshot: Snapshot
    replayed: bool
