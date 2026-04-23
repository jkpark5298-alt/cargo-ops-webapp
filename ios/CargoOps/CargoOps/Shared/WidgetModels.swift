import Foundation

struct FixedRoom: Codable, Hashable, Identifiable {
    let id: String
    var roomName: String
    var flights: [String]
    var start: String
    var end: String
    var lastFetchedAt: String
    var rows: [FixedFlightRow]

    init(
        id: String,
        roomName: String,
        flights: [String],
        start: String,
        end: String,
        lastFetchedAt: String = "",
        rows: [FixedFlightRow] = []
    ) {
        self.id = id
        self.roomName = roomName
        self.flights = flights
        self.start = start
        self.end = end
        self.lastFetchedAt = lastFetchedAt
        self.rows = rows
    }
}

struct FixedFlightRow: Codable, Hashable, Identifiable {
    var id: String {
        [
            flight,
            departureCode,
            arrivalCode,
            scheduleTime,
            changedTime,
            gate,
            registrationNo
        ].joined(separator: "|")
    }

    let flight: String
    let status: String
    let departureCode: String
    let arrivalCode: String
    let scheduleTime: String
    let changedTime: String
    let gate: String
    let registrationNo: String

    init(
        flight: String,
        status: String,
        departureCode: String,
        arrivalCode: String,
        scheduleTime: String,
        changedTime: String,
        gate: String,
        registrationNo: String
    ) {
        self.flight = flight
        self.status = status
        self.departureCode = departureCode
        self.arrivalCode = arrivalCode
        self.scheduleTime = scheduleTime
        self.changedTime = changedTime
        self.gate = gate
        self.registrationNo = registrationNo
    }
}

struct WidgetRoomConfig: Codable, Hashable {
    let roomId: String
    let roomName: String
    let flights: [String]
    let start: String
    let end: String
    let refreshIntervalMinutes: Int

    init(
        roomId: String,
        roomName: String,
        flights: [String],
        start: String,
        end: String,
        refreshIntervalMinutes: Int = 10
    ) {
        self.roomId = roomId
        self.roomName = roomName
        self.flights = flights
        self.start = start
        self.end = end
        self.refreshIntervalMinutes = refreshIntervalMinutes
    }
}

struct FixedWidgetItem: Codable, Hashable, Identifiable {
    var id: String {
        [
            flight,
            status,
            departureCode,
            arrivalCode,
            displayTime
        ].joined(separator: "|")
    }

    let flight: String
    let status: String
    let departureCode: String
    let arrivalCode: String
    let displayTime: String

    init(
        flight: String,
        status: String,
        departureCode: String,
        arrivalCode: String,
        displayTime: String
    ) {
        self.flight = flight
        self.status = status
        self.departureCode = departureCode
        self.arrivalCode = arrivalCode
        self.displayTime = displayTime
    }
}

struct FixedWidgetResponse: Codable, Hashable {
    let success: Bool
    let roomId: String
    let roomName: String
    let updatedAt: String
    let refreshIntervalMinutes: Int
    let items: [FixedWidgetItem]

    init(
        success: Bool,
        roomId: String,
        roomName: String,
        updatedAt: String,
        refreshIntervalMinutes: Int,
        items: [FixedWidgetItem]
    ) {
        self.success = success
        self.roomId = roomId
        self.roomName = roomName
        self.updatedAt = updatedAt
        self.refreshIntervalMinutes = refreshIntervalMinutes
        self.items = items
    }
}

enum FlightCodeNormalizer {
    static func normalize(_ raw: String) -> String {
        let trimmed = raw
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .uppercased()

        guard !trimmed.isEmpty else { return "" }

        if trimmed.range(of: #"^\d{3,4}$"#, options: .regularExpression) != nil {
            return "KJ\(trimmed)"
        }

        return trimmed
    }

    static func normalizeList(_ rawList: [String]) -> [String] {
        var seen = Set<String>()
        var result: [String] = []

        for item in rawList {
            let normalized = normalize(item)

            guard !normalized.isEmpty else { continue }
            guard !seen.contains(normalized) else { continue }

            seen.insert(normalized)
            result.append(normalized)
        }

        return result
    }
}

extension FixedRoom {
    var widgetConfig: WidgetRoomConfig {
        WidgetRoomConfig(
            roomId: id,
            roomName: roomName,
            flights: FlightCodeNormalizer.normalizeList(flights),
            start: start,
            end: end,
            refreshIntervalMinutes: 10
        )
    }
}

extension FixedFlightRow {
    var displayChangedTime: String {
        let trimmedChanged = changedTime.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedChanged.isEmpty {
            return trimmedChanged
        }
        return scheduleTime
    }
}

extension FixedWidgetResponse {
    static let placeholder = FixedWidgetResponse(
        success: true,
        roomId: "preview-room",
        roomName: "Monitor_A",
        updatedAt: "2026-04-22 10:30",
        refreshIntervalMinutes: 10,
        items: [
            FixedWidgetItem(
                flight: "KJ1234",
                status: "출발",
                departureCode: "ICN",
                arrivalCode: "NRT",
                displayTime: "15:20"
            ),
            FixedWidgetItem(
                flight: "KJ5678",
                status: "도착",
                departureCode: "HKG",
                arrivalCode: "ICN",
                displayTime: "16:05"
            ),
            FixedWidgetItem(
                flight: "KJ9012",
                status: "출발",
                departureCode: "ICN",
                arrivalCode: "PVG",
                displayTime: "16:40"
            )
        ]
    )
}
