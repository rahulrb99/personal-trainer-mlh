import Foundation
import SwiftUI

@MainActor
final class WorkoutStore: ObservableObject {
    @Published private(set) var snapshot: Snapshot?
    @Published private(set) var summary: WorkoutSummary?
    @Published private(set) var connected = false
    @Published private(set) var busy = false
    @Published private(set) var joined = false
    @Published private(set) var uncertainEvent: WorkoutEvent?
    @Published var message: String?
    private var api: WorkoutAPI?
    private var polling: Task<Void, Never>?
    private var generation = UUID()
    private var active = false
    private var serverOffset: TimeInterval = 0
    private var restored = false

    var actionsEnabled: Bool { connected && !busy && uncertainEvent == nil }

    func activate() {
        active = true
        if !restored {
            restored = true
            do {
                if let pairing = try SessionVault.load() {
                    api = try WorkoutAPI(pairing)
                    joined = true
                }
            } catch { message = "Saved session access could not be loaded. Join again." }
        }
        startPolling()
    }
    func suspend() {
        active = false
        polling?.cancel()
        polling = nil
        connected = false
    }
    func join(endpoint: String, sessionID: String, token: String) async {
        guard !busy else { return }
        busy = true
        message = nil
        defer { busy = false }
        do {
            let pairing = Pairing(endpoint: endpoint.trimmingCharacters(in: .whitespacesAndNewlines),
                                  sessionID: sessionID.trimmingCharacters(in: .whitespacesAndNewlines),
                                  token: token.trimmingCharacters(in: .whitespacesAndNewlines))
            let candidate = try WorkoutAPI(pairing)
            let state = try await candidate.snapshot()
            try SessionVault.save(pairing)
            generation = UUID()
            api = candidate
            snapshot = nil
            summary = nil
            uncertainEvent = nil
            joined = true
            apply(state)
            connected = active
            startPolling()
        } catch { message = error.localizedDescription }
    }
    func leave() {
        guard !busy else { return }
        do { try SessionVault.clear() }
        catch { message = error.localizedDescription; return }
        suspend()
        generation = UUID()
        api = nil
        joined = false
        snapshot = nil
        summary = nil
        uncertainEvent = nil
        message = nil
    }
    private func startPolling() {
        polling?.cancel()
        guard active, let api else { return }
        let epoch = generation
        polling = Task { [weak self] in
            var delay: UInt64 = 1
            while !Task.isCancelled {
                do {
                    let state = try await api.snapshot()
                    guard !Task.isCancelled, let self, self.generation == epoch else { return }
                    self.apply(state)
                    self.connected = true
                    if self.message?.hasPrefix("Refresh failed.") == true { self.message = nil }
                    delay = 1
                    if state.phase.finished && self.summary == nil {
                        let result = try await api.summary()
                        guard !Task.isCancelled, self.generation == epoch else { return }
                        self.summary = result
                    }
                } catch {
                    guard !Task.isCancelled, let self, self.generation == epoch else { return }
                    self.connected = false
                    self.message = "Refresh failed. Check backend and session access. Reconnecting…"
                    delay = min(delay * 2, 8)
                }
                do { try await Task.sleep(nanoseconds: delay * 1_000_000_000) }
                catch { return }
            }
        }
    }
    func reconnect() { startPolling() }
    private func apply(_ state: Snapshot) {
        // Equal versions can refresh our server clock but never replace workout state.
        guard state.version >= (snapshot?.version ?? 0) else { return }
        serverOffset = state.serverTime.timeIntervalSinceNow
        if state.version > (snapshot?.version ?? 0) { snapshot = state }
    }
    func secondsRemaining(at now: Date) -> Int {
        guard let deadline = snapshot?.restDeadline else { return 0 }
        return max(0, Int(ceil(deadline.timeIntervalSince(now.addingTimeInterval(serverOffset)))))
    }
    func submit(_ action: WorkoutAction, expectedVersion: Int? = nil) async {
        guard actionsEnabled, let state = snapshot, action.allowed(in: state) else { return }
        if let expectedVersion, expectedVersion != state.version {
            message = "Workout changed. Review the current state before confirming again."
            return
        }
        await send(WorkoutEvent(action, snapshot: state))
    }
    func retryUncertain() async {
        guard !busy, let event = uncertainEvent else { return }
        // Repeat the exact original request. Never create or retarget an ambiguous action.
        await send(event)
    }
    private func send(_ event: WorkoutEvent) async {
        guard let api else { return }
        busy = true
        message = "Confirming…"
        let epoch = generation
        defer { busy = false }
        do {
            let state = try await api.event(event)
            guard epoch == generation else { return }
            apply(state)
            uncertainEvent = nil
            message = "Confirmed."
        } catch let error as WatchError {
            guard epoch == generation else { return }
            switch error {
            case .rejected(let status, let reason, let state) where status < 500:
                uncertainEvent = nil
                if let state, let valid = try? state.validated(for: api.pairing.sessionID) { apply(valid) }
                message = status == 409 ? "Workout changed. Action was not applied. Review and tap again." : reason
                if status == 401 { connected = false }
            default:
                uncertainEvent = event
                message = "Could not confirm the action. Retry the same request to check its result."
            }
        } catch {
            guard epoch == generation else { return }
            uncertainEvent = event
            connected = false
            message = "Connection interrupted. Retry the same request; it cannot count twice."
        }
    }
}
