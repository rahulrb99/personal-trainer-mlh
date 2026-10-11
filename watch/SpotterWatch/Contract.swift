import Foundation

// Minimal projection of contracts/snapshot.schema.json (schema version 1).
// Backend snake_case keys are decoded consistently by WorkoutAPI.decoder.
enum Phase: String, Decodable {
    case awaitingEquipment = "awaiting_equipment"
    case awaitingAlternative = "awaiting_alternative_confirmation"
    case exercising, resting, blocked, completed, ended
    var finished: Bool { self == .completed || self == .ended }
}

struct Exercise: Decodable {
    let name: String
    let equipment: String
    let location: String
    let sets: Int
    let reps: Int
}

struct SetRecord: Decodable {
    let setIndex: Int
    let startedAt: Date?
    let completedAt: Date
    let durationSeconds: Double?
    let plannedReps: Int
    let weightLb: Int?
}

struct ExerciseInstance: Decodable {
    let instanceId: String
    let name: String
    let equipment: String
    let location: String
    let sets: Int
    let reps: Int
    let completedSets: Int
    let weightLb: Int?
    let setRecords: [SetRecord]?
}

struct Snapshot: Decodable {
    let schemaVersion: Int
    let sessionId: String
    let version: Int
    let serverTime: Date
    let phase: Phase
    let current: ExerciseInstance?
    let setIndex: Int
    let restDeadline: Date?
    let setStartedAt: Date?
    let demoMode: Bool
    let lastDecision: String
    let pendingAlternative: Exercise?
    let completed: [ExerciseInstance]
    let skipped: [ExerciseInstance]
    let deferred: [ExerciseInstance]
    let queue: [ExerciseInstance]

    func validated(for sessionId: String) throws -> Snapshot {
        guard schemaVersion == 1, self.sessionId == sessionId, version > 0, setIndex > 0 else {
            throw WatchError.contract
        }
        for exercise in completed + skipped + deferred + queue + (current.map { [$0] } ?? []) {
            guard !exercise.instanceId.isEmpty, exercise.sets > 0, exercise.reps > 0,
                  exercise.completedSets >= 0, exercise.completedSets <= exercise.sets else {
                throw WatchError.contract
            }
        }
        if [.awaitingEquipment, .awaitingAlternative, .exercising, .resting].contains(phase), current == nil {
            throw WatchError.contract
        }
        if phase == .resting && restDeadline == nil { throw WatchError.contract }
        return self
    }
}

enum WorkoutAction: String, Encodable {
    case gotIt = "equipment_claimed", taken = "equipment_taken", setDone = "set_completed"
    case accept = "alternative_accepted", decline = "alternative_declined"
    case skip = "skip_exercise", retry = "retry_deferred", end = "end_session"

    func allowed(in state: Snapshot) -> Bool {
        switch self {
        case .gotIt, .taken: return state.phase == .awaitingEquipment
        case .setDone: return state.phase == .exercising
        case .accept, .decline: return state.phase == .awaitingAlternative
        case .retry: return state.phase == .blocked
        case .skip: return !state.phase.finished && state.current != nil
        case .end: return !state.phase.finished
        }
    }
}

struct WorkoutEvent: Encodable {
    let eventId: String
    let expectedVersion: Int
    let source = "watch"
    let type: WorkoutAction
    let exerciseInstanceId: String?
    let setIndex: Int?
    let payload: [String: String] = [:]

    init(_ action: WorkoutAction, snapshot: Snapshot) {
        eventId = UUID().uuidString
        expectedVersion = snapshot.version
        type = action
        let global = action == .end || action == .retry
        exerciseInstanceId = global ? nil : snapshot.current?.instanceId
        setIndex = global ? nil : snapshot.setIndex
    }
    // These null targets are required by the event contract, including End/Retry.
    enum CodingKeys: String, CodingKey {
        case eventId, expectedVersion, source, type, exerciseInstanceId, setIndex, payload
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(eventId, forKey: .eventId)
        try c.encode(expectedVersion, forKey: .expectedVersion)
        try c.encode(source, forKey: .source)
        try c.encode(type, forKey: .type)
        try c.encode(exerciseInstanceId, forKey: .exerciseInstanceId)
        try c.encode(setIndex, forKey: .setIndex)
        try c.encode(payload, forKey: .payload)
    }
}

struct EventResult: Decodable { let snapshot: Snapshot; let replayed: Bool }
struct WorkoutSummary: Decodable {
    let sessionId: String
    let completedSets: Int
    let completedExercises: Int
    let partial: [ExerciseInstance]
    let skipped: [ExerciseInstance]
}
struct APIProblem: Decodable { let message: String?; let detail: String?; let snapshot: Snapshot? }
struct Pairing: Codable {
    let endpoint: String
    let sessionID: String
    let token: String
}

enum WatchError: LocalizedError {
    case contract, invalidPairing, keychain, rejected(Int, String, Snapshot?)
    var errorDescription: String? {
        switch self {
        case .contract: return "The backend returned an incompatible workout. Check the shared contract."
        case .invalidPairing: return "Enter the session ID and token from your phone. Use HTTPS, or localhost HTTP for the simulator."
        case .keychain: return "Could not save session access securely. Try joining again."
        case .rejected(_, let message, _): return message
        }
    }
}
