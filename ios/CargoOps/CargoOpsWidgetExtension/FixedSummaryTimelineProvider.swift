import Foundation
import WidgetKit

struct FixedSummaryTimelineProvider: TimelineProvider {
    private let store = WidgetSharedStore()

    func placeholder(in context: Context) -> FixedSummaryEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (FixedSummaryEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }

        guard let config = store.loadCurrentWidgetRoom() else {
            completion(.empty)
            return
        }

        Task {
            let entry = await fetchEntry(config: config)
            completion(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FixedSummaryEntry>) -> Void) {
        guard let config = store.loadCurrentWidgetRoom() else {
            let entry = FixedSummaryEntry.empty
            let nextRefresh = Date().addingTimeInterval(
                TimeInterval(WidgetConstants.defaultRefreshIntervalMinutes * 60)
            )
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
            return
        }

        Task {
            let entry = await fetchEntry(config: config)
            let nextRefresh = Date().addingTimeInterval(
                TimeInterval(config.refreshIntervalMinutes * 60)
            )
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }
}

private extension FixedSummaryTimelineProvider {
    func fetchEntry(config: WidgetRoomConfig) async -> FixedSummaryEntry {
        do {
            let response = try await fetchWidgetSummary(config: config)

            return FixedSummaryEntry(
                date: Date(),
                roomId: response.roomId,
                roomName: response.roomName,
                updatedAt: response.updatedAt,
                items: Array(response.items.prefix(WidgetConstants.maxWidgetItems))
            )
        } catch {
            return FixedSummaryEntry(
                date: Date(),
                roomId: config.roomId,
                roomName: config.roomName,
                updatedAt: "조회 실패",
                items: []
            )
        }
    }

    func fetchWidgetSummary(config: WidgetRoomConfig) async throws -> FixedWidgetResponse {
        let url = try buildWidgetURL(config: config)
        let (data, response) = try await URLSession.shared.data(from: url)

        try validateHTTP(response: response)

        let decoded = try JSONDecoder().decode(FixedWidgetResponse.self, from: data)

        if decoded.success == false {
            throw FixedSummaryTimelineProviderError.serverMessage("위젯 조회에 실패했습니다.")
        }

        return decoded
    }

    func buildWidgetURL(config: WidgetRoomConfig) throws -> URL {
        let baseURLString = "https://cargo-ops-backend.onrender.com"
        guard let baseURL = URL(string: baseURLString) else {
            throw FixedSummaryTimelineProviderError.invalidURL
        }

        var components = URLComponents(
            url: baseURL.appendingPathComponent("widget/fixed/\(config.roomId)"),
            resolvingAgainstBaseURL: false
        )

        components?.queryItems = [
            URLQueryItem(name: "flights", value: config.flights.joined(separator: ",")),
            URLQueryItem(name: "start", value: config.start),
            URLQueryItem(name: "end", value: config.end),
            URLQueryItem(name: "roomName", value: config.roomName),
            URLQueryItem(
                name: "refreshIntervalMinutes",
                value: "\(config.refreshIntervalMinutes)"
            )
        ]

        guard let url = components?.url else {
            throw FixedSummaryTimelineProviderError.invalidURL
        }

        return url
    }

    func validateHTTP(response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw FixedSummaryTimelineProviderError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw FixedSummaryTimelineProviderError.httpStatus(httpResponse.statusCode)
        }
    }
}

private enum FixedSummaryTimelineProviderError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpStatus(Int)
    case serverMessage(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "유효하지 않은 URL입니다."
        case .invalidResponse:
            return "서버 응답이 올바르지 않습니다."
        case .httpStatus(let code):
            return "서버 오류가 발생했습니다. (\(code))"
        case .serverMessage(let message):
            return message
        }
    }
}
