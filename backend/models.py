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


class PlannedExercise(StrictModel):
    exercise_id: str = Field(min_length=1)
    sets: int = Field(ge=1, le=5, strict=True)
    reps: int = Field(ge=1, le=30, strict=True)
    weight_lb: int | None = Field(default=None, ge=5, le=500, multiple_of=5, strict=True)


class PlanRequest(StrictModel):
    muscle_group_ids: list[str] = Field(min_length=1, max_length=10)

    @model_validator(mode="after")
    def unique_groups(self):
        if len(self.muscle_group_ids) != len(set(self.muscle_group_ids)):
            raise ValueError("Muscle groups must be unique")
        return self


class PlanPreview(StrictModel):
    muscle_group_ids: list[str]
    plan: list[PlannedExercise]


class CreateSession(StrictModel):
    routine_id: str = "full-body"
    preferences: Preferences = Field(default_factory=Preferences)
    demo_mode: bool = False
    selected_muscle_group_ids: list[str] = Field(default_factory=list, max_length=10)
    plan: list[PlannedExercise] | None = Field(default=None, min_length=1, max_length=8)

    @model_validator(mode="after")
    def validate_custom_plan_shape(self):
        if self.plan is not None and not self.selected_muscle_group_ids:
            raise ValueError("A customized plan requires selected muscle groups")
        if self.plan is None and self.selected_muscle_group_ids:
            raise ValueError("Selected muscle groups require a customized plan")
        if len(self.selected_muscle_group_ids) != len(set(self.selected_muscle_group_ids)):
            raise ValueError("Selected muscle groups must be unique")
        return self


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


class GuidanceSource(StrictModel):
    title: str = Field(min_length=1)
    url: str = Field(pattern=r"^https://")


class Exercise(StrictModel):
    id: str
    name: str
    equipment: str
    location: str
    muscles: str
    sets: int = Field(gt=0)
    reps: int = Field(gt=0)
    rest_seconds: int = Field(gt=0)
    primary_muscle_group: str
    secondary_muscle_groups: list[str]
    weight_min_lb: int = Field(ge=5)
    weight_max_lb: int = Field(ge=5)
    weight_step_lb: int = Field(ge=1)
    setup: str
    cue: str
    mistake: str
    troubleshooting: str
    stop_conditions: str
    alternatives: list[str]
    sources: list[GuidanceSource] = Field(min_length=1)
    review_status: Literal["professional_review_pending"]


class ExerciseInstance(Exercise):
    instance_id: str
    original_exercise_id: str
    completed_sets: int = Field(ge=0)
    weight_lb: int | None = Field(default=None, ge=5, le=500, multiple_of=5)


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


class StreamAuthorization(StrictModel):
    access_token: str = Field(min_length=1)


class SnapshotFrame(StrictModel):
    type: Literal["snapshot"] = "snapshot"
    snapshot: Snapshot


class PongFrame(StrictModel):
    type: Literal["pong"] = "pong"


class GoogleAuthRequest(StrictModel):
    id_token: str = Field(min_length=20, max_length=4096)


class UserProfile(StrictModel):
    user_id: str
    email: str | None
    name: str
    preferences: Preferences
    muscle_group_ids: list[str]
    plan: list[PlannedExercise] | None


class AuthResult(StrictModel):
    profile: UserProfile
    access_token: str


class ProfileUpdate(StrictModel):
    name: str = Field(min_length=1, max_length=60)
    preferences: Preferences
    muscle_group_ids: list[str] = Field(max_length=10)
    plan: list[PlannedExercise] | None = Field(default=None, max_length=8)

    @model_validator(mode="after")
    def unique_groups(self):
        if len(self.muscle_group_ids) != len(set(self.muscle_group_ids)):
            raise ValueError("Muscle groups must be unique")
        if self.plan is not None and not self.muscle_group_ids:
            raise ValueError("A saved plan requires selected muscle groups")
        return self
