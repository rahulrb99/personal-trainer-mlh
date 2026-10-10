"""Pure transitions. Persistence and transport live outside this module."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from backend.models import Action, CreateSession, Event


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def stamp(now: datetime) -> str:
    return now.isoformat()


class TransitionError(Exception):
    pass


def new_session(request: CreateSession, catalog: dict, now: datetime) -> dict:
    routine = next((r for r in catalog["routines"] if r["id"] == request.routine_id), None)
    if not routine:
        raise TransitionError("Unknown routine")
    exercises = {e["id"]: e for e in catalog["exercises"]}
    excluded = set(request.preferences.excluded_exercise_ids)
    if excluded - exercises.keys():
        raise TransitionError("Unknown excluded exercise")
    queue = []
    for exercise_id in routine["exercise_ids"]:
        if exercise_id not in excluded:
            queue.append({**deepcopy(exercises[exercise_id]), "instance_id": str(uuid4()), "original_exercise_id": exercise_id, "completed_sets": 0})
    if not queue:
        raise TransitionError("Preferences exclude every exercise in this routine")
    current = queue.pop(0)
    return {
        "schema_version": 1, "session_id": str(uuid4()), "version": 1,
        "server_time": stamp(now), "created_at": stamp(now), "ended_at": None,
        "phase": "awaiting_equipment", "preferences": request.preferences.model_dump(),
        "demo_mode": request.demo_mode, "current": current, "set_index": 1,
        "rest_deadline": None, "queue": queue, "deferred": [], "completed": [], "skipped": [],
        "pending_alternative": None, "last_decision": f"Start with {current['name']}. Confirm when you have the equipment.",
    }


def next_exercise(state: dict) -> None:
    state["rest_deadline"] = None
    state["pending_alternative"] = None
    state["set_index"] = 1
    if state["queue"]:
        state["current"] = state["queue"].pop(0)
        state["phase"] = "awaiting_equipment"
        state["last_decision"] = f"Next: {state['current']['name']}. Confirm when you have the equipment."
    elif state["deferred"]:
        state["current"] = None
        state["phase"] = "blocked"
        state["last_decision"] = "Your remaining exercises were reported taken. Retry them, skip them individually, or end today."
    else:
        state["current"] = None
        state["phase"] = "completed"
        state["ended_at"] = state["server_time"]
        state["last_decision"] = "Workout complete. Your actual completed sets are saved."


def expire_rest(state: dict, now: datetime) -> bool:
    if state["phase"] != "resting" or not state["rest_deadline"]:
        return False
    if datetime.fromisoformat(state["rest_deadline"]) > now:
        return False
    state["phase"] = "exercising"
    state["rest_deadline"] = None
    state["version"] += 1
    state["server_time"] = stamp(now)
    state["last_decision"] = f"Rest finished. Ready for set {state['set_index']} of {state['current']['name']}."
    return True


def transition(original: dict, event: Event, catalog: dict, now: datetime) -> dict:
    state = deepcopy(original)
    state["server_time"] = stamp(now)
    if state["phase"] in {"completed", "ended"}:
        raise TransitionError("This session is finished")
    current = state["current"]
    if event.type not in {Action.END, Action.RETRY}:
        if not current or event.exercise_instance_id != current["instance_id"]:
            raise TransitionError("Action does not target the current exercise")
    if event.type == Action.END:
        state["phase"] = "ended"
        state["rest_deadline"] = None
        state["pending_alternative"] = None
        state["ended_at"] = stamp(now)
        state["last_decision"] = "Session ended. Completed work has been saved."
    elif event.type == Action.RETRY:
        if state["phase"] != "blocked" or not state["deferred"]:
            raise TransitionError("Retry is only available when remaining exercises are blocked")
        state["queue"] = state["deferred"]
        state["deferred"] = []
        next_exercise(state)
    elif event.type == Action.CLAIM:
        if state["phase"] != "awaiting_equipment":
            raise TransitionError("Equipment confirmation is not currently expected")
        state["phase"] = "exercising"
        state["last_decision"] = f"Equipment confirmed. {current['setup']} {current['cue']}"
    elif event.type == Action.COMPLETE:
        if state["phase"] != "exercising" or event.set_index != state["set_index"]:
            raise TransitionError("This set cannot be completed in the current phase")
        current["completed_sets"] += 1
        if current["completed_sets"] >= current["sets"]:
            state["completed"].append(current)
            next_exercise(state)
        else:
            state["set_index"] += 1
            state["phase"] = "resting"
            seconds = 5 if state["demo_mode"] else current["rest_seconds"]
            state["rest_deadline"] = stamp(now + timedelta(seconds=seconds))
            state["last_decision"] = f"Set saved. Rest for {seconds} seconds."
    elif event.type == Action.SKIP:
        state["skipped"].append(current)
        next_exercise(state)
    elif event.type == Action.TAKEN:
        if state["phase"] != "awaiting_equipment":
            raise TransitionError("Report Taken before starting the exercise")
        by_id = {e["id"]: e for e in catalog["exercises"]}
        candidate = next((by_id[x] for x in current["alternatives"] if x not in state["preferences"]["excluded_exercise_ids"]), None)
        if state["preferences"]["mode"] == "alternatives" and candidate:
            state["phase"] = "awaiting_alternative_confirmation"
            state["pending_alternative"] = deepcopy(candidate)
            state["last_decision"] = f"Equipment reported taken. Would you like {candidate['name']} instead?"
        else:
            state["deferred"].append(current)
            next_exercise(state)
            if state["current"]:
                state["last_decision"] = f"Equipment reported taken. Keeping your exercises; try {state['current']['name']} next."
    elif event.type in {Action.ACCEPT, Action.DECLINE}:
        if state["phase"] != "awaiting_alternative_confirmation":
            raise TransitionError("There is no pending alternative")
        if event.type == Action.ACCEPT:
            replacement = state["pending_alternative"]
            state["current"] = {**replacement, "instance_id": str(uuid4()), "original_exercise_id": current["original_exercise_id"], "completed_sets": 0}
            state["pending_alternative"] = None
            state["phase"] = "awaiting_equipment"
            state["last_decision"] = f"Alternative accepted. Confirm when you have the equipment for {replacement['name']}. Choose a suitable weight independently."
        else:
            state["deferred"].append(current)
            next_exercise(state)
    else:
        raise TransitionError("Unsupported action")
    state["version"] += 1
    return state


def summary(state: dict) -> dict:
    entries = state["completed"] + state["skipped"] + state["queue"] + state["deferred"] + ([state["current"]] if state["current"] else [])
    return {
        "session_id": state["session_id"], "phase": state["phase"],
        "completed_sets": sum(e["completed_sets"] for e in entries),
        "completed_exercises": len(state["completed"]),
        "completed": state["completed"], "skipped": state["skipped"],
        "partial": [e for e in entries if e["completed_sets"] > 0 and e not in state["completed"]],
        "substituted": [e for e in entries if e["id"] != e["original_exercise_id"]],
    }
