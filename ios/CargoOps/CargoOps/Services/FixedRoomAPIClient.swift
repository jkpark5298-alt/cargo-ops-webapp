import Foundation

struct FixedRoomAPIClient {
    let baseURL: URL
    let session: URLSession

    init(
        baseURL: URL = URL(string: "https://cargo-ops-backend.onrender.com")!,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.session = session
    }

    func fetchFixedRoomData(
        room: FixedRoom
    ) async throws -> FixedRoom {
        let normalizedFlights = FlightCodeNormalizer.normalizeList(room.flights)
        let rows = try await fetchFlights(
            flights: normalizedFlights,
            start: room.start,
            end: room.end
        )

        return FixedRoom(
            id: room.id,
            roomName: room.roomName,
            flights: normalizedFlights,
            start: room.start,
            end: room.end,
            lastFetchedAt: Self.makeFetchedAtText(),
            rows: rows
        )
    }

    func fetchFlights(
        flights: [String],
        start: String,
        end: String
    ) async throws -> [FixedFlightRow] {
        let normalizedFlights = FlightCodeNormalizer.normalizeList(flights)

        guard !normalizedFlights.isEmpty else {
            throw FixedRoomAPIClientError.emptyFlights
        }

        let url = baseURL.appendingPathComponent("flights/")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = FlightsRequestDTO(
            flights: normalizedFlights,
            start: start,
            end: end
        )

        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)
        try Self.validateHTTP(response: response)

        let decoded = try Self.decode(FlightsResponseDTO.self, from: data)

        if decoded.success == false {
            throw FixedRoomAPIClientError.serverMessage(
                decoded.message ?? decoded.detail ?? "조회에 실패했습니다."
            )
        }

        let rows = (decoded.data ?? []).map { $0.toModel() }
        return rows
    }

    func fetchWidgetSummary(
        config: WidgetRoomConfig
    ) async throws -> FixedWidgetResponse {
        guard !config.flights.isEmpty else {
            throw FixedRoomAPIClientError.emptyFlights
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
            URLQueryItem(name: "refreshIntervalMinutes", value: "\(config.refreshIntervalMinutes)")
        ]

        guard let url = components?.url else {
            throw FixedRoomAPIClientError.invalidURL
        }

        let (data, response) = try await session.data(from: url)
        try Self.validateHTTP(response: response)

        let decoded = try Self.decode(FixedWidgetResponse.self, from: data)

        if decoded.success == false {
            throw FixedRoomAPIClientError.serverMessage("위젯 조회에 실패했습니다.")
        }

        return decoded
    }
}

extension FixedRoomAPIClient {
    static func makeFetchedAtText(date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.timeZone = TimeZone(identifier: "Asia/Seoul")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.string(from: date)
    }

    static func validateHTTP(response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw FixedRoomAPIClientError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw FixedRoomAPIClientError.httpStatus(httpResponse.statusCode)
        }
    }

    static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try JSONDecoder().decode(type, from: data)
        } catch {
            throw FixedRoomAPIClientError.decodingFailed(error.localizedDescription)
        }
    }
}

enum FixedRoomAPIClientError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpStatus(Int)
    case emptyFlights
    case serverMessage(String)
    case decodingFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "유효하지 않은 URL입니다."
        case .invalidResponse:
            return "서버 응답이 올바르지 않습니다."
        case .httpStatus(let code):
            return "서버 오류가 발생했습니다. (\(code))"
        case .emptyFlights:
            return "조회할 편명이 없습니다."
        case .serverMessage(let message):
            return message
        case .decodingFailed(let message):
            return "응답 해석에 실패했습니다. \(message)"
        }
    }
}

private struct FlightsRequestDTO: Encodable {
    let flights: [String]
    let start: String
    let end: String
}

private struct FlightsResponseDTO: Decodable {
    let success: Bool?
    let message: String?
    let detail: String?
    let data: [FlightRowDTO]?
}

private struct FlightRowDTO: Decodable {
    let flightId: String?
    let flightNo: String?
    let departureCode: String?
    let arrivalCode: String?
    let formattedScheduleTime: String?
    let formattedEstimatedTime: String?
    let gatenumber: String?
    let fid: String?

    let status: String?
    let remark: String?
    let delay: Bool?
    let canceled: Bool?
    let gateChanged: Bool?

    func toModel() -> FixedFlightRow {
        FixedFlightRow(
            flight: flightId ?? flightNo ?? "-",
            status: computedStatus,
            departureCode: departureCode ?? "-",
            arrivalCode: arrivalCode ?? "-",
            scheduleTime: formattedScheduleTime ?? "-",
            changedTime: formattedEstimatedTime ?? "-",
            gate: gatenumber ?? "-",
            registrationNo: fid ?? "-"
        )
    }

    private var computedStatus: String {
        let remarkStatus = "\(status ?? "") \(remark ?? "")"
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .uppercased()

        if canceled == true || remarkStatus.contains("CANCEL") {
            return "결항"
        }

        if gateChanged == true {
            return "게이트 변경"
        }

        if delay == true || remarkStatus.contains("DELAY") || remarkStatus.contains("지연") {
            if remarkStatus.contains("ARRIV") || remarkStatus.contains("도착") || status == "도착" {
                return "도착"
            }
            if remarkStatus.contains("DEPAR") || remarkStatus.contains("출발") || status == "출발" {
                return "출발"
            }
            return "지연"
        }

        if status == "출발"
            || remarkStatus.contains("DEPART")
            || remarkStatus.contains("DEP")
            || remarkStatus.contains("출발") {
            return "출발"
        }

        if status == "도착"
            || remarkStatus.contains("ARRIV")
            || remarkStatus.contains("ARR")
            || remarkStatus.contains("도착") {
            return "도착"
        }

        return "-"
    }
}
