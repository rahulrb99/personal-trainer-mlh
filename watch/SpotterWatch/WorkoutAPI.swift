import Foundation

// A misconfigured endpoint must not redirect a session credential elsewhere.
private final class NoRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

struct WorkoutAPI {
    let pairing: Pairing
    let baseURL: URL
    private let session: URLSession

    init(_ pairing: Pairing) throws {
        guard let url = URL(string: pairing.endpoint), let host = url.host,
              url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
              url.scheme == "https" || (url.scheme == "http" && ["localhost", "127.0.0.1", "::1"].contains(host)),
              UUID(uuidString: pairing.sessionID) != nil, !pairing.token.isEmpty,
              !pairing.token.contains(where: { $0.isWhitespace }) else { throw WatchError.invalidPairing }
        self.pairing = pairing
        baseURL = url
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 15
        config.urlCache = nil
        session = URLSession(configuration: config, delegate: NoRedirects(), delegateQueue: nil)
    }

    static func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { value in
            let text = try value.singleValueContainer().decode(String.self)
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: text) { return date }
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: text) else { throw WatchError.contract }
            return date
        }
        return decoder
    }

    func snapshot() async throws -> Snapshot {
        let value: Snapshot = try await request("")
        return try value.validated(for: pairing.sessionID)
    }
    func event(_ event: WorkoutEvent) async throws -> Snapshot {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let result: EventResult = try await request("events", body: encoder.encode(event))
        return try result.snapshot.validated(for: pairing.sessionID)
    }
    func summary() async throws -> WorkoutSummary {
        let result: WorkoutSummary = try await request("summary")
        guard result.sessionId == pairing.sessionID, result.completedSets >= 0, result.completedExercises >= 0 else {
            throw WatchError.contract
        }
        return result
    }
    private func request<T: Decodable>(_ suffix: String, body: Data? = nil) async throws -> T {
        var url = baseURL.appendingPathComponent("sessions").appendingPathComponent(pairing.sessionID)
        if !suffix.isEmpty { url.appendPathComponent(suffix) }
        var request = URLRequest(url: url)
        request.httpMethod = body == nil ? "GET" : "POST"
        request.httpBody = body
        request.setValue("Bearer \(pairing.token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw WatchError.contract }
        guard (200..<300).contains(http.statusCode) else {
            let problem = try? Self.decoder().decode(APIProblem.self, from: data)
            throw WatchError.rejected(http.statusCode,
                problem?.message ?? problem?.detail ?? "Request rejected (\(http.statusCode)). Refresh and try again.",
                problem?.snapshot)
        }
        do { return try Self.decoder().decode(T.self, from: data) }
        catch { throw WatchError.contract }
    }
}
