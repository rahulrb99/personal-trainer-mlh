import SwiftUI

@main
struct SpotterWatchApp: App {
    @StateObject private var store = WorkoutStore()
    @Environment(\.scenePhase) private var scenePhase
    var body: some Scene {
        WindowGroup {
            WorkoutView()
                .environmentObject(store)
                .onAppear { store.activate() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { store.activate() } else { store.suspend() }
                }
        }
    }
}

struct WorkoutView: View {
    @EnvironmentObject private var store: WorkoutStore
    @State private var endpoint = "http://localhost:8000"
    @State private var sessionID = ""
    @State private var token = ""
    @State private var confirmingEnd = false
    @State private var confirmingLeave = false
    @State private var endVersion: Int?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if !store.joined { pairing }
                    else if let state = store.snapshot { workout(state) }
                    else { Text("Fetching your workout…"); ProgressView() }
                    if let message = store.message {
                        Text(message).font(.caption2).foregroundStyle(.secondary).accessibilityIdentifier("statusMessage")
                    }
                    if store.joined {
                        if store.uncertainEvent != nil {
                            Button("Retry same request") { Task { await store.retryUncertain() } }
                                .disabled(store.busy)
                        }
                        if !store.connected {
                            Button("Reconnect") { store.reconnect() }.disabled(store.busy)
                        }
                        Button("Leave session", role: .destructive) { confirmingLeave = true }
                            .font(.caption2).disabled(store.busy)
                    }
                }.padding(.horizontal, 4)
            }
            .navigationTitle("spotter.")
            .confirmationDialog("End this workout?", isPresented: $confirmingEnd, titleVisibility: .visible) {
                Button("End workout", role: .destructive) {
                    Task { await store.submit(.end, expectedVersion: endVersion) }
                }
                Button("Cancel", role: .cancel) { }
            } message: { Text("This ends the shared workout on your phone too.") }
            .confirmationDialog("Leave this watch session?", isPresented: $confirmingLeave, titleVisibility: .visible) {
                Button("Leave session", role: .destructive) { store.leave() }
                Button("Cancel", role: .cancel) { }
            } message: { Text("Removes saved access from this watch. The workout continues on your phone. Any unconfirmed action may already have been accepted.") }
        }.tint(Color(red: 0.35, green: 0.57, blue: 1))
    }

    private var pairing: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Join your workout").font(.headline)
            Text("On your phone, tap Pair watch controls. Enter that session access here.")
                .font(.caption2).foregroundStyle(.secondary)
            TextField("Backend URL", text: $endpoint).textInputAutocapitalization(.never).autocorrectionDisabled()
                .accessibilityIdentifier("backendURL")
            TextField("Session ID", text: $sessionID).textInputAutocapitalization(.never).autocorrectionDisabled()
                .accessibilityIdentifier("sessionID")
            SecureField("Session token", text: $token).textInputAutocapitalization(.never).autocorrectionDisabled()
                .accessibilityIdentifier("sessionToken")
            Button(store.busy ? "Joining…" : "Join session") {
                Task {
                    await store.join(endpoint: endpoint, sessionID: sessionID, token: token)
                    if store.joined { token = ""; sessionID = "" }
                }
            }.disabled(store.busy || token.isEmpty || sessionID.isEmpty)
            Text("Local development pairing. Voice stays on your phone.").font(.caption2).foregroundStyle(.secondary)
        }
    }

    @ViewBuilder private func workout(_ state: Snapshot) -> some View {
        Label(store.connected ? "Synced" : "Reconnecting", systemImage: store.connected ? "checkmark.circle.fill" : "wifi.slash")
            .font(.caption2).foregroundStyle(store.connected ? .green : .orange)
        if state.phase.finished {
            Text(state.phase == .completed ? "Workout complete" : "Workout ended").font(.headline)
            if let summary = store.summary {
                Text("\(summary.completedSets) sets completed")
                Text("\(summary.completedExercises) exercises completed")
                Text("\(summary.partial.count) partial · \(summary.skipped.count) skipped").font(.caption2)
            } else { Text("Loading summary…").font(.caption2) }
        } else {
            if let exercise = state.current {
                Text(exercise.name).font(.headline).accessibilityIdentifier("exerciseName")
                Text(exercise.location).font(.caption2).foregroundStyle(.secondary)
                Text("Set \(state.setIndex)/\(exercise.sets) · \(exercise.reps) reps").font(.subheadline)
            }
            switch state.phase {
            case .awaitingEquipment:
                Text("Have the equipment?").font(.caption2)
                action("Got it", .gotIt)
                action("Taken", .taken)
            case .exercising:
                action("Set done", .setDone)
            case .resting:
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    let remaining = store.secondsRemaining(at: context.date)
                    Text(remaining > 0 ? "Rest · \(remaining)s" : "Waiting for next set…")
                        .font(.title3).monospacedDigit()
                }
            case .awaitingAlternative:
                Text("Try \(state.pendingAlternative?.name ?? "the suggested alternative")?").font(.caption)
                action("Accept alternative", .accept)
                action("Keep my plan", .decline)
            case .blocked:
                Text("Remaining equipment is taken.").font(.headline)
                action("Retry equipment", .retry)
            case .completed, .ended: EmptyView()
            }
            Text(state.lastDecision).font(.caption2).foregroundStyle(.secondary)
            if state.demoMode { Text("Demo · 5-second rests").font(.caption2).foregroundStyle(.orange) }
            if state.current != nil { action("Skip exercise", .skip) }
            Button("End workout", role: .destructive) {
                endVersion = state.version
                confirmingEnd = true
            }.disabled(!store.actionsEnabled)
        }
    }
    private func action(_ title: String, _ action: WorkoutAction) -> some View {
        let version = store.snapshot?.version
        return Button(title) { Task { await store.submit(action, expectedVersion: version) } }
            .disabled(!store.actionsEnabled)
            .accessibilityIdentifier(action.rawValue)
    }
}
